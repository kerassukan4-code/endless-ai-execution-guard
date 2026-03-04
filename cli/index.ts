#!/usr/bin/env node
/**
 * endless-guard CLI
 *
 * Usage:
 *   endless-guard simulate "transfer 5000 to 0xBob"
 *   endless-guard risk-score "call contract 0xDeFi function swap"
 *   endless-guard conflict-check "stake 10000 EDS to 0xValidator"
 *   endless-guard replay-optimize
 *   endless-guard benchmark
 *   endless-guard health
 */

import { Command } from "commander";
import chalk from "chalk";
import { simulateCommand } from "./commands/simulate.js";
import { riskScoreCommand } from "./commands/risk-score.js";
import { conflictCheckCommand } from "./commands/conflict-check.js";
import { replayOptimizeCommand } from "./commands/replay-optimize.js";
import { benchmarkCommand } from "./commands/benchmark.js";
import { healthCommand } from "./commands/health.js";

const program = new Command();

// ─────────────────────────────────────────────────────
// Program metadata
// ─────────────────────────────────────────────────────

program
    .name("endless-guard")
    .description(
        chalk.bold.cyan("Endless AI Execution Guard") +
        " — Safety infrastructure for AI-generated blockchain transactions\n" +
        chalk.dim("  Endless Network: https://rpc.endless.link/v1")
    )
    .version("1.0.0", "-v, --version")
    .option("--rpc <url>", "Endless RPC endpoint URL", "https://rpc.endless.link/v1")
    .option("--no-color", "Disable color output");

// ─────────────────────────────────────────────────────
// Commands
// ─────────────────────────────────────────────────────

simulateCommand(program);
riskScoreCommand(program);
conflictCheckCommand(program);
replayOptimizeCommand(program);
benchmarkCommand(program);
healthCommand(program);

// ─────────────────────────────────────────────────────
// Parse & error handling
// ─────────────────────────────────────────────────────

program.addHelpText(
    "after",
    `
${chalk.bold("Examples:")}
  ${chalk.dim("$")} endless-guard simulate "transfer 5000 tokens to 0xBob"
  ${chalk.dim("$")} endless-guard risk-score "call contract 0xDeFi function swap"
  ${chalk.dim("$")} endless-guard conflict-check "stake 50000 to validator 0xValidator"
  ${chalk.dim("$")} endless-guard replay-optimize
  ${chalk.dim("$")} endless-guard benchmark
  ${chalk.dim("$")} endless-guard health

${chalk.bold("Documentation:")}
  https://github.com/endless-labs/endless-ai-execution-guard
`
);

program.parse(process.argv);
