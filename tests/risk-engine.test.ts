/**
 * Risk Engine — Unit Tests
 * Tests the multi-factor risk scoring pipeline
 */

import { describe, it, expect } from "vitest";
import { RiskEngine } from "../lib/risk-engine/engine.js";
import type {
    ParsedIntent,
    SimulationResult,
    ConflictAnalysis,
} from "../lib/types.js";

// ─── Test Helpers ────────────────────────────────────────

function makeIntent(overrides: Partial<ParsedIntent> = {}): ParsedIntent {
    return {
        rawInput: "transfer 100 tokens to 0xBob",
        action: "transfer",
        amount: 100,
        target: "0xBob",
        sensitive: false,
        sensitivityReasons: [],
        confidence: 1.0,
        timestamp: Date.now(),
        ...overrides,
    };
}

function makeSimulation(
    overrides: Partial<SimulationResult> = {}
): SimulationResult {
    return {
        gasEstimate: 800,
        writeSetSize: 3,
        predictedStatus: "success",
        storageKeys: [
            "0x1::account::Account::0xSender",
            "0x1::coin::CoinStore::0xSender",
            "0x1::coin::CoinStore::0xBob",
        ],
        vmStatus: "Executed successfully",
        logs: [],
        ...overrides,
    };
}

function makeConflict(
    overrides: Partial<ConflictAnalysis> = {}
): ConflictAnalysis {
    return {
        conflictProbability: 0.1,
        parallelEfficiencyScore: 0.85,
        conflictingKeys: [],
        optimizationSuggestion: "Low conflict risk.",
        estimatedConcurrentTxns: 5,
        worstCaseLatencyMs: 1,
        ...overrides,
    };
}

// ─── Tests ───────────────────────────────────────────────

describe("RiskEngine", () => {
    const engine = new RiskEngine();

    describe("risk score calculation", () => {
        it("should return LOW risk for small safe transfer", () => {
            const result = engine.calculateRiskScore(
                makeIntent({ amount: 10, sensitive: false }),
                makeSimulation(),
                makeConflict({ conflictProbability: 0 })
            );
            expect(result.riskLevel).toBe("LOW");
            expect(result.riskScore).toBeLessThan(0.25);
            expect(result.requiresMultisig).toBe(false);
        });

        it("should return MEDIUM risk for large transfer", () => {
            const result = engine.calculateRiskScore(
                makeIntent({
                    amount: 5000,
                    sensitive: true,
                    sensitivityReasons: ["Large transfer: 5,000 tokens"],
                }),
                makeSimulation(),
                makeConflict()
            );
            expect(result.riskLevel).toBe("MEDIUM");
            expect(result.riskScore).toBeGreaterThanOrEqual(0.25);
            expect(result.riskScore).toBeLessThan(0.65);
        });

        it("should return HIGH risk with multisig for deploy", () => {
            const result = engine.calculateRiskScore(
                makeIntent({
                    action: "deploy",
                    amount: undefined,
                    sensitive: true,
                    sensitivityReasons: [
                        "Contract interaction: elevated execution risk",
                    ],
                }),
                makeSimulation({ gasEstimate: 12000 }),
                makeConflict()
            );
            expect(result.riskScore).toBeGreaterThanOrEqual(0.4);
            expect(result.factors.some((f) => f.name === "Contract Interaction")).toBe(true);
        });

        it("should escalate governance_propose to multisig", () => {
            const result = engine.calculateRiskScore(
                makeIntent({
                    action: "governance_propose",
                    sensitive: true,
                    confidence: 0.6,
                    sensitivityReasons: [
                        "Governance operation: requires community consensus",
                    ],
                }),
                makeSimulation({ gasEstimate: 8000 }),
                makeConflict({ conflictProbability: 0.90 })
            );
            expect(result.requiresMultisig).toBe(true);
            expect(result.riskScore).toBeGreaterThanOrEqual(0.65);
        });

        it("should score unknown actions as high risk", () => {
            const result = engine.calculateRiskScore(
                makeIntent({ action: "unknown", confidence: 0 }),
                makeSimulation(),
                makeConflict()
            );
            expect(result.riskScore).toBeGreaterThanOrEqual(0.5);
            expect(
                result.factors.some((f) => f.name === "Unknown Action")
            ).toBe(true);
        });
    });

    describe("risk factors", () => {
        it("should include Transfer Size factor for transfers", () => {
            const result = engine.calculateRiskScore(
                makeIntent({ amount: 5000 }),
                makeSimulation(),
                makeConflict()
            );
            expect(
                result.factors.some((f) => f.name === "Transfer Size")
            ).toBe(true);
        });

        it("should NOT include Transfer Size for non-transfers", () => {
            const result = engine.calculateRiskScore(
                makeIntent({ action: "stake", amount: 5000 }),
                makeSimulation(),
                makeConflict()
            );
            expect(
                result.factors.some((f) => f.name === "Transfer Size")
            ).toBe(false);
        });

        it("should include Storage Conflict Risk when conflicts exist", () => {
            const result = engine.calculateRiskScore(
                makeIntent(),
                makeSimulation(),
                makeConflict({ conflictProbability: 0.5 })
            );
            expect(
                result.factors.some(
                    (f) => f.name === "Storage Conflict Risk"
                )
            ).toBe(true);
        });

        it("should include AI Generation Uncertainty for all intents", () => {
            const result = engine.calculateRiskScore(
                makeIntent(),
                makeSimulation(),
                makeConflict()
            );
            expect(
                result.factors.some(
                    (f) => f.name === "AI Generation Uncertainty"
                )
            ).toBe(true);
        });

        it("should penalize low AI confidence", () => {
            const highConf = engine.calculateRiskScore(
                makeIntent({ confidence: 1.0 }),
                makeSimulation(),
                makeConflict()
            );
            const lowConf = engine.calculateRiskScore(
                makeIntent({ confidence: 0.5 }),
                makeSimulation(),
                makeConflict()
            );
            expect(lowConf.riskScore).toBeGreaterThan(highConf.riskScore);
        });

        it("should add High Gas Cost factor when gas exceeds threshold", () => {
            const result = engine.calculateRiskScore(
                makeIntent(),
                makeSimulation({ gasEstimate: 15000 }),
                makeConflict()
            );
            expect(
                result.factors.some((f) => f.name === "High Gas Cost")
            ).toBe(true);
        });
    });

    describe("recommendations", () => {
        it("should recommend APPROVE for low risk", () => {
            const result = engine.calculateRiskScore(
                makeIntent({ amount: 10, sensitive: false }),
                makeSimulation(),
                makeConflict({ conflictProbability: 0 })
            );
            expect(result.recommendation).toContain("APPROVE");
        });

        it("should recommend ESCALATE for high risk", () => {
            const result = engine.calculateRiskScore(
                makeIntent({
                    action: "governance_propose",
                    sensitive: true,
                    confidence: 0.6,
                    sensitivityReasons: ["Governance operation"],
                }),
                makeSimulation({ gasEstimate: 8000 }),
                makeConflict({ conflictProbability: 0.90 })
            );
            expect(result.recommendation).toContain("ESCALATE");
        });
    });

    describe("custom configuration", () => {
        it("should respect custom multisig threshold", () => {
            const strictEngine = new RiskEngine({
                multisigThreshold: 0.30,
            });
            const result = strictEngine.calculateRiskScore(
                makeIntent({
                    amount: 5000,
                    sensitive: true,
                    sensitivityReasons: ["Large transfer"],
                }),
                makeSimulation(),
                makeConflict()
            );
            expect(result.requiresMultisig).toBe(true);
        });
    });

    describe("batch scoring", () => {
        it("should score and sort batch by descending risk", () => {
            const results = engine.scoreBatch([
                {
                    intent: makeIntent({ amount: 10 }),
                    simulation: makeSimulation(),
                    conflict: makeConflict({ conflictProbability: 0 }),
                },
                {
                    intent: makeIntent({
                        action: "deploy",
                        sensitive: true,
                        sensitivityReasons: ["Deploy"],
                    }),
                    simulation: makeSimulation({ gasEstimate: 12000 }),
                    conflict: makeConflict(),
                },
            ]);
            expect(results).toHaveLength(2);
            expect(results[0]!.riskScore).toBeGreaterThanOrEqual(
                results[1]!.riskScore
            );
        });
    });
});
