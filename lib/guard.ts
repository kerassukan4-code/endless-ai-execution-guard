/**
 * Endless AI Execution Guard — Core Pipeline
 *
 * Orchestrates the full AI transaction safety verification pipeline:
 *
 *   1. Parse AI intent (natural language → structured action)
 *   2. Simulate transaction (gas estimate, write-set, storage keys)
 *   3. Analyze Block-STM conflicts (contention probability)
 *   4. Calculate risk score (multi-factor assessment)
 *   5. Route decision:
 *      • LOW/MEDIUM risk  → APPROVE (single-signer)
 *      • HIGH risk        → ESCALATE_MULTISIG (threshold-based approval)
 *      • CRITICAL risk    → REJECT (block execution)
 *
 * This pipeline is the primary entry point for integrating the guard
 * into any AI execution runtime.
 */

import type {
    ParsedIntent,
    SimulationResult,
    ConflictAnalysis,
    RiskAssessment,
    GuardResult,
    GuardDecision,
    MultisigProposal,
} from "./types.js";

import { IntentParser } from "./intent-parser/parser.js";
import { SimulationEngine } from "./simulation/engine.js";
import { ConflictEstimator } from "./conflict-analysis/estimator.js";
import { RiskEngine } from "./risk-engine/engine.js";
import { MultisigGuardrail } from "./multisig/guardrail.js";
import { EndlessRpcAdapter } from "./rpc/adapter.js";

import type { IntentParserConfig } from "./intent-parser/parser.js";
import type { SimulationEngineConfig } from "./simulation/engine.js";
import type { ConflictEstimatorConfig } from "./conflict-analysis/estimator.js";
import type { RiskEngineConfig } from "./risk-engine/engine.js";
import type { MultisigGuardrailConfig } from "./multisig/guardrail.js";
import type { RpcAdapterConfig } from "./rpc/adapter.js";

// ─────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────

export interface GuardConfig {
    rpc?: Partial<RpcAdapterConfig>;
    intentParser?: Partial<IntentParserConfig>;
    simulation?: Partial<SimulationEngineConfig>;
    conflict?: Partial<ConflictEstimatorConfig>;
    risk?: Partial<RiskEngineConfig>;
    multisig?: Partial<MultisigGuardrailConfig>;
    /** Address that creates multisig proposals on escalation */
    guardAccountAddress?: string;
}

// ─────────────────────────────────────────────────────
// Guard Pipeline Class
// ─────────────────────────────────────────────────────

export class ExecutionGuard {
    public readonly rpc: EndlessRpcAdapter;
    public readonly intentParser: IntentParser;
    public readonly simulationEngine: SimulationEngine;
    public readonly conflictEstimator: ConflictEstimator;
    public readonly riskEngine: RiskEngine;
    public readonly multisigGuardrail: MultisigGuardrail;

    private readonly guardAccountAddress: string;

    constructor(config: GuardConfig = {}) {
        this.rpc = new EndlessRpcAdapter(config.rpc);
        this.intentParser = new IntentParser(config.intentParser);
        this.simulationEngine = new SimulationEngine(this.rpc, config.simulation);
        this.conflictEstimator = new ConflictEstimator(config.conflict);
        this.riskEngine = new RiskEngine(config.risk);
        this.multisigGuardrail = new MultisigGuardrail(config.multisig);
        this.guardAccountAddress =
            config.guardAccountAddress ??
            "0x0000000000000000000000000000000000000000000000000000000000000001";
    }

    // ─────────────────────────────────────────────
    // Primary Pipeline Entry Points
    // ─────────────────────────────────────────────

    /**
     * Full pipeline entry point.
     * Accepts natural language AI instruction and produces a GuardResult.
     */
    async evaluate(rawIntent: string): Promise<GuardResult> {
        const startTime = Date.now();
        const warnings: string[] = [];

        // Step 1 — Parse intent
        const intent = this.intentParser.parse(rawIntent);

        if (intent.action === "unknown") {
            warnings.push("Intent parser could not identify a recognized action.");
        }
        if (intent.confidence < 0.7) {
            warnings.push(`Low confidence parse (${(intent.confidence * 100).toFixed(0)}%) — verify AI instruction.`);
        }

        // Step 2 — Simulate transaction
        let simulation: SimulationResult;
        try {
            simulation = await this.simulationEngine.simulate(intent);
        } catch (err) {
            warnings.push(`Simulation failed: ${String(err)}`);
            simulation = this.zeroSimulation();
        }

        if (simulation.predictedStatus === "abort") {
            warnings.push(`Simulation predicts transaction abort: ${simulation.vmStatus}`);
        }

        // Step 3 — Conflict analysis
        const conflictAnalysis = this.conflictEstimator.analyze(simulation);

        if (conflictAnalysis.conflictProbability > 0.5) {
            warnings.push(
                `High Block-STM conflict probability (${(conflictAnalysis.conflictProbability * 100).toFixed(0)}%) — consider reordering batch.`
            );
        }

        // Step 4 — Risk assessment
        const riskAssessment = this.riskEngine.calculateRiskScore(
            intent,
            simulation,
            conflictAnalysis
        );

        // Step 5 — Routing decision
        const { decision, multisigProposal } = await this.route(
            intent,
            simulation,
            conflictAnalysis,
            riskAssessment
        );

        const processingTimeMs = Date.now() - startTime;

        return {
            decision,
            intent,
            simulation,
            conflictAnalysis,
            riskAssessment,
            multisigProposal,
            processingTimeMs,
            warnings,
        };
    }

    /**
     * Evaluate a pre-parsed intent (skip NL parsing step).
     */
    async evaluateIntent(intent: ParsedIntent): Promise<GuardResult> {
        return this.evaluate(intent.rawInput);
    }

    /**
     * Batch evaluate multiple AI instructions.
     * Returns results in original order.
     */
    async evaluateBatch(
        rawIntents: string[]
    ): Promise<GuardResult[]> {
        return Promise.all(rawIntents.map((i) => this.evaluate(i)));
    }

    /**
     * Probe RPC connectivity and return chain info.
     */
    async healthCheck(): Promise<{
        rpcConnected: boolean;
        chainId?: number;
        blockHeight?: string;
        latencyMs: number;
        error?: string;
    }> {
        const start = Date.now();
        try {
            const info = await this.rpc.getChainSpec();
            return {
                rpcConnected: true,
                chainId: info.chainId,
                blockHeight: info.blockHeight,
                latencyMs: Date.now() - start,
            };
        } catch (err) {
            return {
                rpcConnected: false,
                latencyMs: Date.now() - start,
                error: String(err),
            };
        }
    }

    // ─────────────────────────────────────────────
    // Private Routing Logic
    // ─────────────────────────────────────────────

    private async route(
        intent: ParsedIntent,
        simulation: SimulationResult,
        conflict: ConflictAnalysis,
        risk: RiskAssessment
    ): Promise<{ decision: GuardDecision; multisigProposal?: MultisigProposal }> {
        // Hard reject: unknown action or simulation abort
        if (
            intent.action === "unknown" ||
            (simulation.predictedStatus === "abort" && risk.riskScore >= 0.9)
        ) {
            return { decision: "REJECT" };
        }

        // Escalation: high risk requiring multisig
        if (risk.requiresMultisig) {
            const proposal = this.multisigGuardrail.createProposal(
                intent,
                simulation,
                risk,
                conflict,
                this.guardAccountAddress,
                risk.recommendation
            );
            return { decision: "ESCALATE_MULTISIG", multisigProposal: proposal };
        }

        // Approve: low / medium risk
        return { decision: "APPROVE" };
    }

    private zeroSimulation(): SimulationResult {
        return {
            gasEstimate: 0,
            writeSetSize: 0,
            predictedStatus: "abort",
            storageKeys: [],
            vmStatus: "SimulationUnavailable",
            logs: ["Simulation was unavailable — using zero values"],
        };
    }
}

// ─────────────────────────────────────────────────────
// Convenience factory
// ─────────────────────────────────────────────────────

export function createExecutionGuard(config?: GuardConfig): ExecutionGuard {
    return new ExecutionGuard(config);
}
