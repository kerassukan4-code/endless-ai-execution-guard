/**
 * CLI command: replay-optimize
 * Records a batch of AI instructions interactively and produces
 * an optimized execution ordering to minimize Block-STM conflicts.
 */

import type { Command } from "commander";
import { createExecutionGuard } from "../../lib/guard.js";
import { ReplayAnalyzer } from "../../lib/replay/analyzer.js";
import {
    printHeader,
    printSection,
    printRow,
    color,
} from "../utils/formatter.js";

// Built-in sample batch for demonstration
const SAMPLE_BATCH = [
    "transfer 1000 tokens to 0xAlice",
    "stake 5000 EDS to validator 0xValidatorA",
    "transfer 500 tokens to 0xBob",
    "vote on proposal 0x001",
    "transfer 2000 EDS to 0xCharlie",
    "call contract 0xDeFi function swap",
    "transfer 300 tokens to 0xDave",
    "stake 3000 to validator 0xValidatorA",
    "transfer 100 EDS to 0xEve",
    "mint NFT to collection 0xGameAssets",
];

export function replayOptimizeCommand(program: Command): void {
    program
        .command("replay-optimize")
        .description("Analyze and optimize a batch of AI instructions for Block-STM efficiency")
        .option("--instructions <list>", "Comma-separated list of instructions to analyze")
        .option("--json", "Output raw JSON result")
        .action(async (options: Record<string, string>) => {
            printHeader("endless-guard replay-optimize");

            const instructions = options["instructions"]
                ? options["instructions"].split(",").map((s: string) => s.trim())
                : SAMPLE_BATCH;

            console.log(color.label(`  Batch size: ${instructions.length} transactions`));
            console.log(color.muted(`  Using ${options["instructions"] ? "provided" : "built-in sample"} batch`));
            console.log();

            const guard = createExecutionGuard({
                simulation: { allowSyntheticFallback: true },
            });
            const analyzer = new ReplayAnalyzer();

            console.log(color.label("  Processing transactions..."));

            for (let i = 0; i < instructions.length; i++) {
                const instruction = instructions[i]!;
                process.stdout.write(`  [${String(i + 1).padStart(2)}/${instructions.length}] ${instruction.substring(0, 50).padEnd(50)}`);

                const result = await guard.evaluate(instruction);
                analyzer.recordTransaction(
                    result.intent,
                    result.simulation,
                    result.conflictAnalysis,
                    result.riskAssessment
                );

                process.stdout.write(" ✓\n");
            }

            console.log();

            const analysis = analyzer.reorderBatch();

            if (options["json"]) {
                console.log(JSON.stringify(analysis, null, 2));
                return;
            }

            printSection("Replay Optimization Results");
            printRow("Batch ID", color.muted(analysis.batchId));
            printRow("Total Transactions", color.number(analysis.totalTransactions));
            printRow(
                "Baseline Efficiency",
                `${(analysis.baselineEfficiency * 100).toFixed(1)}%`
            );
            printRow(
                "Optimized Efficiency",
                color.value(`${(analysis.optimizedEfficiency * 100).toFixed(1)}%`)
            );
            printRow(
                "Improvement",
                color.success(`+${analysis.improvement.toFixed(2)}%`)
            );
            printRow("Conflict Groups", color.number(analysis.conflictGroups.length));
            printRow(
                "Estimated Time Saving",
                color.number(analysis.estimatedTimeSavingMs) + " ms"
            );

            console.log();
            console.log(color.label("  Optimized Execution Order:"));
            console.log();

            for (let i = 0; i < analysis.reorderedBatch.length; i++) {
                const txn = analysis.reorderedBatch[i]!;
                const risk = txn.riskAssessment.riskLevel;
                const riskLabel =
                    risk === "LOW" ? color.value("LOW    ")
                        : risk === "MEDIUM" ? color.warning("MEDIUM ")
                            : color.error("HIGH   ");

                console.log(
                    `    ${String(i + 1).padStart(2)}. [${riskLabel}] ${txn.intent.action.padEnd(16)} — ${color.muted(txn.intent.rawInput.substring(0, 45))}`
                );
            }

            console.log();
            console.log(color.label("  Conflict Groups (transactions that share storage keys):"));
            console.log();

            for (let i = 0; i < analysis.conflictGroups.length; i++) {
                const group = analysis.conflictGroups[i]!;
                console.log(color.muted(`    Group ${i + 1}: ${group.length} transaction(s) — parallel execution safe within group`));
            }
            console.log();
        });
}
