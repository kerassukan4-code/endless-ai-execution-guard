/**
 * Endless RPC Adapter
 * Wraps the Endless Node REST API (https://rpc.endless.link/v1)
 * with typed interfaces, retry logic, and structured error handling.
 *
 * API Reference: https://rpc.endless.link/v1/spec
 */

import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";
import type {
    ChainInfo,
    AccountData,
    AccountResource,
    SimulationResult,
    RawTransaction,
    EndlessApiError,
} from "../types.js";
import { EndlessRpcError } from "../types.js";

// ─────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────

export interface RpcAdapterConfig {
    /** Base URL of the Endless RPC endpoint (default: https://rpc.endless.link/v1) */
    rpcUrl: string;
    /** Maximum number of retry attempts on transient failures */
    maxRetries: number;
    /** Base delay in ms between retries (exponential backoff) */
    retryDelayMs: number;
    /** HTTP request timeout in ms */
    timeoutMs: number;
    /** Optional API key for authenticated nodes */
    apiKey?: string;
}

const DEFAULT_CONFIG: RpcAdapterConfig = {
    rpcUrl: "https://rpc.endless.link/v1",
    maxRetries: 3,
    retryDelayMs: 500,
    timeoutMs: 15_000,
};

// ─────────────────────────────────────────────────────
// Endless RPC response shapes (from spec.yaml)
// ─────────────────────────────────────────────────────

interface LedgerInfo {
    chain_id: number;
    epoch: string;
    ledger_version: string;
    oldest_ledger_version: string;
    ledger_timestamp: string;
    node_role: string;
    oldest_block_height: string;
    block_height: string;
    git_hash?: string;
}

interface RawAccountData {
    sequence_number: string;
    authentication_key: string;
}

interface SimulateResponse {
    gas_used: string;
    success: boolean;
    vm_status: string;
    changes?: Array<{
        type: string;
        address: string;
        state_key_hash: string;
        data?: Record<string, unknown>;
    }>;
}

// ─────────────────────────────────────────────────────
// RPC Adapter Class
// ─────────────────────────────────────────────────────

export class EndlessRpcAdapter {
    private readonly http: AxiosInstance;
    private readonly config: RpcAdapterConfig;

    constructor(config: Partial<RpcAdapterConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };

        this.http = axios.create({
            baseURL: this.config.rpcUrl,
            timeout: this.config.timeoutMs,
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                ...(this.config.apiKey
                    ? { Authorization: `Bearer ${this.config.apiKey}` }
                    : {}),
            },
        });

        // Response interceptor for structured error mapping
        this.http.interceptors.response.use(
            (res) => res,
            (err) => {
                const status: number = err.response?.status ?? 0;
                const data: EndlessApiError | undefined = err.response?.data;
                const message =
                    data?.message ??
                    err.message ??
                    `Endless RPC request failed with status ${status}`;

                throw new EndlessRpcError(message, status, data);
            }
        );
    }

    // ─────────────────────────────────────────────
    // Private Helpers
    // ─────────────────────────────────────────────

    private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
        let lastError: unknown;
        for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
            try {
                return await fn();
            } catch (err) {
                lastError = err;
                // Do not retry on 4xx client errors (except 429 rate limit)
                if (err instanceof EndlessRpcError) {
                    const isRetryable =
                        err.statusCode === 429 ||
                        err.statusCode >= 500 ||
                        err.statusCode === 0;
                    if (!isRetryable) throw err;
                }
                if (attempt < this.config.maxRetries) {
                    const delay = this.config.retryDelayMs * Math.pow(2, attempt);
                    await sleep(delay);
                }
            }
        }
        throw lastError;
    }

    private async get<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
        return this.withRetry(async () => {
            const res = await this.http.get<T>(path, config);
            return res.data;
        });
    }

    private async post<T>(
        path: string,
        body: unknown,
        config?: AxiosRequestConfig
    ): Promise<T> {
        return this.withRetry(async () => {
            const res = await this.http.post<T>(path, body, config);
            return res.data;
        });
    }

    // ─────────────────────────────────────────────
    // Public API Methods
    // ─────────────────────────────────────────────

    /**
     * Fetch the current chain ledger info (chain ID, epoch, block height, etc.)
     * Endpoint: GET /v1/
     */
    async getChainSpec(): Promise<ChainInfo> {
        const raw = await this.get<LedgerInfo>("/");
        return {
            chainId: raw.chain_id,
            ledgerVersion: raw.ledger_version,
            ledgerTimestampUsec: raw.ledger_timestamp,
            epoch: raw.epoch,
            blockHeight: raw.block_height,
            nodeRole: raw.node_role,
            gitHash: raw.git_hash,
        };
    }

    /**
     * Fetch account data (sequence number, auth key)
     * Endpoint: GET /v1/accounts/{address}
     */
    async fetchAccount(address: string): Promise<AccountData> {
        const raw = await this.get<RawAccountData>(`/accounts/${address}`);
        return {
            sequenceNumber: raw.sequence_number,
            authenticationKey: raw.authentication_key,
        };
    }

    /**
     * Fetch all Move resources for an account
     * Endpoint: GET /v1/accounts/{address}/resources
     */
    async fetchAccountResources(address: string): Promise<AccountResource[]> {
        const raw = await this.get<Array<{ type: string; data: Record<string, unknown> }>>(
            `/accounts/${address}/resources`
        );
        return raw.map((r) => ({ type: r.type, data: r.data }));
    }

    /**
     * Estimate gas for a transaction payload
     * Endpoint: POST /v1/transactions/simulate
     * Uses a mock sender for estimation when no real signature is available.
     */
    async estimateGas(payload: TransactionPayload): Promise<number> {
        const body = buildSimulationBody(payload, true);
        try {
            const raw = await this.post<SimulateResponse[] | SimulateResponse>(
                "/transactions/simulate",
                body,
                { headers: { "x-aptos-client": "endless-guard/1.0.0" } }
            );
            const first = Array.isArray(raw) ? raw[0] : raw;
            return parseInt(first?.gas_used ?? "1000", 10);
        } catch {
            // Return a reasonable estimate if simulation fails (e.g., account not on-chain)
            return estimateGasByPayloadType(payload);
        }
    }

    /**
     * Simulate a transaction and return structured result
     * Endpoint: POST /v1/transactions/simulate
     */
    async simulateTransaction(payload: TransactionPayload): Promise<SimulationResult> {
        const body = buildSimulationBody(payload, false);
        try {
            const raw = await this.post<SimulateResponse[] | SimulateResponse>(
                "/transactions/simulate",
                body
            );
            const first = Array.isArray(raw) ? raw[0] : raw;
            if (!first) {
                throw new Error("Empty simulation response");
            }

            const storageKeys = extractStorageKeys(first.changes ?? []);
            return {
                gasEstimate: parseInt(first.gas_used, 10),
                writeSetSize: first.changes?.length ?? 0,
                predictedStatus: first.success ? "success" : "abort",
                storageKeys,
                vmStatus: first.vm_status,
                logs: [],
            };
        } catch (err) {
            if (err instanceof EndlessRpcError) throw err;
            // Fallback to synthetic simulation
            return syntheticSimulation(payload);
        }
    }

    /**
     * Fetch a specific account module ABI
     * Endpoint: GET /v1/accounts/{address}/module/{module_name}
     */
    async fetchModule(address: string, moduleName: string): Promise<unknown> {
        return this.get(`/accounts/${address}/module/${moduleName}`);
    }

    /**
     * Returns the configured RPC base URL
     */
    get baseUrl(): string {
        return this.config.rpcUrl;
    }
}

// ─────────────────────────────────────────────────────
// Local Types for RPC payload building
// ─────────────────────────────────────────────────────

interface TransactionPayload {
    type: string;
    function?: string;
    typeArguments: string[];
    arguments: unknown[];
}

// ─────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Build the JSON body for /transactions/simulate
 * Uses a zero-signature mock for gas estimation purposes.
 */
function buildSimulationBody(
    payload: TransactionPayload,
    skipCheckSeqNum: boolean
): Record<string, unknown> {
    return {
        sender: "0x0000000000000000000000000000000000000000000000000000000000000001",
        sequence_number: "0",
        max_gas_amount: "200000",
        gas_unit_price: "100",
        expiration_timestamp_secs: String(Math.floor(Date.now() / 1000) + 600),
        payload: {
            type: payload.type,
            ...(payload.function ? { function: payload.function } : {}),
            type_arguments: payload.typeArguments,
            arguments: payload.arguments,
        },
        signature: {
            type: "ed25519_signature",
            public_key:
                "0x0000000000000000000000000000000000000000000000000000000000000000",
            signature:
                "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
        },
        skip_check_seq_num: skipCheckSeqNum,
    };
}

/**
 * Extract storage key strings from simulation change-set
 */
function extractStorageKeys(
    changes: Array<{ type: string; address: string; state_key_hash: string }>
): string[] {
    return changes.map((c) => `${c.address}::${c.type}::${c.state_key_hash}`);
}

/**
 * Synthetic simulation fallback when the node is unavailable
 */
function syntheticSimulation(payload: TransactionPayload): SimulationResult {
    const gas = estimateGasByPayloadType(payload);
    const storageKeys = generateSyntheticStorageKeys(payload);

    return {
        gasEstimate: gas,
        writeSetSize: storageKeys.length,
        predictedStatus: "success",
        storageKeys,
        vmStatus: "Executed successfully (synthetic)",
        logs: ["[SYNTHETIC] Live node was unavailable; used offline estimation"],
    };
}

/**
 * Heuristic gas estimation based on action type
 */
function estimateGasByPayloadType(payload: TransactionPayload): number {
    const fn = payload.function ?? "";
    if (fn.includes("transfer") || fn.includes("coin")) return 800 + rand(400);
    if (fn.includes("stake") || fn.includes("delegate")) return 1_200 + rand(600);
    if (fn.includes("vote") || fn.includes("govern")) return 2_000 + rand(1_000);
    if (fn.includes("nft") || fn.includes("token")) return 3_000 + rand(2_000);
    if (fn.includes("deploy") || fn.includes("publish")) return 10_000 + rand(5_000);
    return 1_000 + rand(500);
}

/**
 * Generate representative synthetic storage key patterns
 */
function generateSyntheticStorageKeys(payload: TransactionPayload): string[] {
    const fn = payload.function ?? "unknown::transfer";
    const parts = fn.split("::");
    const module = parts[0] ?? "0x1";
    const func = parts[parts.length - 1] ?? "transfer";
    return [
        `${module}::CoinStore::balance`,
        `${module}::${func}::write_set`,
        `0x1::account::Account::sequence_number`,
    ];
}

function rand(max: number): number {
    return Math.floor(Math.random() * max);
}
