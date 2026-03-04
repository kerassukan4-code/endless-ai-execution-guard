/**
 * CLI command: risk-score
 * Calculates the risk score for an AI instruction (no full simulation).
 */

import type { Command } from "commander";
import { createExecutionGuard } from "../../lib/guard.js";
import {
    printHeader,
    formatIntent,
    formatRisk,
    color,
} from "../utils/formatter.js";

export function riskScoreCommand(program: Command): void {
    program
        .command("risk-score <instruction>")
        .description("Calculate the AI transaction risk score for an instruction")
        .option("--json", "Output raw JSON result")
        .action(async (instruction: string, options: Record<string, string>) => {
            printHeader("endless-guard risk-score");

            console.log(color.label("  Instruction:"), color.accent(`"${instruction}"`));
            console.log();

            const guard = createExecutionGuard({
                simulation: { allowSyntheticFallback: true },
            });

            let result;
            try {
                result = await guard.evaluate(instruction);
            } catch (err) {
                console.error(color.error(`  Error: ${String(err)}`));
                process.exit(1);
            }

            if (options["json"]) {
                console.log(
                    JSON.stringify(
                        {
                            intent: result.intent,
                            riskAssessment: result.riskAssessment,
                        },
                        null,
                        2
                    )
                );
                return;
            }

            formatIntent(result.intent);
            formatRisk(result.riskAssessment);

            console.log(
                color.label("  Routing:"),
                result.riskAssessment.requiresMultisig
                    ? color.warning("Multisig escalation required")
                    : color.success("Single-signer approval sufficient")
            );
            console.log();
        });
}
