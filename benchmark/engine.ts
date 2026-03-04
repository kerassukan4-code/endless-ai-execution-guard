/**
 * Benchmark Engine — Endless AI Execution Guard
 *
 * Generates a realistic corpus of AI-agent-generated blockchain transactions,
 * runs them through the full Guard pipeline, and produces a structured
 * benchmark report including Block-STM efficiency metrics.
 *
 * Scenarios:
 *   1. Low-friction transfers        (high-volume, low-risk)
 *   2. High-value transfers          (low-volume, high-risk, multisig)
 *   3. Contract interactions         (medium-volume, medium-risk)
 *   4. Governance operations         (low-volume, very high-risk)
 *   5. Mixed AI batch               (realistic mixed load)
 */

import type {
    BenchmarkResult,
    BenchmarkScenario,
} from "../lib/types.js";
import { ExecutionGuard } from "../lib/guard.js";

// ─────────────────────────────────────────────────────
// Benchmark Corpus
// ─────────────────────────────────────────────────────

const SCENARIOS: Array<{
    name: string;
    instructions: string[];
}> = [
        {
            name: "Low-Value Transfers",
            instructions: [
                "transfer 10 tokens to 0xAlice",
                "send 5 EDS to 0xBob",
                "pay 50 tokens to 0xCharlie",
                "transfer 100 to 0xDave",
                "move 25 coins to 0xEve",
                "send 15 EDS to 0xFrank",
                "transfer 30 tokens to 0xGrace",
                "pay 8 tokens to 0xHank",
                "transfer 20 EDS to 0xIris",
                "send 45 tokens to 0xJack",
                "move 60 to 0xKate",
                "transfer 12 tokens to 0xLiam",
                "send 35 EDS to 0xMia",
                "pay 90 tokens to 0xNeil",
                "transfer 5 tokens to 0xOlive",
                "send 22 EDS to 0xPaul",
                "transfer 18 tokens to 0xQuin",
                "move 40 coins to 0xRachel",
                "send 55 tokens to 0xSam",
                "transfer 7 EDS to 0xTara",
            ],
        },
        {
            name: "High-Value Transfers",
            instructions: [
                "transfer 50000 tokens to 0xWhale1",
                "send 100000 EDS to 0xWhale2",
                "move 25000 tokens to 0xWhale3",
                "transfer 75000 coins to 0xTreasury",
                "pay 10000 EDS to 0xVault",
                "send 30000 tokens to 0xReserve",
                "transfer 20000 EDS to 0xFund",
                "move 15000 tokens to 0xEscrow",
                "transfer 40000 EDS to 0xDAO",
                "send 60000 tokens to 0xMultisigVault",
            ],
        },
        {
            name: "Contract Interactions",
            instructions: [
                "call contract at 0xDefiPool function swap",
                "execute function deposit in 0xLendingProtocol",
                "invoke contract 0xNFTMarket function buy_listing",
                "call 0xYieldFarm function harvest",
                "interact with contract at 0xBridge function lock",
                "execute 0xInsurance function claim",
                "call function mint in contract 0xToken",
                "invoke 0xAMM function add_liquidity",
                "execute contract 0xOracle function update_price",
                "call function withdraw from 0xStakingPool",
                "deploy module named MyToken",
                "publish contract at 0xMyModule",
                "deploy module named AirdropContract",
                "call contract 0xVesting function release_tokens",
                "execute function burn in 0xTokenContract",
            ],
        },
        {
            name: "Governance Operations",
            instructions: [
                "vote on proposal 0x001 for parameter update",
                "cast vote against governance proposal upgrade",
                "submit a proposal to update minimum stake",
                "vote on proposal 0x005",
                "create governance proposal for fee reduction",
                "vote for protocol upgrade proposal",
                "propose increase in validator reward",
                "cast a vote for community grant proposal",
                "governance vote on treasury allocation",
                "vote against network fee increase",
            ],
        },
        {
            name: "Mixed AI Batch",
            instructions: [
                "transfer 500 tokens to 0xUser1",
                "stake 2000 EDS to validator 0xValidatorA",
                "call contract 0xDeFi function borrow",
                "transfer 10000 tokens to 0xTreasury",
                "vote on proposal 0x007",
                "mint NFT to collection 0xGameAssets",
                "send 150 EDS to 0xUser2",
                "unstake 1000 tokens from validator 0xValidatorB",
                "deploy module named GameLogic",
                "transfer 75 tokens to 0xUser3",
                "call function liquidate in 0xLending",
                "stake 500 to 0xValidatorC",
                "burn 200 tokens",
                "transfer 8000 EDS to 0xEscrow",
                "execute contract 0xBridge function deposit",
                "send 30 tokens to 0xUser4",
                "governance propose increase block size",
                "mint NFT for 0xCollector",
                "transfer 999 EDS to 0xUser5",
                "call 0xMarket function create_listing",
            ],
        },
    ];

// ─────────────────────────────────────────────────────
// Benchmark Runner
// ─────────────────────────────────────────────────────

export class BenchmarkEngine {
    private readonly guard: ExecutionGuard;

    constructor() {
        this.guard = new ExecutionGuard({
            simulation: { allowSyntheticFallback: true },
        });
    }

    /**
     * Run all benchmark scenarios and return aggregated results.
     */
    async run(
        onProgress?: (completed: number, total: number, scenario: string) => void
    ): Promise<BenchmarkResult> {
        const scenarioResults: BenchmarkScenario[] = [];
        let totalCompleted = 0;
        const allInstructions = SCENARIOS.flatMap((s) => s.instructions);
        const grandTotal = allInstructions.length;

        // Per-scenario stats
        const globalStats = {
            totalGas: 0,
            totalConflict: 0,
            totalParallelEff: 0,
            totalRisk: 0,
            multisigCount: 0,
            successCount: 0,
            highRiskCount: 0,
            lowRiskCount: 0,
            txnCount: 0,
        };

        const startTime = Date.now();

        for (const scenario of SCENARIOS) {
            const scenStats = {
                totalGas: 0,
                totalConflict: 0,
                totalParallelEff: 0,
                multisigCount: 0,
                txnCount: 0,
            };

            for (const instruction of scenario.instructions) {
                const result = await this.guard.evaluate(instruction);

                scenStats.totalGas += result.simulation.gasEstimate;
                scenStats.totalConflict += result.conflictAnalysis.conflictProbability;
                scenStats.totalParallelEff += result.conflictAnalysis.parallelEfficiencyScore;
                scenStats.txnCount++;

                if (result.decision === "ESCALATE_MULTISIG") scenStats.multisigCount++;

                // Global stats
                globalStats.totalGas += result.simulation.gasEstimate;
                globalStats.totalConflict += result.conflictAnalysis.conflictProbability;
                globalStats.totalParallelEff += result.conflictAnalysis.parallelEfficiencyScore;
                globalStats.totalRisk += result.riskAssessment.riskScore;
                if (result.decision === "ESCALATE_MULTISIG") globalStats.multisigCount++;
                if (result.simulation.predictedStatus === "success") globalStats.successCount++;
                if (result.riskAssessment.riskLevel === "HIGH" || result.riskAssessment.riskLevel === "CRITICAL") {
                    globalStats.highRiskCount++;
                } else if (result.riskAssessment.riskLevel === "LOW") {
                    globalStats.lowRiskCount++;
                }
                globalStats.txnCount++;

                totalCompleted++;
                onProgress?.(totalCompleted, grandTotal, scenario.name);
            }

            const n = scenStats.txnCount;
            scenarioResults.push({
                name: scenario.name,
                transactionCount: n,
                averageGas: parseFloat((scenStats.totalGas / n).toFixed(0)),
                conflictRate: parseFloat((scenStats.totalConflict / n).toFixed(3)),
                parallelEfficiency: parseFloat((scenStats.totalParallelEff / n).toFixed(3)),
                multisigEscalationRate: parseFloat(
                    (scenStats.multisigCount / n).toFixed(3)
                ),
            });
        }

        const executionTimeMs = Date.now() - startTime;
        const N = globalStats.txnCount;

        return {
            totalTransactions: N,
            averageGas: parseFloat((globalStats.totalGas / N).toFixed(0)),
            conflictRate: parseFloat((globalStats.totalConflict / N).toFixed(3)),
            parallelEfficiency: parseFloat((globalStats.totalParallelEff / N).toFixed(3)),
            multisigEscalationRate: parseFloat((globalStats.multisigCount / N).toFixed(3)),
            averageRiskScore: parseFloat((globalStats.totalRisk / N).toFixed(3)),
            successRate: parseFloat((globalStats.successCount / N).toFixed(3)),
            executionTimeMs,
            highRiskCount: globalStats.highRiskCount,
            lowRiskCount: globalStats.lowRiskCount,
            scenarios: scenarioResults,
        };
    }

    /**
     * Format the result into a Markdown benchmark report.
     */
    static formatReport(result: BenchmarkResult): string {
        const bar = (v: number, max = 1.0): string => {
            const filled = Math.round((v / max) * 20);
            return "█".repeat(filled) + "░".repeat(20 - filled);
        };

        const lines: string[] = [
            "# 📊 Endless AI Execution Guard — Benchmark Report",
            "",
            `> Generated: ${new Date().toISOString()}`,
            `> Endless RPC: https://rpc.endless.link/v1`,
            "",
            "## Overview",
            "",
            "| Metric | Value |",
            "|--------|-------|",
            `| Transactions Tested | ${result.totalTransactions} |`,
            `| Execution Time | ${result.executionTimeMs.toLocaleString()} ms |`,
            `| Average Gas | ${result.averageGas.toLocaleString()} units |`,
            `| Success Rate | ${(result.successRate * 100).toFixed(1)}% |`,
            `| Average Risk Score | ${result.averageRiskScore.toFixed(3)} |`,
            `| Conflict Rate | ${(result.conflictRate * 100).toFixed(1)}% |`,
            `| Parallel Efficiency | ${(result.parallelEfficiency * 100).toFixed(1)}% |`,
            `| Multisig Escalation Rate | ${(result.multisigEscalationRate * 100).toFixed(1)}% |`,
            `| High/Critical Risk Transactions | ${result.highRiskCount} |`,
            `| Low Risk Transactions | ${result.lowRiskCount} |`,
            "",
            "## Block-STM Parallel Execution Analysis",
            "",
            "```",
            `Conflict Rate         ${bar(result.conflictRate)}  ${(result.conflictRate * 100).toFixed(1)}%`,
            `Parallel Efficiency   ${bar(result.parallelEfficiency)}  ${(result.parallelEfficiency * 100).toFixed(1)}%`,
            `Multisig Rate         ${bar(result.multisigEscalationRate)}  ${(result.multisigEscalationRate * 100).toFixed(1)}%`,
            "```",
            "",
            "## Scenario Breakdown",
            "",
            "| Scenario | Txns | Avg Gas | Conflict Rate | Parallel Eff | Multisig Rate |",
            "|----------|------|---------|---------------|--------------|---------------|",
            ...result.scenarios.map(
                (s) =>
                    `| ${s.name} | ${s.transactionCount} | ${s.averageGas.toLocaleString()} | ${(s.conflictRate * 100).toFixed(1)}% | ${(s.parallelEfficiency * 100).toFixed(1)}% | ${(s.multisigEscalationRate * 100).toFixed(1)}% |`
            ),
            "",
            "## Block-STM Conflict Explanation",
            "",
            "Endless uses **Block-STM** (Block Software Transactional Memory) for",
            "parallel transaction execution within each block. When two or more",
            "transactions in the same block attempt to write to the same storage key,",
            "Block-STM detects this conflict during its optimistic concurrency commit",
            "phase and forces one transaction to **abort and re-execute serially**.",
            "",
            "This guard pre-computes write-set overlap probability before submission,",
            "enabling batch reordering to minimize aborts and maximize parallelism.",
            "",
            `**Benchmark Result:** At a conflict rate of ${(result.conflictRate * 100).toFixed(1)}%,`,
            `the average block achieves ${(result.parallelEfficiency * 100).toFixed(1)}% parallel execution efficiency.`,
            "",
            "## Security Posture",
            "",
            `- **${result.highRiskCount}** transactions required multisig escalation`,
            `- **${result.lowRiskCount}** transactions were auto-approved as low-risk`,
            `- **${result.multisigEscalationRate * 100 >= 20 ? "ELEVATED" : "NOMINAL"}** multisig escalation rate`,
            "",
            "---",
            "_Generated by [Endless AI Execution Guard](https://github.com/endless-labs/endless-ai-execution-guard)_",
        ];

        return lines.join("\n");
    }
}
