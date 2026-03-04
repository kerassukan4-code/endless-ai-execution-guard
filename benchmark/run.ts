/**
 * Benchmark runner entrypoint
 * Usage: tsx benchmark/run.ts
 */

import { writeFileSync } from "fs";
import { BenchmarkEngine } from "./engine.js";

const engine = new BenchmarkEngine();

console.log("╔════════════════════════════════════════════════════╗");
console.log("║   Endless AI Execution Guard — Benchmark Runner    ║");
console.log("╚════════════════════════════════════════════════════╝");
console.log();
console.log("Running benchmark scenarios...\n");

let lastScenario = "";
const startTime = Date.now();

const result = await engine.run((completed, total, scenario) => {
    if (scenario !== lastScenario) {
        if (lastScenario) console.log(" ✓");
        process.stdout.write(`  ▶ ${scenario.padEnd(30)}`);
        lastScenario = scenario;
    }
    process.stdout.write(".");
});

console.log(" ✓");
console.log();

const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(2);
console.log(`Completed ${result.totalTransactions} transactions in ${elapsedSec}s\n`);

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("  RESULTS");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log();
console.log(`  Transactions Tested:      ${result.totalTransactions}`);
console.log(`  Average Gas:              ${result.averageGas.toLocaleString()} units`);
console.log(`  Conflict Rate:            ${(result.conflictRate * 100).toFixed(1)}%`);
console.log(`  Parallel Efficiency:      ${(result.parallelEfficiency * 100).toFixed(1)}%`);
console.log(`  Multisig Escalation Rate: ${(result.multisigEscalationRate * 100).toFixed(1)}%`);
console.log(`  Average Risk Score:       ${result.averageRiskScore.toFixed(3)}`);
console.log(`  High/Critical Risk Count: ${result.highRiskCount}`);
console.log();
console.log("  Scenario Breakdown:");
console.log();

for (const scenario of result.scenarios) {
    console.log(`    ${scenario.name}`);
    console.log(`      Gas: ${scenario.averageGas.toLocaleString().padStart(8)} | Conflict: ${(scenario.conflictRate * 100).toFixed(1)}% | Efficiency: ${(scenario.parallelEfficiency * 100).toFixed(1)}% | Multisig: ${(scenario.multisigEscalationRate * 100).toFixed(1)}%`);
}

console.log();

// Write Markdown report
const report = BenchmarkEngine.formatReport(result);
const reportPath = "benchmark-report.md";
writeFileSync(reportPath, report, "utf-8");

console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`  Benchmark report saved to: ${reportPath}`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
