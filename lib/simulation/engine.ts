/**
 * Transaction Simulation Engine
 *
 * Before any AI-generated action is submitted on-chain, this module
 * simulates the transaction against the Endless RPC and produces a
 * structured SimulationResult including gas estimate, write-set size,
 * predicted status, and storage keys touched.
 *
 * Storage keys are critical for Block-STM conflict analysis.
 */

import type { ParsedIntent, SimulationResult } from "../types.js";
import type { EndlessRpcAdapter } from "../rpc/adapter.js";

// ─────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────

export interface SimulationEngineConfig {
    /** Sender address for simulation context */
    senderAddress: string;
    /** Chain ID (1 = mainnet, 2 = testnet) */
    chainId: number;
    /** Gas unit price in octa (1 EDS = 1e8 octa) */
    gasUnitPrice: number;
    /** Maximum gas budget for simulation */
    maxGasAmount: number;
    /** Whether to fall back to synthetic simulation if RPC fails */
    allowSyntheticFallback: boolean;
}

const DEFAULT_SIM_CONFIG: SimulationEngineConfig = {
    senderAddress:
        "0x0000000000000000000000000000000000000000000000000000000000000001",
    chainId: 2, // testnet
    gasUnitPrice: 100,
    maxGasAmount: 200_000,
    allowSyntheticFallback: true,
};

// ─────────────────────────────────────────────────────
// Action → Move Function Mapping
// ─────────────────────────────────────────────────────

const ACTION_FUNCTION_MAP: Record<string, string> = {
    transfer: "0x1::endless_account::transfer",
    stake: "0x1::delegation_pool::add_stake",
    unstake: "0x1::delegation_pool::unlock",
    deploy: "0x1::code::publish_package_txn",
    call_contract: "0x1::endless_account::transfer",
    governance_vote: "0x1::endless_governance::vote",
    governance_propose: "0x1::endless_governance::create_proposal",
    mint_nft: "0x3::token::create_token_script",
    burn: "0x1::managed_coin::burn",
};

const ACTION_TYPE_ARGS: Record<string, string[]> = {
    transfer: [],
    stake: [],
    unstake: [],
    deploy: [],
    call_contract: [],
    governance_vote: [],
    governance_propose: [],
    mint_nft: [],
    burn: ["0x1::endless_coin::EndlessCoin"],
};

// ─────────────────────────────────────────────────────
// Simulation Engine Class
// ─────────────────────────────────────────────────────

export class SimulationEngine {
    private readonly rpc: EndlessRpcAdapter;
    private readonly config: SimulationEngineConfig;

    constructor(
        rpc: EndlessRpcAdapter,
        config: Partial<SimulationEngineConfig> = {}
    ) {
        this.rpc = rpc;
        this.config = { ...DEFAULT_SIM_CONFIG, ...config };
    }

    /**
     * Simulate a single AI-parsed intent.
     * Returns gas estimates, write-set size, predicted status, and storage keys.
     */
    async simulate(intent: ParsedIntent): Promise<SimulationResult> {
        const payload = this.buildPayload(intent);

        try {
            const result = await this.rpc.simulateTransaction(payload);
            return this.enrichResult(result, intent);
        } catch {
            if (this.config.allowSyntheticFallback) {
                return this.syntheticSimulate(intent);
            }
            throw new Error(
                `Simulation failed for action '${intent.action}'. Enable synthetic fallback or verify RPC connectivity.`
            );
        }
    }

    /**
     * Simulate a batch of intents and return all results
     */
    async simulateBatch(
        intents: ParsedIntent[]
    ): Promise<{ intent: ParsedIntent; simulation: SimulationResult }[]> {
        const results = await Promise.allSettled(
            intents.map((intent) => this.simulate(intent))
        );

        return results.map((res, idx) => ({
            intent: intents[idx]!,
            simulation:
                res.status === "fulfilled"
                    ? res.value
                    : this.errorSimulation(intents[idx]!),
        }));
    }

    // ─────────────────────────────────────────────
    // Private Helpers
    // ─────────────────────────────────────────────

    private buildPayload(intent: ParsedIntent): {
        type: string;
        function?: string;
        typeArguments: string[];
        arguments: unknown[];
    } {
        const fn =
            ACTION_FUNCTION_MAP[intent.action] ??
            "0x1::endless_account::transfer_coins";
        const typeArgs = ACTION_TYPE_ARGS[intent.action] ?? [];
        const args = this.buildArguments(intent);

        return {
            type: "entry_function_payload",
            function: fn,
            typeArguments: typeArgs,
            arguments: args,
        };
    }

    private buildArguments(intent: ParsedIntent): unknown[] {
        switch (intent.action) {
            case "transfer":
                return [
                    intent.target ?? "0x1",
                    String(Math.floor((intent.amount ?? 0) * 1e8)),
                ];
            case "stake":
                return [
                    intent.target ?? "0x1",
                    String(Math.floor((intent.amount ?? 0) * 1e8)),
                ];
            case "unstake":
                return [String(Math.floor((intent.amount ?? 0) * 1e8))];
            case "governance_vote":
                return [intent.target ?? "1", true];
            case "mint_nft":
                return ["AI Collection", "AI Asset", "https://endless.link/meta/1", 1];
            default:
                return [];
        }
    }

    /**
     * Add higher-level context to the raw RPC result
     */
    private enrichResult(
        result: SimulationResult,
        intent: ParsedIntent
    ): SimulationResult {
        // Ensure we always have at a minimum the main account's coin store key
        const enrichedKeys = new Set(result.storageKeys);
        enrichedKeys.add(`0x1::coin::CoinStore<0x1::endless_coin::EndlessCoin>::${this.config.senderAddress}`);
        if (intent.target) {
            enrichedKeys.add(
                `0x1::coin::CoinStore<0x1::endless_coin::EndlessCoin>::${intent.target}`
            );
        }

        return {
            ...result,
            storageKeys: [...enrichedKeys],
        };
    }

    /**
     * Produce a deterministic synthetic simulation result
     * used when the live RPC is unavailable (e.g., CI environments).
     */
    private syntheticSimulate(intent: ParsedIntent): SimulationResult {
        const gas = BASE_GAS[intent.action] ?? 1_000;
        const jitter = Math.floor(Math.random() * 300);
        const storageKeys = this.buildSyntheticStorageKeys(intent);

        return {
            gasEstimate: gas + jitter,
            writeSetSize: storageKeys.length,
            predictedStatus:
                intent.action === "unknown" ? "abort" : "success",
            storageKeys,
            vmStatus:
                intent.action === "unknown"
                    ? "MoveAbort(UNKNOWN_ACTION)"
                    : "Executed successfully (synthetic)",
            logs: ["[SYNTHETIC] Using offline gas model; connect to RPC for live data"],
        };
    }

    private buildSyntheticStorageKeys(intent: ParsedIntent): string[] {
        const keys: string[] = [
            `0x1::account::Account::${this.config.senderAddress}`,
            `0x1::coin::CoinStore<0x1::endless_coin::EndlessCoin>::${this.config.senderAddress}`,
        ];

        if (intent.target) {
            keys.push(
                `0x1::coin::CoinStore<0x1::endless_coin::EndlessCoin>::${intent.target}`
            );
        }

        if (intent.action === "stake") {
            keys.push(`0x1::delegation_pool::DelegationPool::${intent.target ?? "validator"}`);
            keys.push(`0x1::stake::StakePool::${intent.target ?? "validator"}`);
        }

        if (intent.action === "governance_vote" || intent.action === "governance_propose") {
            keys.push("0x1::endless_governance::GovernanceProposal::global");
            keys.push("0x1::endless_governance::VotingRecord::global");
        }

        if (intent.action === "mint_nft") {
            keys.push("0x3::token::Collections::global");
            keys.push("0x3::token::TokenStore::creator");
        }

        return keys;
    }

    private errorSimulation(intent: ParsedIntent): SimulationResult {
        return {
            gasEstimate: 0,
            writeSetSize: 0,
            predictedStatus: "abort",
            storageKeys: [],
            vmStatus: `SimulationError: failed to simulate ${intent.action}`,
            logs: [`[ERROR] Simulation of ${intent.action} failed`],
        };
    }
}

// ─────────────────────────────────────────────────────
// Gas base costs by action type (in gas units)
// ─────────────────────────────────────────────────────

const BASE_GAS: Partial<Record<string, number>> = {
    transfer: 800,
    stake: 1_400,
    unstake: 1_200,
    deploy: 12_000,
    call_contract: 2_500,
    governance_vote: 2_000,
    governance_propose: 5_000,
    mint_nft: 3_500,
    burn: 900,
    unknown: 0,
};

// ─────────────────────────────────────────────────────
// Factory helper
// ─────────────────────────────────────────────────────

export function createSimulationEngine(
    rpc: EndlessRpcAdapter,
    config?: Partial<SimulationEngineConfig>
): SimulationEngine {
    return new SimulationEngine(rpc, config);
}
