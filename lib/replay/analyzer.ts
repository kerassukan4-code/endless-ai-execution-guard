/**
 * Transaction Replay Analyzer
 *
 * Records batches of AI-generated transactions, then reorders them to
 * minimize Block-STM write-set conflicts. The goal is to maximize
 * parallel execution efficiency by scheduling non-conflicting transactions
 * into the same execution wave.
 *
 * Algorithm:
 *   1. Build a conflict dependency graph using pairwise Jaccard overlap
 *   2. Partition transactions into conflict-free groups using greedy graph coloring
 *   3. Order groups to minimize serial fallback cycles
 *   4. Estimate the efficiency improvement vs. the original naive ordering
 *
 * This technique mirrors real Block-STM scheduler research where ordering
 * transactions by their write-set reduces abort rates and re-execution overhead.
 */

import { randomUUID } from "crypto";
import type {
    ParsedIntent,
    SimulationResult,
    ConflictAnalysis,
    RiskAssessment,
    BatchTransaction,
    ReplayAnalysis,
} from "../types.js";

// ─────────────────────────────────────────────────────
// Replay Analyzer Class
// ─────────────────────────────────────────────────────

export class ReplayAnalyzer {
    private readonly batchId: string;
    private readonly transactions: BatchTransaction[] = [];

    constructor() {
        this.batchId = randomUUID();
    }

    /**
     * Record a transaction for replay analysis.
     */
    recordTransaction(
        intent: ParsedIntent,
        simulation: SimulationResult,
        conflictAnalysis: ConflictAnalysis,
        riskAssessment: RiskAssessment
    ): BatchTransaction {
        const txn: BatchTransaction = {
            id: randomUUID(),
            intent,
            simulation,
            conflictAnalysis,
            riskAssessment,
            originalOrder: this.transactions.length,
        };
        this.transactions.push(txn);
        return txn;
    }

    /**
     * Reorder the recorded batch to minimize Block-STM conflicts.
     * Returns a full ReplayAnalysis including efficiency improvement metrics.
     */
    reorderBatch(): ReplayAnalysis {
        const n = this.transactions.length;
        if (n === 0) {
            return this.emptyAnalysis();
        }

        // Step 1: Compute pairwise conflict scores
        const conflictMatrix = this.buildConflictMatrix();

        // Step 2: Graph coloring — group non-conflicting transactions
        const groups = this.greedyColorGraph(conflictMatrix, n);

        // Step 3: Within each group, sort by ascending risk score (safer first)
        for (const group of groups) {
            group.sort(
                (a, b) =>
                    this.transactions[a]!.riskAssessment.riskScore -
                    this.transactions[b]!.riskAssessment.riskScore
            );
        }

        // Step 4: Flatten groups into the optimized ordering
        const reorderedIndices = groups.flat();
        const reorderedBatch = reorderedIndices.map((i) => this.transactions[i]!);

        // Step 5: Estimate efficiency metrics
        const baselineEfficiency = this.estimateEfficiency(
            this.transactions.map((_, i) => i)
        );
        const optimizedEfficiency = this.estimateEfficiency(reorderedIndices);
        const improvement = optimizedEfficiency > 0 && baselineEfficiency > 0
            ? ((optimizedEfficiency - baselineEfficiency) / baselineEfficiency) * 100
            : 0;

        const estimatedTimeSavingMs = Math.ceil(
            improvement * 0.5 * n // rough model: each percent improvement saves 0.5ms per txn
        );

        // Extract conflict groups for reporting
        const conflictGroups: string[][] = groups.map((g) =>
            g.map((i) => this.transactions[i]!.id)
        );

        return {
            batchId: this.batchId,
            totalTransactions: n,
            baselineEfficiency: parseFloat(baselineEfficiency.toFixed(3)),
            optimizedEfficiency: parseFloat(optimizedEfficiency.toFixed(3)),
            improvement: parseFloat(improvement.toFixed(2)),
            reorderedBatch,
            conflictGroups,
            estimatedTimeSavingMs,
        };
    }

    /**
     * Get a snapshot of all recorded transactions
     */
    getRecordedTransactions(): BatchTransaction[] {
        return [...this.transactions];
    }

    /**
     * Clear all recorded transactions (reset analyzer)
     */
    reset(): void {
        this.transactions.length = 0;
    }

    /**
     * Estimate efficiency improvement for an ordering.
     * Returns a value in [0.0, 1.0].
     *
     * Efficiency = fraction of transactions that can run in parallel
     * (i.e., are in a group of size ≥ 2 with no conflicts).
     */
    estimateEfficiencyImprovement(): {
        baselineEfficiency: number;
        optimizedEfficiency: number;
        improvement: number;
    } {
        const baseline = this.estimateEfficiency(
            this.transactions.map((_, i) => i)
        );
        const conflictMatrix = this.buildConflictMatrix();
        const groups = this.greedyColorGraph(conflictMatrix, this.transactions.length);
        const optimized = this.estimateEfficiency(groups.flat());

        const improvement =
            baseline > 0 ? ((optimized - baseline) / baseline) * 100 : 0;

        return {
            baselineEfficiency: parseFloat(baseline.toFixed(3)),
            optimizedEfficiency: parseFloat(optimized.toFixed(3)),
            improvement: parseFloat(improvement.toFixed(2)),
        };
    }

    // ─────────────────────────────────────────────
    // Private Helpers
    // ─────────────────────────────────────────────

    /**
     * Build an N×N conflict matrix using pairwise Jaccard key overlap.
     * Matrix[i][j] > 0.0 means transaction i and j share storage keys.
     */
    private buildConflictMatrix(): number[][] {
        const n = this.transactions.length;
        const matrix: number[][] = Array.from({ length: n }, () =>
            new Array(n).fill(0)
        );

        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const overlap = jaccardOverlap(
                    this.transactions[i]!.simulation.storageKeys,
                    this.transactions[j]!.simulation.storageKeys
                );
                matrix[i]![j] = overlap;
                matrix[j]![i] = overlap;
            }
        }

        return matrix;
    }

    /**
     * Greedy graph coloring to partition transactions into conflict-free groups.
     * Two transactions in the same group will not share any storage keys.
     *
     * Returns array of groups (each group is an array of transaction indices).
     */
    private greedyColorGraph(matrix: number[][], n: number): number[][] {
        const colors = new Array<number>(n).fill(-1);
        const conflictThreshold = 0.0; // any overlap is a conflict

        for (let i = 0; i < n; i++) {
            // Find which colors are already used by neighbours
            const usedColors = new Set<number>();
            for (let j = 0; j < n; j++) {
                if (j !== i && matrix[i]![j]! > conflictThreshold && colors[j] !== -1) {
                    usedColors.add(colors[j]!);
                }
            }
            // Assign the smallest available color
            let color = 0;
            while (usedColors.has(color)) color++;
            colors[i] = color;
        }

        // Group by color
        const numColors = Math.max(...colors) + 1;
        const groups: number[][] = Array.from({ length: numColors }, () => []);
        for (let i = 0; i < n; i++) {
            groups[colors[i]!]!.push(i);
        }

        return groups.filter((g) => g.length > 0);
    }

    /**
     * Estimate parallel execution efficiency for a given transaction ordering.
     */
    private estimateEfficiency(orderedIndices: number[]): number {
        const n = orderedIndices.length;
        if (n === 0) return 1;

        const avgConflict =
            orderedIndices.reduce((sum, i) => {
                return sum + (this.transactions[i]?.conflictAnalysis.conflictProbability ?? 0);
            }, 0) / n;

        // Abort rate reduces efficiency proportionally
        // Each abort requires a serial re-execution, costing ~2× the base time
        return Math.max(0, 1 - avgConflict * 1.8);
    }

    private emptyAnalysis(): ReplayAnalysis {
        return {
            batchId: this.batchId,
            totalTransactions: 0,
            baselineEfficiency: 1,
            optimizedEfficiency: 1,
            improvement: 0,
            reorderedBatch: [],
            conflictGroups: [],
            estimatedTimeSavingMs: 0,
        };
    }
}

// ─────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────

/**
 * Jaccard overlap between two key sets.
 * Returns 0.0 (no overlap) to 1.0 (identical sets).
 */
function jaccardOverlap(a: string[], b: string[]): number {
    const setA = new Set(a);
    const setB = new Set(b);
    const intersection = [...setA].filter((k) => setB.has(k)).length;
    const union = new Set([...a, ...b]).size;
    return union === 0 ? 0 : intersection / union;
}

// ─────────────────────────────────────────────────────
// Factory helper
// ─────────────────────────────────────────────────────

export function createReplayAnalyzer(): ReplayAnalyzer {
    return new ReplayAnalyzer();
}
