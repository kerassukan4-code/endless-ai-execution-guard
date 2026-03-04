/**
 * Conflict Estimator — Unit Tests
 * Tests the Block-STM conflict probability model
 */

import { describe, it, expect } from "vitest";
import { ConflictEstimator } from "../lib/conflict-analysis/estimator.js";
import type { SimulationResult } from "../lib/types.js";

// ─── Test Helpers ────────────────────────────────────────

function makeSim(overrides: Partial<SimulationResult> = {}): SimulationResult {
    return {
        gasEstimate: 800,
        writeSetSize: 3,
        predictedStatus: "success",
        storageKeys: [
            "0x1::account::Account::0xSender",
            "0x1::coin::CoinStore<0x1::endless_coin::EndlessCoin>::0xSender",
            "0x1::coin::CoinStore<0x1::endless_coin::EndlessCoin>::0xBob",
        ],
        vmStatus: "Executed successfully",
        logs: [],
        ...overrides,
    };
}

// ─── Tests ───────────────────────────────────────────────

describe("ConflictEstimator", () => {
    const estimator = new ConflictEstimator();

    describe("single transaction analysis", () => {
        it("should return conflict probability between 0 and 1", () => {
            const result = estimator.analyze(makeSim());
            expect(result.conflictProbability).toBeGreaterThanOrEqual(0);
            expect(result.conflictProbability).toBeLessThanOrEqual(1);
        });

        it("should return parallel efficiency between 0 and 1", () => {
            const result = estimator.analyze(makeSim());
            expect(result.parallelEfficiencyScore).toBeGreaterThanOrEqual(0);
            expect(result.parallelEfficiencyScore).toBeLessThanOrEqual(1);
        });

        it("should provide optimization suggestion", () => {
            const result = estimator.analyze(makeSim());
            expect(result.optimizationSuggestion).toBeTruthy();
            expect(typeof result.optimizationSuggestion).toBe("string");
        });

        it("should estimate concurrent transactions", () => {
            const result = estimator.analyze(makeSim());
            expect(result.estimatedConcurrentTxns).toBeGreaterThanOrEqual(0);
        });

        it("should estimate worst-case latency", () => {
            const result = estimator.analyze(makeSim());
            expect(result.worstCaseLatencyMs).toBeGreaterThanOrEqual(0);
        });
    });

    describe("hot key detection", () => {
        it("should detect governance hot keys", () => {
            const sim = makeSim({
                storageKeys: [
                    "0x1::endless_governance::GovernanceProposal::global",
                    "0x1::endless_governance::VotingRecord::global",
                    "0x1::account::Account::0xSender",
                ],
            });
            const result = estimator.analyze(sim);
            expect(result.conflictingKeys.length).toBeGreaterThan(0);
            expect(result.conflictProbability).toBeGreaterThan(0.3);
        });

        it("should detect stake pool hot keys", () => {
            const sim = makeSim({
                storageKeys: [
                    "0x1::stake::StakePool::0xValidator",
                    "0x1::account::Account::0xSender",
                ],
            });
            const result = estimator.analyze(sim);
            expect(result.conflictingKeys.length).toBeGreaterThan(0);
        });

        it("should detect delegation pool hot keys", () => {
            const sim = makeSim({
                storageKeys: [
                    "0x1::delegation_pool::DelegationPool::0xPool",
                    "0x1::account::Account::0xSender",
                ],
            });
            const result = estimator.analyze(sim);
            expect(result.conflictingKeys.length).toBeGreaterThan(0);
        });

        it("should have higher conflict for hot key transactions", () => {
            const coldSim = makeSim({
                storageKeys: [
                    "0x1::account::Account::0xSender",
                    "0x1::coin::CoinStore::0xBob",
                ],
            });
            const hotSim = makeSim({
                storageKeys: [
                    "0x1::endless_governance::GovernanceProposal::global",
                    "0x1::endless_governance::VotingRecord::global",
                ],
            });
            const coldResult = estimator.analyze(coldSim);
            const hotResult = estimator.analyze(hotSim);
            expect(hotResult.conflictProbability).toBeGreaterThan(
                coldResult.conflictProbability
            );
        });
    });

    describe("empty and edge cases", () => {
        it("should handle empty storage keys", () => {
            const result = estimator.analyze(
                makeSim({ storageKeys: [] })
            );
            expect(result.conflictProbability).toBe(0);
            expect(result.parallelEfficiencyScore).toBe(1);
        });

        it("should handle single storage key", () => {
            const result = estimator.analyze(
                makeSim({
                    storageKeys: ["0x1::account::Account::0xSender"],
                })
            );
            expect(result.conflictProbability).toBeGreaterThanOrEqual(0);
        });
    });

    describe("batch analysis", () => {
        it("should analyze a batch and return overlap matrix", () => {
            const simA = makeSim({
                storageKeys: [
                    "0x1::account::Account::0xA",
                    "0x1::coin::CoinStore::0xA",
                ],
            });
            const simB = makeSim({
                storageKeys: [
                    "0x1::account::Account::0xB",
                    "0x1::coin::CoinStore::0xB",
                ],
            });
            const batch = estimator.analyzeBatch([simA, simB]);
            expect(batch.results).toHaveLength(2);
            expect(batch.overlapMatrix).toHaveLength(2);
            expect(batch.overallConflictRate).toBeGreaterThanOrEqual(0);
            expect(batch.overallParallelEfficiency).toBeGreaterThanOrEqual(0);
        });

        it("should detect overlap between conflicting transactions", () => {
            const sharedKey = "0x1::account::Account::0xShared";
            const simA = makeSim({ storageKeys: [sharedKey, "0x1::unique::A"] });
            const simB = makeSim({ storageKeys: [sharedKey, "0x1::unique::B"] });
            const batch = estimator.analyzeBatch([simA, simB]);
            // Overlap matrix entry should be > 0 for overlapping txns
            expect(batch.overlapMatrix[0]![1]!).toBeGreaterThan(0);
        });

        it("should show zero overlap for non-conflicting transactions", () => {
            const simA = makeSim({ storageKeys: ["0x1::a::A"] });
            const simB = makeSim({ storageKeys: ["0x1::b::B"] });
            const batch = estimator.analyzeBatch([simA, simB]);
            expect(batch.overlapMatrix[0]![1]!).toBe(0);
        });
    });

    describe("storage key parsing", () => {
        it("should parse a storage key into components", () => {
            const parsed = estimator.parseStorageKey(
                "0x1::coin::CoinStore::0xSender"
            );
            expect(parsed.address).toBe("0x1");
            expect(parsed.resourceType).toBe("0x1::coin");
            expect(parsed.fieldPath).toBe("CoinStore::0xSender");
        });
    });

    describe("custom configuration", () => {
        it("should use custom block txn count", () => {
            const smallBlock = new ConflictEstimator({
                estimatedBlockTxnCount: 5,
            });
            const largeBlock = new ConflictEstimator({
                estimatedBlockTxnCount: 200,
            });
            const sim = makeSim();
            const smallResult = smallBlock.analyze(sim);
            const largeResult = largeBlock.analyze(sim);
            // More transactions in block = higher conflict probability
            expect(largeResult.conflictProbability).toBeGreaterThanOrEqual(
                smallResult.conflictProbability
            );
        });
    });
});
