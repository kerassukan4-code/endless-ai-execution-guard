/**
 * Block-STM Conflict Estimator
 *
 * Endless uses Block-STM (Block Software Transactional Memory) for parallel
 * transaction execution. When two transactions in the same block write to the
 * same storage key, they cannot be parallelized — one must abort and re-execute
 * serially. This module quantifies the probability of such conflicts.
 *
 * Core insight: conflicts reduce parallel throughput because the Block-STM
 * optimistic execution model must detect and resolve write-set overlaps at
 * commit time. High conflict rates force sequential fallback, degrading
 * the parallelism efficiency that Block-STM is designed to maximize.
 *
 * Reference: Block-STM paper — parallel transaction execution via speculative
 * execution + conflict-driven abort cycles.
 */

import type { SimulationResult, ConflictAnalysis, StorageKey } from "../types.js";

// ─────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────

export interface ConflictEstimatorConfig {
    /**
     * Assumed average number of transactions in the same block
     * (used to model concurrency probability)
     */
    estimatedBlockTxnCount: number;
    /**
     * Bloom filter false-positive rate for key overlap detection
     * (models Block-STM optimistic concurrency control overhead)
     */
    bloomFalsePositiveRate: number;
}

const DEFAULT_CONFLICT_CONFIG: ConflictEstimatorConfig = {
    estimatedBlockTxnCount: 50,
    bloomFalsePositiveRate: 0.01,
};

// ─────────────────────────────────────────────────────
// High-contention key patterns
// These keys are written by many transactions simultaneously and are
// known hot-spots in Move-based parallel execution.
// ─────────────────────────────────────────────────────

const HOT_KEY_PATTERNS: RegExp[] = [
    /0x1::endless_governance::/i,   // governance global state — all voters write same resource
    /0x1::stake::StakePool::/i,     // stake pool resources shared across delegators
    /::DelegationPool::/i,          // delegation pool — aggregated write target
    /0x1::coin::CoinStore.*global/i, // global coin supply
    /::Collections::global/i,       // NFT collection — shared registry
    /::VotingRecord::global/i,      // voting record map
    /sequence_number/i,             // account sequence numbers (contended for parallel sends)
];

// ─────────────────────────────────────────────────────
// Conflict Estimator Class
// ─────────────────────────────────────────────────────

export class ConflictEstimator {
    private readonly config: ConflictEstimatorConfig;

    constructor(config: Partial<ConflictEstimatorConfig> = {}) {
        this.config = { ...DEFAULT_CONFLICT_CONFIG, ...config };
    }

    /**
     * Analyze a single transaction's write-set for Block-STM conflict probability.
     *
     * The conflict probability reflects the likelihood that at least one of this
     * transaction's storage keys overlaps with another concurrent transaction in
     * the same block, forcing a speculative execution abort.
     */
    analyze(simulation: SimulationResult): ConflictAnalysis {
        const { storageKeys } = simulation;

        const hotKeys = storageKeys.filter((k) =>
            HOT_KEY_PATTERNS.some((p) => p.test(k))
        );
        const hotKeyRatio = storageKeys.length > 0 ? hotKeys.length / storageKeys.length : 0;

        // ─── Conflict probability model ───────────────────
        // P(conflict) = 1 - (1 - p_key)^(N-1)
        // where p_key is the per-key contention probability
        // and N is the number of concurrent transactions.
        const N = this.config.estimatedBlockTxnCount;
        const avgKeyContention = this.estimateKeyContention(storageKeys, hotKeyRatio);
        const compoundedKeyConflict =
            1 - Math.pow(1 - avgKeyContention, storageKeys.length);
        const conflictProbability = Math.min(
            1,
            compoundedKeyConflict * (1 - Math.pow(1 - compoundedKeyConflict, N - 1))
        );

        // ─── Parallel efficiency score ─────────────────────
        // Models the fraction of transactions that complete in their first
        // speculative execution (no abort + re-execute required).
        const abortRate = conflictProbability;
        const parallelEfficiencyScore = parseFloat(
            Math.max(0, 1 - abortRate * 1.5).toFixed(3)
        );

        const conflictingKeys = hotKeys;
        const suggestion = this.buildOptimizationSuggestion(
            conflictProbability,
            hotKeys,
            storageKeys
        );

        // Estimated concurrent transactions that touch any of the same keys
        const estimatedConcurrentTxns = Math.ceil(
            conflictProbability * N
        );

        // In the worst case each conflict doubles latency (re-execute serially)
        const worstCaseLatencyMs = Math.ceil(
            simulation.gasEstimate * 0.001 * (1 + conflictProbability * 2)
        );

        return {
            conflictProbability: parseFloat(conflictProbability.toFixed(3)),
            parallelEfficiencyScore,
            conflictingKeys,
            optimizationSuggestion: suggestion,
            estimatedConcurrentTxns,
            worstCaseLatencyMs,
        };
    }

    /**
     * Analyze a batch of simulations and return pairwise write-set overlap analysis.
     * Useful for the Transaction Replay Analyzer to detect inter-transaction conflicts.
     */
    analyzeBatch(simulations: SimulationResult[]): {
        results: ConflictAnalysis[];
        overlapMatrix: number[][];
        overallConflictRate: number;
        overallParallelEfficiency: number;
    } {
        const results = simulations.map((s) => this.analyze(s));

        // Build pairwise overlap matrix
        const n = simulations.length;
        const overlapMatrix: number[][] = Array.from({ length: n }, () =>
            new Array(n).fill(0)
        );

        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const overlap = keySetOverlap(
                    simulations[i]!.storageKeys,
                    simulations[j]!.storageKeys
                );
                overlapMatrix[i]![j] = overlap;
                overlapMatrix[j]![i] = overlap;
            }
        }

        const overallConflictRate =
            results.reduce((sum, r) => sum + r.conflictProbability, 0) / Math.max(n, 1);
        const overallParallelEfficiency =
            results.reduce((sum, r) => sum + r.parallelEfficiencyScore, 0) / Math.max(n, 1);

        return {
            results,
            overlapMatrix,
            overallConflictRate: parseFloat(overallConflictRate.toFixed(3)),
            overallParallelEfficiency: parseFloat(overallParallelEfficiency.toFixed(3)),
        };
    }

    /**
     * Parse a storage key string into its structured components
     */
    parseStorageKey(key: string): StorageKey {
        const parts = key.split("::");
        return {
            address: parts[0] ?? "unknown",
            resourceType: parts.slice(0, 2).join("::"),
            fieldPath: parts.slice(2).join("::") || undefined,
        };
    }

    // ─────────────────────────────────────────────
    // Private Helpers
    // ─────────────────────────────────────────────

    private estimateKeyContention(
        keys: string[],
        hotKeyRatio: number
    ): number {
        // Base rate for any transaction key being contested in a busy block
        const baseRate = 0.05;
        // Hot keys are significantly more likely to conflict
        const hotBoost = hotKeyRatio * 0.4;
        // More keys = more surface area for overlap
        const keyCountFactor = Math.min(0.1, keys.length * 0.01);
        return Math.min(0.95, baseRate + hotBoost + keyCountFactor);
    }

    private buildOptimizationSuggestion(
        conflictProbability: number,
        hotKeys: string[],
        allKeys: string[]
    ): string {
        if (conflictProbability < 0.1) {
            return "Low conflict risk. Transaction is well-suited for Block-STM parallel execution.";
        }

        if (conflictProbability < 0.3) {
            return [
                "Moderate conflict risk.",
                hotKeys.length > 0
                    ? `${hotKeys.length} hot key(s) detected (${hotKeys[0] ?? ""}).`
                    : "",
                "Consider batching with transactions that access distinct storage partitions.",
            ]
                .filter(Boolean)
                .join(" ");
        }

        if (conflictProbability < 0.6) {
            const suggestion = allKeys.length > 3
                ? "Consider splitting this transaction into smaller scoped operations to reduce write-set size."
                : "Sequence this transaction into a dedicated low-conflict block slot.";
            return `High conflict risk (${hotKeys.length} hot key(s) detected). ${suggestion}`;
        }

        return [
            "CRITICAL conflict risk. This transaction writes heavily contested global state.",
            "Recommendation: use a time-delayed execution window, target off-peak block slots,",
            "or restructure to use per-account resource keys instead of global aggregators.",
        ].join(" ");
    }
}

// ─────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────

/**
 * Compute normalized key-set overlap ratio between two storage key arrays.
 * Returns a value in [0, 1] representing the Jaccard similarity.
 */
function keySetOverlap(a: string[], b: string[]): number {
    const setA = new Set(a);
    const setB = new Set(b);
    const intersection = [...setA].filter((k) => setB.has(k)).length;
    const union = new Set([...a, ...b]).size;
    if (union === 0) return 0;
    return parseFloat((intersection / union).toFixed(3));
}

// ─────────────────────────────────────────────────────
// Factory helper
// ─────────────────────────────────────────────────────

export function createConflictEstimator(
    config?: Partial<ConflictEstimatorConfig>
): ConflictEstimator {
    return new ConflictEstimator(config);
}
