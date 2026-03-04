/**
 * CLI command: simulate
 * Runs the full Guard pipeline on a natural language AI instruction.
 *
 * Usage: endless-guard simulate "transfer 5000 tokens to 0xBob"
 */

import type { Command } from "commander";
import { createExecutionGuard } from "../../lib/guard.js";
import {
    printHeader,
    printWarnings,
    formatIntent,
    formatSimulation,
    formatConflict,
    formatRisk,
    formatDecision,
    color,
} from "../utils/formatter.js";

export function simulateCommand(program: Command): void {
    program
        .command("simulate <instruction>")
        .description("Simulate an AI-generated transaction through the full safety pipeline")
        .option("--rpc-url <url>", "Endless RPC endpoint", "https://rpc.endless.link/v1")
        .option("--sender <address>", "Sender address for simulation context")
        .option("--json", "Output raw JSON result")
        .action(async (instruction: string, options: Record<string, string>) => {
            printHeader("endless-guard simulate");

            console.log(color.label("  Instruction:"), color.accent(`"${instruction}"`));
            console.log();

            const guard = createExecutionGuard({
                rpc: { rpcUrl: options["rpcUrl"] ?? "https://rpc.endless.link/v1" },
                simulation: {
                    senderAddress: options["sender"],
                    allowSyntheticFallback: true,
                },
            });

            let result;
            try {
                result = await guard.evaluate(instruction);
            } catch (err) {
                console.error(color.error(`  Error: ${String(err)}`));
                process.exit(1);
            }

            if (options["json"]) {
                console.log(JSON.stringify(result, null, 2));
                return;
            }

            printWarnings(result.warnings);
            formatIntent(result.intent);
            formatSimulation(result.simulation);
            formatConflict(result.conflictAnalysis);
            formatRisk(result.riskAssessment);
            formatDecision(result);
        });
}
