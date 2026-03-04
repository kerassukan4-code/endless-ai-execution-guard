/**
 * endless-ai-execution-guard
 * Public library exports
 *
 * @example
 * ```typescript
 * import { createExecutionGuard } from 'endless-ai-execution-guard';
 *
 * const guard = createExecutionGuard();
 * const result = await guard.evaluate("transfer 5000 tokens to 0xBob");
 * console.log(result.decision); // "ESCALATE_MULTISIG"
 * ```
 */

// Core Pipeline
export { ExecutionGuard, createExecutionGuard } from "./guard.js";
export type { GuardConfig } from "./guard.js";

// Modules
export { EndlessRpcAdapter } from "./rpc/adapter.js";
export { IntentParser, createIntentParser } from "./intent-parser/parser.js";
export { SimulationEngine, createSimulationEngine } from "./simulation/engine.js";
export { ConflictEstimator, createConflictEstimator } from "./conflict-analysis/estimator.js";
export { RiskEngine, createRiskEngine } from "./risk-engine/engine.js";
export { MultisigGuardrail, createMultisigGuardrail } from "./multisig/guardrail.js";
export { ReplayAnalyzer, createReplayAnalyzer } from "./replay/analyzer.js";

// Types
export type {
    ActionType,
    ParsedIntent,
    SimulationResult,
    ConflictAnalysis,
    RiskAssessment,
    RiskFactor,
    RiskLevel,
    GuardResult,
    GuardDecision,
    MultisigProposal,
    MultisigProposalStatus,
    BatchTransaction,
    ReplayAnalysis,
    BenchmarkResult,
    ChainInfo,
    AccountData,
    AccountResource,
    EndlessApiError,
} from "./types.js";

export { EndlessRpcError } from "./types.js";
