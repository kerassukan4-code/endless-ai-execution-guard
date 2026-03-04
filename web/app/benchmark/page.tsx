import { ProgressBar, ScenarioRow } from "@/components/ProgressBar";
import { StatCard } from "@/components/FeatureCard";
import { Terminal } from "@/components/Terminal";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Benchmark Results — Endless AI Execution Guard",
    description: "Block-STM efficiency benchmarks across 75 transactions in 5 scenario categories",
};

const SCENARIOS = [
    {
        name: "Low-Value Transfers",
        gas: "935",
        conflictRate: 22.1,
        efficiency: 66.8,
        multisigRate: 0.0,
        description: "20 small transfers (≤100 tokens). Low risk, low conflict — CoinStore keys are account-partitioned.",
        riskLevel: "LOW",
    },
    {
        name: "High-Value Transfers",
        gas: "932",
        conflictRate: 22.1,
        efficiency: 66.8,
        multisigRate: 0.0,
        description: "10 transfers in 10,000–100,000 range. Risk score elevated but sender keys remain account-scoped.",
        riskLevel: "MEDIUM",
    },
    {
        name: "Contract Interactions",
        gas: "4,188",
        conflictRate: 13.5,
        efficiency: 79.8,
        multisigRate: 0.0,
        description: "15 call_contract and deploy operations. Higher gas, but module addresses are unique → low key overlap.",
        riskLevel: "MEDIUM",
    },
    {
        name: "Governance Operations",
        gas: "3,053",
        conflictRate: 76.8,
        efficiency: 0.0,
        multisigRate: 30.0,
        description: "10 governance_vote and governance_propose actions. All write to shared global state → near-total conflict.",
        riskLevel: "HIGH",
    },
    {
        name: "Mixed AI Batch",
        gas: "2,345",
        conflictRate: 33.9,
        efficiency: 52.3,
        multisigRate: 5.0,
        description: "20 realistic mixed instructions from a production AI agent: transfers, stakes, contracts, governance, NFTs.",
        riskLevel: "MIXED",
    },
];

const RISK_COLOR: Record<string, string> = {
    LOW: "bg-green-500/10 text-green-400 border-green-500/20",
    MEDIUM: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    HIGH: "bg-red-500/10 text-red-400 border-red-500/20",
    MIXED: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

export default function BenchmarkPage() {
    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
            {/* Header */}
            <div className="pt-16 pb-12 border-b border-[#1e1e2e]">
                <p className="section-label mb-3">Benchmark</p>
                <h1 className="font-mono text-3xl sm:text-4xl font-bold text-white mb-4">
                    Block-STM Efficiency Report
                </h1>
                <p className="text-slate-400 max-w-2xl leading-relaxed">
                    75 AI-generated transactions across 5 scenario categories, evaluated through the full Guard
                    pipeline using synthetic simulation (no live RPC required). Results expose which action
                    types cause the highest Block-STM conflict rates.
                </p>
                <div className="flex flex-wrap items-center gap-3 mt-5">
                    <span className="flex items-center gap-1.5 text-xs font-mono text-slate-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                        Testnet RPC: rpc.endless.link/v1
                    </span>
                    <span className="text-slate-600 text-xs font-mono">·</span>
                    <span className="text-xs font-mono text-slate-500">Chain ID: 220</span>
                    <span className="text-slate-600 text-xs font-mono">·</span>
                    <span className="text-xs font-mono text-slate-500">75 transactions · 5 scenarios</span>
                </div>
            </div>

            {/* Overview stats */}
            <div className="py-10 border-b border-[#1e1e2e]">
                <h2 className="font-mono text-sm font-semibold text-slate-400 mb-5">Overall Metrics</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatCard label="Transactions Tested" value="75" color="cyan" />
                    <StatCard label="Average Gas" value="2,243" unit="units" color="cyan" />
                    <StatCard label="High-Risk Count" value="32" unit="txns" color="amber" />
                    <StatCard label="Multisig Escalated" value="4" unit="txns" color="amber" />
                </div>
            </div>

            {/* Main metrics with bars */}
            <div className="py-10 border-b border-[#1e1e2e]">
                <h2 className="font-mono text-sm font-semibold text-slate-400 mb-6">Block-STM Efficiency</h2>
                <div className="grid lg:grid-cols-2 gap-10">
                    <div className="flex flex-col gap-6">
                        <ProgressBar
                            label="Parallel Execution Efficiency"
                            value={56.6}
                            color="cyan"
                            sublabel="avg across all scenarios"
                        />
                        <ProgressBar
                            label="Success Rate"
                            value={96.0}
                            color="green"
                            sublabel="transactions that would commit"
                        />
                        <ProgressBar
                            label="Conflict Rate"
                            value={30.8}
                            color="amber"
                            sublabel="write-set overlap probability"
                        />
                        <ProgressBar
                            label="Multisig Escalation Rate"
                            value={5.3}
                            color="amber"
                            sublabel="transactions requiring human approval"
                        />
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-5">
                            <h3 className="font-mono text-xs text-slate-500 uppercase tracking-wider mb-4">
                                Risk Distribution
                            </h3>
                            <div className="flex flex-col gap-3">
                                {[
                                    { label: "LOW risk", count: 27, pct: 36, color: "green" as const },
                                    { label: "MEDIUM risk", count: 16, pct: 21, color: "cyan" as const },
                                    { label: "HIGH risk", count: 28, pct: 37, color: "amber" as const },
                                    { label: "CRITICAL risk", count: 4, pct: 5, color: "red" as const },
                                ].map((r) => (
                                    <div key={r.label} className="flex items-center gap-3">
                                        <span className="font-mono text-xs text-slate-500 w-28">{r.label}</span>
                                        <div className="flex-1 h-1.5 bg-[#1e1e2e] rounded-full">
                                            <div
                                                className={`h-full rounded-full progress-bar-${r.color}`}
                                                style={{ width: `${r.pct}%` }}
                                            />
                                        </div>
                                        <span className="font-mono text-xs text-slate-400 w-6 text-right">{r.count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
                            <p className="font-mono text-xs text-amber-400 uppercase tracking-wider mb-2">Key Insight</p>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                Governance operations write to{" "}
                                <code className="font-mono text-xs text-amber-400">GovernanceProposal::global</code> and{" "}
                                <code className="font-mono text-xs text-amber-400">VotingRecord::global</code> — shared
                                state causes <span className="text-amber-400 font-semibold">76.8% conflict rate</span>{" "}
                                and near-zero parallel efficiency. The guard correctly escalates all governance actions
                                to multisig (30% escalation rate in this category).
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Scenario breakdown table */}
            <div className="py-10 border-b border-[#1e1e2e]">
                <h2 className="font-mono text-sm font-semibold text-slate-400 mb-5">Scenario Breakdown</h2>
                <div className="rounded-xl border border-[#1e1e2e] overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[#1e1e2e] bg-[#0d0d14]">
                                {["Scenario", "Avg Gas", "Conflict Rate", "Parallel Eff.", "Multisig Rate"].map((h) => (
                                    <th key={h} className="py-3 px-4 text-left font-mono text-xs text-slate-600 uppercase tracking-wider">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {SCENARIOS.map((s) => (
                                <ScenarioRow key={s.name} {...s} />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Per-scenario cards */}
            <div className="py-10 border-b border-[#1e1e2e]">
                <h2 className="font-mono text-sm font-semibold text-slate-400 mb-5">Scenario Details</h2>
                <div className="grid md:grid-cols-2 gap-4">
                    {SCENARIOS.map((s) => (
                        <div key={s.name} className="card-base p-5 flex flex-col gap-4">
                            <div className="flex items-start justify-between gap-3">
                                <h3 className="font-mono text-sm font-semibold text-slate-200">{s.name}</h3>
                                <span className={`text-xs font-mono px-2 py-0.5 rounded border flex-shrink-0 ${RISK_COLOR[s.riskLevel]}`}>
                                    {s.riskLevel}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed">{s.description}</p>
                            <div className="flex flex-col gap-2 pt-1">
                                <ProgressBar
                                    label="Conflict Rate"
                                    value={s.conflictRate}
                                    color={s.conflictRate > 50 ? "red" : s.conflictRate > 25 ? "amber" : "green"}
                                    showValue
                                />
                                <ProgressBar
                                    label="Parallel Efficiency"
                                    value={s.efficiency}
                                    color={s.efficiency > 70 ? "green" : s.efficiency > 40 ? "cyan" : "red"}
                                    showValue
                                />
                            </div>
                            <div className="flex gap-4 text-xs font-mono text-slate-600 pt-1 border-t border-[#1e1e2e]">
                                <span>Gas: <span className="text-slate-400">{s.gas}</span></span>
                                <span>Multisig: <span className={s.multisigRate > 0 ? "text-amber-400" : "text-slate-500"}>{s.multisigRate}%</span></span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Block-STM explanation */}
            <div className="py-12 border-b border-[#1e1e2e]">
                <div className="grid lg:grid-cols-2 gap-10 items-start">
                    <div>
                        <h2 className="font-mono text-lg font-bold text-white mb-4">Block-STM Explained</h2>
                        <p className="text-slate-400 text-sm leading-relaxed mb-4">
                            Endless uses <span className="text-cyan-400 font-semibold">Block-STM</span>{" "}
                            (Block Software Transactional Memory) to execute transactions in parallel within each
                            block. Block-STM speculatively runs all transactions simultaneously, then detects
                            write-set conflicts at commit time.
                        </p>
                        <p className="text-slate-400 text-sm leading-relaxed mb-4">
                            When two transactions write to the same storage key, one must{" "}
                            <span className="text-amber-400">abort and re-execute serially</span> — wasting gas
                            and increasing latency. The Guard pre-computes write-set overlap{" "}
                            <em>before</em> submission, so you can reorder batches to minimize aborts.
                        </p>
                        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 mt-4">
                            <p className="font-mono text-xs text-cyan-400 mb-2">Conflict Model</p>
                            <code className="font-mono text-xs text-slate-400 block leading-6">
                                P(conflict) = 1 - (1 - p_key)^(K × (N-1))<br />
                                <span className="text-slate-600">K = storage keys written</span><br />
                                <span className="text-slate-600">N = concurrent transactions in block</span>
                            </code>
                        </div>
                    </div>
                    <div>
                        <p className="font-mono text-xs text-slate-500 uppercase tracking-wider mb-3">Run the Benchmark</p>
                        <Terminal
                            title="terminal"
                            lines={[
                                { type: "comment", text: "Run all 75 scenarios" },
                                { type: "command", text: "endless-guard benchmark" },
                                { type: "blank", text: "" },
                                { type: "comment", text: "Or use the standalone runner" },
                                { type: "command", text: "npx tsx benchmark/run.ts" },
                                { type: "blank", text: "" },
                                { type: "comment", text: "Output is written to:" },
                                { type: "output", text: "benchmark-report.md" },
                                { type: "blank", text: "" },
                                { type: "comment", text: "JSON output for pipeline use" },
                                { type: "command", text: "endless-guard benchmark --json" },
                            ]}
                        />
                    </div>
                </div>
            </div>

            {/* Hot keys reference */}
            <div className="py-12">
                <h2 className="font-mono text-sm font-semibold text-slate-400 mb-5">High-Contention Storage Keys</h2>
                <div className="rounded-xl border border-[#1e1e2e] overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[#1e1e2e] bg-[#0d0d14]">
                                {["Storage Key Pattern", "Action Type", "Conflict Impact"].map((h) => (
                                    <th key={h} className="py-3 px-4 text-left font-mono text-xs text-slate-600 uppercase tracking-wider">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {[
                                {
                                    key: "0x1::endless_governance::GovernanceProposal::global",
                                    action: "governance_propose",
                                    impact: "CRITICAL",
                                    impactColor: "text-red-400",
                                },
                                {
                                    key: "0x1::endless_governance::VotingRecord::global",
                                    action: "governance_vote",
                                    impact: "CRITICAL",
                                    impactColor: "text-red-400",
                                },
                                {
                                    key: "0x1::stake::StakePool::{validator}",
                                    action: "stake / unstake",
                                    impact: "HIGH",
                                    impactColor: "text-amber-400",
                                },
                                {
                                    key: "0x1::delegation_pool::DelegationPool::{validator}",
                                    action: "stake",
                                    impact: "HIGH",
                                    impactColor: "text-amber-400",
                                },
                                {
                                    key: "0x3::token::Collections::global",
                                    action: "mint_nft",
                                    impact: "MEDIUM",
                                    impactColor: "text-yellow-400",
                                },
                                {
                                    key: "0x1::account::Account::{sender}",
                                    action: "all (sequence_number)",
                                    impact: "LOW",
                                    impactColor: "text-green-400",
                                },
                            ].map((row, i) => (
                                <tr
                                    key={row.key}
                                    className={`border-b border-[#1e1e2e] hover:bg-white/[0.02] transition-colors`}
                                >
                                    <td className="py-3 px-4">
                                        <code className="font-mono text-xs text-slate-400">{row.key}</code>
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className="font-mono text-xs text-slate-500">{row.action}</span>
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className={`font-mono text-xs font-bold ${row.impactColor}`}>{row.impact}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
