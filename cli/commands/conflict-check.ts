/**
 * CLI command: conflict-check
 * Analyzes Block-STM conflict probability for an AI instruction.
 */

import type { Command } from "commander";
import { createExecutionGuard } from "../../lib/guard.js";
import {
    printHeader,
    formatIntent,
    formatSimulation,
    formatConflict,
    color,
} from "../utils/formatter.js";

export function conflictCheckCommand(program: Command): void {
    program
        .command("conflict-check <instruction>")
        .description("Analyze Block-STM write-set conflict probability for an instruction")
        .option("--json", "Output raw JSON result")
        .action(async (instruction: string, options: Record<string, string>) => {
            printHeader("endless-guard conflict-check");

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
                            simulation: result.simulation,
                            conflictAnalysis: result.conflictAnalysis,
                        },
                        null,
                        2
                    )
                );
                return;
            }

            formatIntent(result.intent);
            formatSimulation(result.simulation);
            formatConflict(result.conflictAnalysis);
        });
}
