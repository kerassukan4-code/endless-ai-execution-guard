"use client";
import { useState } from "react";
import { Terminal } from "@/components/Terminal";

// ─── Command definitions ──────────────────────────────────────────────────────

const COMMANDS = [
    {
        id: "simulate",
        label: "simulate",
        description: "Full safety pipeline evaluation",
        usage: 'endless-guard simulate "<instruction>"',
        options: [
            { flag: "--rpc-url <url>", desc: "Endless RPC endpoint URL" },
            { flag: "--sender <address>", desc: "Sender address for simulation context" },
            { flag: "--json", desc: "Output raw JSON result" },
        ],
        examples: [
            {
                subtitle: "Low-risk transfer → APPROVE",
                lines: [
                    { type: "command" as const, text: 'endless-guard simulate "transfer 500 tokens to 0xAlice"' },
                    { type: "blank" as const, text: "" },
                    { type: "header" as const, text: "  ╔══════════════════════════════════════════════════╗" },
                    { type: "header" as const, text: "  ║  endless-guard simulate                          ║" },
                    { type: "header" as const, text: "  ╚══════════════════════════════════════════════════╝" },
                    { type: "blank" as const, text: "" },
                    { type: "output" as const, text: "  ┌─ Intent Analysis" },
                    { type: "output" as const, text: "    Action:           TRANSFER" },
                    { type: "warning" as const, text: "   Sensitive:         TRUE ⚠" },
                    { type: "output" as const, text: "    Amount:            500 tokens" },
                    { type: "output" as const, text: "    Target:            0xAlice" },
                    { type: "success" as const, text: "   AI Confidence:     100%" },
                    { type: "blank" as const, text: "" },
                    { type: "output" as const, text: "  ┌─ Simulation Result" },
                    { type: "success" as const, text: "   Predicted Status:  SUCCESS ✓" },
                    { type: "output" as const, text: "    Gas Estimate:      801 units" },
                    { type: "output" as const, text: "    Write-Set Size:    3 entries" },
                    { type: "blank" as const, text: "" },
                    { type: "output" as const, text: "  ┌─ Block-STM Conflict Analysis" },
                    { type: "output" as const, text: "    Conflict:          22.1% (moderate)" },
                    { type: "output" as const, text: "    Parallel Eff:      66.8%" },
                    { type: "blank" as const, text: "" },
                    { type: "output" as const, text: "  ┌─ Risk Assessment" },
                    { type: "output" as const, text: "    Risk Score:        0.360" },
                    { type: "output" as const, text: "    Risk Level:        MEDIUM" },
                    { type: "output" as const, text: "    Requires Multisig: NO" },
                    { type: "blank" as const, text: "" },
                    { type: "success" as const, text: "   ✅  APPROVED — Transaction cleared for execution" },
                    { type: "output" as const, text: "    Processing Time:   226 ms" },
                ],
            },
            {
                subtitle: "Governance proposal → MULTISIG",
                lines: [
                    { type: "command" as const, text: 'endless-guard simulate "submit a proposal to update minimum stake"' },
                    { type: "blank" as const, text: "" },
                    { type: "output" as const, text: "  ┌─ Intent Analysis" },
                    { type: "output" as const, text: "    Action:           GOVERNANCE_PROPOSE" },
                    { type: "warning" as const, text: "   Sensitive:         TRUE ⚠  (governance operation)" },
                    { type: "blank" as const, text: "" },
                    { type: "warning" as const, text: "   ⚠  High conflict probability (74.6%) — consider reordering." },
                    { type: "blank" as const, text: "" },
                    { type: "output" as const, text: "  ┌─ Risk Assessment" },
                    { type: "output" as const, text: "    Risk Score:        0.660" },
                    { type: "error" as const, text: "   Risk Level:        HIGH" },
                    { type: "warning" as const, text: "   Requires Multisig: YES" },
                    { type: "blank" as const, text: "" },
                    { type: "warning" as const, text: "   🔐  MULTISIG ESCALATION REQUIRED" },
                    { type: "output" as const, text: "       Proposal ID: 5d87389d-a8b2-4ca6-9f84-7bcc2f024901" },
                    { type: "output" as const, text: "       Required:     3 approvals" },
                    { type: "output" as const, text: "       Expires:      2026-03-05T08:41:11.104Z" },
                ],
            },
        ],
    },
    {
        id: "risk-score",
        label: "risk-score",
        description: "Calculate risk score without full simulation",
        usage: 'endless-guard risk-score "<instruction>"',
        options: [
            { flag: "--json", desc: "Output raw JSON result" },
        ],
        examples: [
            {
                subtitle: "Contract interaction risk",
                lines: [
                    { type: "command" as const, text: 'endless-guard risk-score "call contract 0xDeFi function swap"' },
                    { type: "blank" as const, text: "" },
                    { type: "output" as const, text: "  ┌─ Intent Analysis" },
                    { type: "output" as const, text: "    Action:     CALL_CONTRACT" },
                    { type: "warning" as const, text: "   Sensitive:   TRUE ⚠  (contract interaction)" },
                    { type: "blank" as const, text: "" },
                    { type: "output" as const, text: "  ┌─ Risk Assessment" },
                    { type: "output" as const, text: "    Risk Score: 0.484" },
                    { type: "output" as const, text: "    Risk Level: MEDIUM" },
                    { type: "output" as const, text: "    Factors:" },
                    { type: "output" as const, text: "      • [20%] Contract Interaction" },
                    { type: "output" as const, text: "      • [15%] Storage Conflict Risk" },
                    { type: "output" as const, text: "      • [10%] AI Generation Uncertainty" },
                    { type: "blank" as const, text: "" },
                    { type: "success" as const, text: "   Routing: Single-signer approval sufficient" },
                ],
            },
        ],
    },
    {
        id: "conflict-check",
        label: "conflict-check",
        description: "Block-STM write-set conflict analysis",
        usage: 'endless-guard conflict-check "<instruction>"',
        options: [
            { flag: "--json", desc: "Output raw JSON result" },
        ],
        examples: [
            {
                subtitle: "High-conflict stake operation",
                lines: [
                    { type: "command" as const, text: 'endless-guard conflict-check "stake 50000 EDS to validator 0xValidatorA"' },
                    { type: "blank" as const, text: "" },
                    { type: "output" as const, text: "  ┌─ Block-STM Conflict Analysis" },
                    { type: "output" as const, text: "    Conflict Probability:   44.2% (high)" },
                    { type: "output" as const, text: "    Parallel Efficiency:    32.7%" },
                    { type: "output" as const, text: "    Est. Concurrent Txns:  38" },
                    { type: "output" as const, text: "    Worst-Case Latency:    26 ms" },
                    { type: "blank" as const, text: "" },
                    { type: "warning" as const, text: "   🔥 Hot Keys:" },
                    { type: "output" as const, text: "      0x1::delegation_pool::DelegationPool::0xValidatorA" },
                    { type: "output" as const, text: "      0x1::stake::StakePool::0xValidatorA" },
                    { type: "blank" as const, text: "" },
                    { type: "output" as const, text: "    Optimization: Consider targeting off-peak blocks or" },
                    { type: "output" as const, text: "    splitting stake across multiple validators." },
                ],
            },
        ],
    },
    {
        id: "replay-optimize",
        label: "replay-optimize",
        description: "Optimize a batch for Block-STM efficiency",
        usage: "endless-guard replay-optimize [--instructions <list>]",
        options: [
            { flag: "--instructions <list>", desc: "Comma-separated list of instructions" },
            { flag: "--json", desc: "Output raw JSON result" },
        ],
        examples: [
            {
                subtitle: "Batch optimization output",
                lines: [
                    { type: "command" as const, text: "endless-guard replay-optimize" },
                    { type: "blank" as const, text: "" },
                    { type: "output" as const, text: "  Batch size: 10 transactions" },
                    { type: "output" as const, text: "  Processing transactions..." },
                    { type: "success" as const, text: "   [ 1/10] transfer 1000 tokens to 0xAlice    ✓" },
                    { type: "success" as const, text: "   [ 2/10] stake 5000 EDS to 0xValidatorA    ✓" },
                    { type: "output" as const, text: "  ..." },
                    { type: "blank" as const, text: "" },
                    { type: "output" as const, text: "  ┌─ Replay Optimization Results" },
                    { type: "output" as const, text: "    Total Transactions:  10" },
                    { type: "output" as const, text: "    Baseline Efficiency: 24.3%" },
                    { type: "success" as const, text: "   Optimized Efficiency: 24.3%" },
                    { type: "success" as const, text: "   Improvement:         +0.00%" },
                    { type: "output" as const, text: "    Conflict Groups:     10" },
                    { type: "blank" as const, text: "" },
                    { type: "output" as const, text: "  Optimized Order:" },
                    { type: "output" as const, text: "     1. [LOW   ] transfer       — 1000 tokens to 0xAlice" },
                    { type: "warning" as const, text: "    2. [HIGH  ] stake          — 5000 EDS to 0xValidatorA" },
                    { type: "output" as const, text: "     3. [LOW   ] transfer       — 500 tokens to 0xBob" },
                ],
            },
        ],
    },
    {
        id: "benchmark",
        label: "benchmark",
        description: "Run 75-transaction benchmark suite",
        usage: "endless-guard benchmark [--output <path>]",
        options: [
            { flag: "--output <path>", desc: "Write Markdown report to file (default: benchmark-report.md)" },
            { flag: "--json", desc: "Output raw JSON result" },
        ],
        examples: [
            {
                subtitle: "Benchmark output",
                lines: [
                    { type: "command" as const, text: "endless-guard benchmark" },
                    { type: "blank" as const, text: "" },
                    { type: "output" as const, text: "  ▶ Low-Value Transfers          ···············  ✓" },
                    { type: "output" as const, text: "  ▶ High-Value Transfers         ··········        ✓" },
                    { type: "output" as const, text: "  ▶ Contract Interactions        ···············  ✓" },
                    { type: "output" as const, text: "  ▶ Governance Operations        ··········        ✓" },
                    { type: "output" as const, text: "  ▶ Mixed AI Batch               ····················  ✓" },
                    { type: "blank" as const, text: "" },
                    { type: "output" as const, text: "  ┌─ Benchmark Summary" },
                    { type: "output" as const, text: "    Transactions Tested:     75" },
                    { type: "output" as const, text: "    Average Gas:             2,243 units" },
                    { type: "output" as const, text: "    Success Rate:            96.0%" },
                    { type: "output" as const, text: "    Conflict Rate:           30.8%" },
                    { type: "output" as const, text: "    Parallel Efficiency:     56.6%" },
                    { type: "output" as const, text: "    Multisig Escalation:     5.3%" },
                    { type: "output" as const, text: "    High-Risk Txns:          32" },
                    { type: "blank" as const, text: "" },
                    { type: "success" as const, text: "   ✓ Benchmark report written to: benchmark-report.md" },
                ],
            },
        ],
    },
    {
        id: "health",
        label: "health",
        description: "Check Endless RPC connectivity",
        usage: "endless-guard health [--rpc-url <url>]",
        options: [
            { flag: "--rpc-url <url>", desc: "Endless RPC endpoint (default: https://rpc.endless.link/v1)" },
            { flag: "--json", desc: "Output raw JSON result" },
        ],
        examples: [
            {
                subtitle: "Live testnet connection",
                lines: [
                    { type: "command" as const, text: "endless-guard health" },
                    { type: "blank" as const, text: "" },
                    { type: "output" as const, text: "  RPC Endpoint: https://rpc.endless.link/v1" },
                    { type: "blank" as const, text: "" },
                    { type: "output" as const, text: "  ┌─ RPC Health Check" },
                    { type: "success" as const, text: "   Status:        🟢  CONNECTED" },
                    { type: "output" as const, text: "    Latency:       286 ms" },
                    { type: "output" as const, text: "    Chain ID:      220" },
                    { type: "output" as const, text: "    Block Height:  70,788,480" },
                ],
            },
        ],
    },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function DocsPage() {
    const [activeCommand, setActiveCommand] = useState(COMMANDS[0]!.id);

    const cmd = COMMANDS.find((c) => c.id === activeCommand) ?? COMMANDS[0]!;

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
            {/* Header */}
            <div className="pt-16 pb-12 border-b border-[#1e1e2e]">
                <p className="section-label mb-3">CLI Documentation</p>
                <h1 className="font-mono text-3xl sm:text-4xl font-bold text-white mb-4">
                    Command Reference
                </h1>
                <p className="text-slate-400 max-w-2xl leading-relaxed">
                    Six purpose-built commands for evaluating, analyzing, and optimizing AI-generated
                    blockchain transactions. All commands support{" "}
                    <code className="font-mono text-xs text-cyan-400 bg-[#111118] border border-[#1e1e2e] px-1.5 py-0.5 rounded">--json</code>{" "}
                    for pipeline integration.
                </p>
            </div>

            {/* Install strip */}
            <div className="py-10 border-b border-[#1e1e2e]">
                <h2 className="font-mono text-sm font-semibold text-slate-300 mb-4">Installation</h2>
                <Terminal
                    title="shell"
                    lines={[
                        { type: "comment", text: "Clone and install" },
                        { type: "command", text: "git clone https://github.com/endless-labs/endless-ai-execution-guard" },
                        { type: "command", text: "cd endless-ai-execution-guard && npm install" },
                        { type: "blank", text: "" },
                        { type: "comment", text: "Run directly with tsx (no build required)" },
                        { type: "command", text: "npx tsx cli/index.ts --help" },
                        { type: "blank", text: "" },
                        { type: "comment", text: "Or link globally" },
                        { type: "command", text: "npm link" },
                        { type: "command", text: "endless-guard --help" },
                    ]}
                    className="max-w-3xl"
                />
            </div>

            {/* Command browser */}
            <div className="py-10 flex flex-col lg:flex-row gap-8">
                {/* Sidebar */}
                <div className="lg:w-56 flex-shrink-0">
                    <p className="font-mono text-xs text-slate-600 uppercase tracking-wider mb-3">Commands</p>
                    <div className="flex flex-row lg:flex-col gap-1 flex-wrap">
                        {COMMANDS.map((c) => (
                            <button
                                key={c.id}
                                onClick={() => setActiveCommand(c.id)}
                                className={`text-left px-3 py-2 rounded-lg font-mono text-sm transition-colors w-full ${activeCommand === c.id
                                        ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                                        : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                                    }`}
                            >
                                {c.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {/* Command header */}
                    <div className="mb-6">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="font-mono text-xl font-bold text-cyan-400">{cmd.label}</span>
                            <span className="text-xs font-mono text-slate-500 border border-[#1e1e2e] bg-[#111118] rounded px-2 py-0.5">
                                {cmd.description}
                            </span>
                        </div>
                        <div className="bg-[#0d0d14] border border-[#1e1e2e] rounded-lg px-4 py-3">
                            <code className="font-mono text-sm text-slate-300">{cmd.usage}</code>
                        </div>
                    </div>

                    {/* Options */}
                    {cmd.options.length > 0 && (
                        <div className="mb-8">
                            <p className="font-mono text-xs text-slate-500 uppercase tracking-wider mb-3">Options</p>
                            <div className="rounded-xl border border-[#1e1e2e] overflow-hidden">
                                {cmd.options.map((opt, i) => (
                                    <div
                                        key={opt.flag}
                                        className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-4 py-3 font-mono text-sm ${i < cmd.options.length - 1 ? "border-b border-[#1e1e2e]" : ""
                                            }`}
                                    >
                                        <code className="text-cyan-400 flex-shrink-0">{opt.flag}</code>
                                        <span className="text-slate-500">{opt.desc}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Examples */}
                    <p className="font-mono text-xs text-slate-500 uppercase tracking-wider mb-3">Examples</p>
                    <div className="flex flex-col gap-5">
                        {cmd.examples.map((ex) => (
                            <div key={ex.subtitle}>
                                <p className="font-mono text-xs text-slate-500 mb-2">
                                    <span className="text-slate-600">▸ </span>{ex.subtitle}
                                </p>
                                <Terminal
                                    title={`endless-guard ${cmd.label}`}
                                    lines={ex.lines}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* SDK usage */}
            <div className="py-12 border-t border-[#1e1e2e]">
                <h2 className="font-mono text-lg font-bold text-white mb-6">TypeScript SDK Usage</h2>
                <div className="grid lg:grid-cols-2 gap-8">
                    <div>
                        <p className="font-mono text-xs text-slate-500 uppercase tracking-wider mb-3">Full Pipeline</p>
                        <Terminal
                            title="app.ts"
                            lines={[
                                { type: "comment", text: "Import the guard" },
                                { type: "output", text: "import { createExecutionGuard }" },
                                { type: "output", text: "  from './lib/index.js';" },
                                { type: "blank", text: "" },
                                { type: "output", text: "const guard = createExecutionGuard({" },
                                { type: "output", text: "  risk: { multisigThreshold: 0.65 }," },
                                { type: "output", text: "  multisig: { defaultRequiredApprovals: 3 }," },
                                { type: "output", text: "});" },
                                { type: "blank", text: "" },
                                { type: "output", text: "const result = await guard.evaluate(" },
                                { type: "output", text: '  "transfer 5000 tokens to 0xBob"' },
                                { type: "output", text: ");" },
                                { type: "blank", text: "" },
                                { type: "output", text: "console.log(result.decision);" },
                                { type: "success", text: "// 'APPROVE'" },
                            ]}
                        />
                    </div>
                    <div>
                        <p className="font-mono text-xs text-slate-500 uppercase tracking-wider mb-3">Individual Modules</p>
                        <Terminal
                            title="custom.ts"
                            lines={[
                                { type: "output", text: "import { IntentParser, RiskEngine }" },
                                { type: "output", text: "  from './lib/index.js';" },
                                { type: "blank", text: "" },
                                { type: "comment", text: "Parse only" },
                                { type: "output", text: "const parser = new IntentParser({" },
                                { type: "output", text: "  largeTransferThreshold: 1000," },
                                { type: "output", text: "});" },
                                { type: "blank", text: "" },
                                { type: "output", text: "const intent = parser.parse(" },
                                { type: "output", text: '  "transfer 5000 tokens to 0xBob"' },
                                { type: "output", text: ");" },
                                { type: "blank", text: "" },
                                { type: "output", text: "// { action: 'transfer'," },
                                { type: "success", text: "//   confidence: 1.0, sensitive: true }" },
                            ]}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
