/**
 * Core type definitions for Endless AI Execution Guard
 * Shared interfaces used across all modules
 */

// ─────────────────────────────────────────────────────
// Chain & Account Types (aligned with Endless RPC spec)
// ─────────────────────────────────────────────────────

export interface ChainInfo {
    chainId: number;
    ledgerVersion: string;
    ledgerTimestampUsec: string;
    epoch: string;
    blockHeight: string;
    nodeRole: string;
    gitHash?: string;
}

export interface AccountData {
    sequenceNumber: string;
    authenticationKey: string;
}

export interface AccountResource {
    type: string;
    data: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────
// Transaction Types (aligned with Endless RPC spec)
// ─────────────────────────────────────────────────────

export type ActionType =
    | "transfer"
    | "stake"
    | "unstake"
    | "deploy"
    | "call_contract"
    | "governance_vote"
    | "governance_propose"
    | "mint_nft"
    | "burn"
    | "unknown";

export interface TransactionPayload {
    type: "entry_function_payload" | "script_payload" | "multisig_payload";
    function?: string;
    typeArguments: string[];
    arguments: unknown[];
}

export interface RawTransaction {
    sender: string;
    sequenceNumber: number;
    payload: TransactionPayload;
    maxGasAmount: number;
    gasUnitPrice: number;
    expirationTimestampSecs: number;
    chainId: number;
}

export interface SimulationResult {
    gasEstimate: number;
    writeSetSize: number;
    predictedStatus: "success" | "abort";
    storageKeys: string[];
    vmStatus: string;
    logs: string[];
}

// ─────────────────────────────────────────────────────
// AI Intent Types
// ─────────────────────────────────────────────────────

export interface ParsedIntent {
    rawInput: string;
    action: ActionType;
    amount?: number;
    target?: string;
    moduleAddress?: string;
    functionName?: string;
    args?: unknown[];
    sensitive: boolean;
    sensitivityReasons: string[];
    confidence: number;
    timestamp: number;
}

// ─────────────────────────────────────────────────────
// Risk Engine Types
// ─────────────────────────────────────────────────────

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface RiskAssessment {
    riskScore: number;         // 0.0 – 1.0
    riskLevel: RiskLevel;
    factors: RiskFactor[];
    recommendation: string;
    requiresMultisig: boolean;
    estimatedImpact: string;
}

export interface RiskFactor {
    name: string;
    weight: number;
    description: string;
}

// ─────────────────────────────────────────────────────
// Conflict Analysis Types
// ─────────────────────────────────────────────────────

export interface ConflictAnalysis {
    conflictProbability: number;         // 0.0 – 1.0
    parallelEfficiencyScore: number;     // 0.0 – 1.0
    conflictingKeys: string[];
    optimizationSuggestion: string;
    estimatedConcurrentTxns: number;
    worstCaseLatencyMs: number;
}

export interface StorageKey {
    address: string;
    resourceType: string;
    fieldPath?: string;
}

// ─────────────────────────────────────────────────────
// Multisig Types
// ─────────────────────────────────────────────────────

export type MultisigProposalStatus =
    | "PENDING"
    | "APPROVED"
    | "REJECTED"
    | "EXPIRED"
    | "EXECUTED";

export interface MultisigProposal {
    proposalId: string;
    intent: ParsedIntent;
    simulation: SimulationResult;
    riskAssessment: RiskAssessment;
    conflictAnalysis: ConflictAnalysis;
    requiredApprovals: number;
    currentApprovals: string[];
    status: MultisigProposalStatus;
    createdAt: number;
    expiresAt: number;
    metadata: {
        createdBy: string;
        reason: string;
    };
}

// ─────────────────────────────────────────────────────
// Replay / Batch Types
// ─────────────────────────────────────────────────────

export interface BatchTransaction {
    id: string;
    intent: ParsedIntent;
    simulation: SimulationResult;
    conflictAnalysis: ConflictAnalysis;
    riskAssessment: RiskAssessment;
    originalOrder: number;
}

export interface ReplayAnalysis {
    batchId: string;
    totalTransactions: number;
    baselineEfficiency: number;     // 0.0 – 1.0
    optimizedEfficiency: number;    // 0.0 – 1.0
    improvement: number;            // percentage
    reorderedBatch: BatchTransaction[];
    conflictGroups: string[][];
    estimatedTimeSavingMs: number;
}

// ─────────────────────────────────────────────────────
// Benchmark Types
// ─────────────────────────────────────────────────────

export interface BenchmarkResult {
    totalTransactions: number;
    averageGas: number;
    conflictRate: number;
    parallelEfficiency: number;
    multisigEscalationRate: number;
    averageRiskScore: number;
    successRate: number;
    executionTimeMs: number;
    highRiskCount: number;
    lowRiskCount: number;
    scenarios: BenchmarkScenario[];
}

export interface BenchmarkScenario {
    name: string;
    transactionCount: number;
    averageGas: number;
    conflictRate: number;
    parallelEfficiency: number;
    multisigEscalationRate: number;
}

// ─────────────────────────────────────────────────────
// Guard Pipeline Types (full execution pipeline)
// ─────────────────────────────────────────────────────

export type GuardDecision =
    | "APPROVE"
    | "ESCALATE_MULTISIG"
    | "REJECT"
    | "SIMULATE_ONLY";

export interface GuardResult {
    decision: GuardDecision;
    intent: ParsedIntent;
    simulation: SimulationResult;
    conflictAnalysis: ConflictAnalysis;
    riskAssessment: RiskAssessment;
    multisigProposal?: MultisigProposal;
    processingTimeMs: number;
    warnings: string[];
}

// ─────────────────────────────────────────────────────
// RPC Error Types
// ─────────────────────────────────────────────────────

export interface EndlessApiError {
    message: string;
    error_code: string;
    vm_error_code?: number;
}

export class EndlessRpcError extends Error {
    constructor(
        message: string,
        public readonly statusCode: number,
        public readonly endlessError?: EndlessApiError
    ) {
        super(message);
        this.name = "EndlessRpcError";
    }
}
