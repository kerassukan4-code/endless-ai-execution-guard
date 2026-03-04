/**
 * CLI command: health
 * Checks connectivity to the Endless RPC endpoint.
 */

import type { Command } from "commander";
import { createExecutionGuard } from "../../lib/guard.js";
import {
    printHeader,
    printSection,
    printRow,
    color,
} from "../utils/formatter.js";

export function healthCommand(program: Command): void {
    program
        .command("health")
        .description("Check connectivity to the Endless RPC endpoint")
        .option("--rpc-url <url>", "Endless RPC endpoint", "https://rpc.endless.link/v1")
        .option("--json", "Output raw JSON result")
        .action(async (options: Record<string, string>) => {
            printHeader("endless-guard health");

            const rpcUrl = options["rpcUrl"] ?? "https://rpc.endless.link/v1";
            console.log(color.label("  RPC Endpoint:"), chalk(rpcUrl));
            console.log();

            const guard = createExecutionGuard({ rpc: { rpcUrl } });

            const health = await guard.healthCheck();

            if (options["json"]) {
                console.log(JSON.stringify(health, null, 2));
                return;
            }

            printSection("RPC Health Check");
            printRow(
                "Status",
                health.rpcConnected
                    ? color.value("🟢  CONNECTED")
                    : color.error("🔴  UNREACHABLE")
            );
            printRow("Latency", color.value(`${health.latencyMs} ms`));

            if (health.rpcConnected) {
                printRow("Chain ID", color.value(String(health.chainId ?? "N/A")));
                printRow("Block Height", color.value(String(health.blockHeight ?? "N/A")));
            } else {
                printRow("Error", color.error(health.error ?? "Unknown error"));
                console.log();
                console.log(color.warning("  ⚠  Guard will operate in synthetic simulation mode."));
                console.log(color.muted("     All gas estimates and write-sets are modeled offline."));
            }

            console.log();
        });
}

// lazy import helper to avoid cyclic issue with chalk ESM
function chalk(s: string): string {
    return s;
}
