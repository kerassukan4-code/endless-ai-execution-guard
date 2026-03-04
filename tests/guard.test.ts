/**
 * Execution Guard — Integration Tests
 * Tests the full pipeline from raw instruction to GuardResult
 */

import { describe, it, expect } from "vitest";
import { ExecutionGuard } from "../lib/guard.js";

describe("ExecutionGuard (integration)", () => {
    // Use synthetic fallback to avoid needing live RPC in CI
    const guard = new ExecutionGuard({
        rpc: { rpcUrl: "http://localhost:0" }, // unreachable → synthetic fallback
    });

    describe("evaluate()", () => {
        it("should APPROVE a small transfer", async () => {
            const result = await guard.evaluate(
                "transfer 10 tokens to 0xBob"
            );
            expect(result.decision).toBe("APPROVE");
            expect(result.intent.action).toBe("transfer");
            expect(result.intent.amount).toBe(10);
            expect(result.riskAssessment.riskLevel).toBe("LOW");
            expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
        });

        it("should APPROVE a medium-risk transfer with warning", async () => {
            const result = await guard.evaluate(
                "transfer 5000 tokens to 0xWhale"
            );
            expect(result.decision).toBe("APPROVE");
            expect(result.intent.sensitive).toBe(true);
            expect(result.riskAssessment.riskLevel).toBe("MEDIUM");
        });

        it("should ESCALATE governance proposal to multisig", async () => {
            const result = await guard.evaluate(
                "submit a proposal to change validator commission"
            );
            expect(result.decision).toBe("ESCALATE_MULTISIG");
            expect(result.multisigProposal).toBeDefined();
            expect(
                result.multisigProposal!.requiredApprovals
            ).toBeGreaterThanOrEqual(3);
            expect(result.multisigProposal!.status).toBe("PENDING");
        });

        it("should REJECT unknown actions", async () => {
            const result = await guard.evaluate("xyzzy foobar baz");
            expect(result.decision).toBe("REJECT");
            expect(result.intent.action).toBe("unknown");
            expect(result.warnings.length).toBeGreaterThan(0);
        });

        it("should include warnings for low confidence", async () => {
            const result = await guard.evaluate(
                "submit a proposal to update minimum stake"
            );
            expect(
                result.warnings.some((w) => w.includes("confidence"))
            ).toBe(true);
        });

        it("should include processing time", async () => {
            const result = await guard.evaluate("transfer 1 token to 0xA");
            expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
            expect(result.processingTimeMs).toBeLessThan(5000);
        });
    });

    describe("evaluateBatch()", () => {
        it("should evaluate multiple intents", async () => {
            const results = await guard.evaluateBatch([
                "transfer 10 tokens to 0xA",
                "stake 100 EDS to validator 0xB",
                "burn 50 tokens",
            ]);
            expect(results).toHaveLength(3);
            expect(results[0]!.intent.action).toBe("transfer");
            expect(results[1]!.intent.action).toBe("stake");
            expect(results[2]!.intent.action).toBe("burn");
        });
    });

    describe("healthCheck()", () => {
        it("should return rpcConnected false when RPC is unreachable", async () => {
            const health = await guard.healthCheck();
            expect(health.rpcConnected).toBe(false);
            expect(health.latencyMs).toBeGreaterThanOrEqual(0);
            expect(health.error).toBeDefined();
        });
    });

    describe("pipeline data flow", () => {
        it("should produce complete GuardResult structure", async () => {
            const result = await guard.evaluate(
                "transfer 100 tokens to 0xBob"
            );

            // Intent
            expect(result.intent).toBeDefined();
            expect(result.intent.rawInput).toBeTruthy();
            expect(result.intent.action).toBe("transfer");

            // Simulation
            expect(result.simulation).toBeDefined();
            expect(result.simulation.gasEstimate).toBeGreaterThan(0);
            expect(result.simulation.storageKeys.length).toBeGreaterThan(0);

            // Conflict
            expect(result.conflictAnalysis).toBeDefined();
            expect(
                result.conflictAnalysis.conflictProbability
            ).toBeGreaterThanOrEqual(0);

            // Risk
            expect(result.riskAssessment).toBeDefined();
            expect(result.riskAssessment.riskScore).toBeGreaterThanOrEqual(0);
            expect(result.riskAssessment.factors.length).toBeGreaterThan(0);

            // Decision
            expect(["APPROVE", "ESCALATE_MULTISIG", "REJECT"]).toContain(
                result.decision
            );
        });
    });
});
