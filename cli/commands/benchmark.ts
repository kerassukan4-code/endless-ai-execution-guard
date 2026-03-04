/**
 * CLI command: benchmark
 * Runs the full benchmark suite and displays results.
 */

import type { Command } from "commander";
import { BenchmarkEngine } from "../../benchmark/engine.js";
import { writeFileSync } from "fs";
import {
    printHeader,
    printSection,
    printRow,
    printSeparator,
    color,
} from "../utils/formatter.js";
import chalk from "chalk";

export function benchmarkCommand(program: Command): void {
    program
        .command("benchmark")
        .description("Run the full benchmark suite (120 transactions across 5 scenarios)")
        .option("--output <path>", "Write Markdown report to file", "benchmark-report.md")
        .option("--json", "Output raw JSON result")
        .action(async (options: Record<string, string>) => {
            printHeader("endless-guard benchmark");

            console.log(color.label("  Running benchmark suite..."));
            console.log(color.muted("  (Using synthetic simulation — no live RPC required)"));
            console.log();

            const engine = new BenchmarkEngine();
            let lastScenario = "";

            const result = await engine.run((completed, total, scenario) => {
                if (scenario !== lastScenario) {
                    if (lastScenario) process.stdout.write(` ✓\n`);
                    process.stdout.write(`  ▶ ${scenario.padEnd(35)}`);
                    lastScenario = scenario;
                }
                process.stdout.write("·");
            });

            process.stdout.write(` ✓\n\n`);

            if (options["json"]) {
                console.log(JSON.stringify(result, null, 2));
                return;
            }

            // Summary display
            printSection("Benchmark Summary");
            printRow("Transactions Tested", color.number(result.totalTransactions));
            printRow("Execution Time", color.number(result.executionTimeMs.toLocaleString()) + " ms");
            printRow("Average Gas", color.number(result.averageGas.toLocaleString()) + " units");
            printRow("Success Rate", `${(result.successRate * 100).toFixed(1)}%`);
            printRow("Conflict Rate", `${(result.conflictRate * 100).toFixed(1)}%`);
            printRow("Parallel Efficiency", `${(result.parallelEfficiency * 100).toFixed(1)}%`);
            printRow("Multisig Escalation", `${(result.multisigEscalationRate * 100).toFixed(1)}%`);
            printRow("Avg Risk Score", result.averageRiskScore.toFixed(3));
            printRow("High-Risk Txns", color.warning(String(result.highRiskCount)));
            printRow("Low-Risk Txns", color.success(String(result.lowRiskCount)));

            console.log();
            printSeparator();
            console.log();

            // Scenario table
            printSection("Scenario Breakdown");
            console.log();
            console.log(
                chalk.dim("    Scenario                         Gas       Conflict  Efficiency  Multisig")
            );
            console.log(chalk.dim("    " + "─".repeat(74)));

            for (const s of result.scenarios) {
                console.log(
                    `    ${s.name.padEnd(33)} ${String(s.averageGas).padStart(7)}   ` +
                    `${(s.conflictRate * 100).toFixed(1).padStart(6)}%  ` +
                    `${(s.parallelEfficiency * 100).toFixed(1).padStart(8)}%  ` +
                    `${(s.multisigEscalationRate * 100).toFixed(1).padStart(6)}%`
                );
            }

            console.log();

            // Write report
            const reportPath = options["output"] ?? "benchmark-report.md";
            const report = BenchmarkEngine.formatReport(result);
            writeFileSync(reportPath, report, "utf-8");

            console.log(color.success(`  ✓ Benchmark report written to: ${reportPath}`));
            console.log();
        });
}
