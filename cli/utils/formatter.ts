/**
 * CLI output formatting utilities
 * Provides consistent, beautiful terminal output for all commands.
 */

import chalk from "chalk";
import type {
    ParsedIntent,
    SimulationResult,
    ConflictAnalysis,
    RiskAssessment,
    GuardResult,
} from "../../lib/types.js";

// ─────────────────────────────────────────────────────
// Color helpers
// ─────────────────────────────────────────────────────

export const color = {
    header: (s: string) => chalk.bold.cyan(s),
    subheader: (s: string) => chalk.bold.white(s),
    label: (s: string) => chalk.dim(s),
    value: (s: string) => chalk.white(s),
    success: (s: string) => chalk.green(s),
    warning: (s: string) => chalk.yellow(s),
    error: (s: string) => chalk.red(s),
    critical: (s: string) => chalk.bold.red(s),
    muted: (s: string) => chalk.dim.gray(s),
    accent: (s: string) => chalk.bold.magenta(s),
    number: (n: number | string) => chalk.bold.white(String(n)),
};

// ─────────────────────────────────────────────────────
// Section / separator helpers
// ─────────────────────────────────────────────────────

export function printHeader(title: string): void {
    console.log();
    console.log(color.header(`  ╔${"═".repeat(50)}╗`));
    console.log(color.header(`  ║  ${title.padEnd(48)}║`));
    console.log(color.header(`  ╚${"═".repeat(50)}╝`));
    console.log();
}

export function printSection(title: string): void {
    console.log(chalk.bold.cyan(`  ┌─ ${title}`));
}

export function printSectionEnd(): void {
    console.log();
}

export function printSeparator(): void {
    console.log(chalk.dim("  " + "─".repeat(52)));
}

export function printRow(label: string, value: string, width = 24): void {
    const paddedLabel = color.label((label + ":").padEnd(width));
    console.log(`    ${paddedLabel} ${value}`);
}

export function printWarnings(warnings: string[]): void {
    if (warnings.length === 0) return;
    console.log(color.subheader("  ┌─ Warnings"));
    for (const w of warnings) {
        console.log(color.warning(`    ⚠  ${w}`));
    }
    console.log();
}

// ─────────────────────────────────────────────────────
// Specialized formatters
// ─────────────────────────────────────────────────────

export function formatIntent(intent: ParsedIntent): void {
    printSection("Intent Analysis");
    printRow("Raw Input", color.muted(`"${intent.rawInput}"`));
    printRow("Action", color.accent(intent.action.toUpperCase()));
    printRow(
        "Sensitive",
        intent.sensitive
            ? color.warning("TRUE ⚠")
            : color.success("FALSE ✓")
    );
    if (intent.amount !== undefined) {
        printRow("Amount", color.number(intent.amount.toLocaleString()) + " tokens");
    }
    if (intent.target) {
        printRow("Target", chalk.cyan(intent.target));
    }
    if (intent.moduleAddress) {
        printRow("Module Address", chalk.cyan(intent.moduleAddress));
    }
    if (intent.functionName) {
        printRow("Function", chalk.cyan(intent.functionName));
    }
    printRow("AI Confidence", formatConfidence(intent.confidence));
    if (intent.sensitivityReasons.length > 0) {
        printRow("Sensitivity Reasons", "");
        for (const reason of intent.sensitivityReasons) {
            console.log(color.warning(`      • ${reason}`));
        }
    }
    printSectionEnd();
}

export function formatSimulation(sim: SimulationResult): void {
    printSection("Simulation Result");
    printRow(
        "Predicted Status",
        sim.predictedStatus === "success"
            ? color.success("SUCCESS ✓")
            : color.error("ABORT ✗")
    );
    printRow("Gas Estimate", color.number(sim.gasEstimate.toLocaleString()) + " units");
    printRow("Write-Set Size", color.number(sim.writeSetSize) + " entries");
    printRow("VM Status", color.muted(sim.vmStatus));
    if (sim.storageKeys.length > 0) {
        printRow("Storage Keys", "");
        for (const key of sim.storageKeys.slice(0, 5)) {
            console.log(color.muted(`      ${key}`));
        }
        if (sim.storageKeys.length > 5) {
            console.log(color.muted(`      … and ${sim.storageKeys.length - 5} more`));
        }
    }
    if (sim.logs.length > 0) {
        for (const log of sim.logs) {
            console.log(color.muted(`    ℹ  ${log}`));
        }
    }
    printSectionEnd();
}

export function formatConflict(conflict: ConflictAnalysis): void {
    printSection("Block-STM Conflict Analysis");
    printRow(
        "Conflict Probability",
        formatProbability(conflict.conflictProbability)
    );
    printRow(
        "Parallel Efficiency",
        formatEfficiency(conflict.parallelEfficiencyScore)
    );
    printRow(
        "Est. Concurrent Txns",
        color.number(conflict.estimatedConcurrentTxns)
    );
    printRow(
        "Worst-Case Latency",
        color.number(conflict.worstCaseLatencyMs) + " ms"
    );
    if (conflict.conflictingKeys.length > 0) {
        printRow("Hot Keys", "");
        for (const k of conflict.conflictingKeys.slice(0, 3)) {
            console.log(color.warning(`      🔥 ${k}`));
        }
    }
    printRow("Optimization", "");
    console.log(color.muted(`      ${conflict.optimizationSuggestion}`));
    printSectionEnd();
}

export function formatRisk(risk: RiskAssessment): void {
    printSection("Risk Assessment");
    const riskColor = getRiskColor(risk.riskLevel);
    printRow("Risk Score", riskColor(`${risk.riskScore.toFixed(3)}`));
    printRow("Risk Level", riskColor(risk.riskLevel));
    printRow("Requires Multisig", risk.requiresMultisig ? color.warning("YES") : color.success("NO"));
    printRow("Estimated Impact", color.muted(risk.estimatedImpact));
    if (risk.factors.length > 0) {
        printRow("Risk Factors", "");
        for (const factor of risk.factors) {
            const factorScore = (factor.weight * 100).toFixed(0);
            console.log(color.warning(`      • [${factorScore}%] ${factor.name}`));
            console.log(color.muted(`           ${factor.description}`));
        }
    }
    printSectionEnd();
}

export function formatDecision(result: GuardResult): void {
    printSection("Routing Decision");
    const decisionColor =
        result.decision === "APPROVE"
            ? chalk.bold.green
            : result.decision === "ESCALATE_MULTISIG"
                ? chalk.bold.yellow
                : chalk.bold.red;

    console.log();
    console.log(
        `    ${decisionColor(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)}`
    );
    if (result.decision === "APPROVE") {
        console.log(
            `    ${chalk.bold.green("  ✅  APPROVED — Transaction cleared for execution")}`
        );
    } else if (result.decision === "ESCALATE_MULTISIG") {
        console.log(`    ${chalk.bold.yellow("  🔐  MULTISIG ESCALATION REQUIRED")}`);
        if (result.multisigProposal) {
            console.log(
                chalk.yellow(
                    `       Proposal ID: ${result.multisigProposal.proposalId}`
                )
            );
            console.log(
                chalk.yellow(
                    `       Required:     ${result.multisigProposal.requiredApprovals} approvals`
                )
            );
            console.log(
                chalk.yellow(
                    `       Expires:      ${new Date(result.multisigProposal.expiresAt).toISOString()}`
                )
            );
        }
    } else {
        console.log(
            `    ${chalk.bold.red("  ❌  REJECTED — Transaction blocked by guard policy")}`
        );
    }
    console.log(
        `    ${decisionColor(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)}`
    );
    console.log();
    console.log(color.muted(`    ${result.riskAssessment.recommendation}`));
    console.log();
    printRow("Processing Time", color.number(result.processingTimeMs) + " ms");
    printSectionEnd();
}

// ─────────────────────────────────────────────────────
// Primitive formatters
// ─────────────────────────────────────────────────────

function formatProbability(p: number): string {
    const pct = (p * 100).toFixed(1);
    if (p < 0.1) return chalk.green(`${pct}% (low)`);
    if (p < 0.35) return chalk.yellow(`${pct}% (moderate)`);
    if (p < 0.65) return chalk.hex("#FF8C00")(`${pct}% (high)`);
    return chalk.red(`${pct}% (critical)`);
}

function formatEfficiency(e: number): string {
    const pct = (e * 100).toFixed(1);
    if (e >= 0.8) return chalk.green(`${pct}%`);
    if (e >= 0.6) return chalk.yellow(`${pct}%`);
    return chalk.red(`${pct}%`);
}

function formatConfidence(c: number): string {
    const pct = (c * 100).toFixed(0);
    if (c >= 0.85) return chalk.green(`${pct}%`);
    if (c >= 0.65) return chalk.yellow(`${pct}%`);
    return chalk.red(`${pct}% ⚠ low confidence`);
}

function getRiskColor(level: string) {
    switch (level) {
        case "LOW": return chalk.green;
        case "MEDIUM": return chalk.yellow;
        case "HIGH": return chalk.hex("#FF8C00");
        case "CRITICAL": return chalk.bold.red;
        default: return chalk.white;
    }
}
