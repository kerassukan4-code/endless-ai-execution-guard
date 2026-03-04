import { ArchitectureDiagram } from "@/components/ArchitectureDiagram";
import { Terminal } from "@/components/Terminal";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Architecture — Endless AI Execution Guard",
    description: "Pipeline architecture: Intent Parser → Simulation → Block-STM Conflict Analysis → Risk Engine → Multisig Guardrail",
};

const MODULES = [
    {
        id: "intent",
        name: "Intent Parser",
        path: "lib/intent-parser/parser.ts",
        color: "border-blue-500/40 bg-blue-500/5",
        accent: "text-blue-400",
        dotColor: "bg-blue-400",
        description:
            "Converts raw natural language from an AI agent into a structured ParsedIntent object. Uses a priority-ordered set of regular expression patterns to identify the action type (transfer, stake, deploy, governance, etc.) and extract entities — amount, target address, module path, function name.",
        inputs: ["Raw string from AI agent"],
        outputs: ["ParsedIntent: action, amount, target, confidence, sensitive"],
        details: [
            { label: "Patterns", value: "9 action types, priority-ordered (governance first)" },
            { label: "Confidence", value: "0.6 base + 0.4 × extractor satisfaction rate" },
            { label: "Sensitivity", value: "Flags large transfers, contract ops, governance, burns" },
            { label: "Fallback", value: "action = 'unknown' → always REJECT downstream" },
        ],
        codeExample: [
            { type: "command" as const, text: 'parser.parse("transfer 5000 tokens to 0xBob")' },
            { type: "blank" as const, text: "" },
            { type: "output" as const, text: "{ action: 'transfer'," },
            { type: "output" as const, text: "  amount:  5000," },
            { type: "output" as const, text: "  target:  '0xBob'," },
            { type: "output" as const, text: "  sensitive: true," },
            { type: "output" as const, text: "  confidence: 1.0 }" },
        ],
    },
    {
        id: "simulation",
        name: "Simulation Engine",
        path: "lib/simulation/engine.ts",
        color: "border-violet-500/40 bg-violet-500/5",
        accent: "text-violet-400",
        dotColor: "bg-violet-400",
        description:
            "Translates the ParsedIntent into an Endless Move transaction payload and submits it to the RPC simulation endpoint. Returns gas estimate, write-set keys (storage slots accessed), and predicted VM status. Falls back to a deterministic synthetic model when the RPC is unavailable — allowing full pipeline operation in offline or CI environments.",
        inputs: ["ParsedIntent"],
        outputs: ["SimulationResult: gasEstimate, writeSetSize, storageKeys, predictedStatus"],
        details: [
            { label: "Live mode", value: "POST /v1/transactions/simulate — Endless RPC" },
            { label: "Offline mode", value: "Deterministic synthetic model with action-based gas tables" },
            { label: "Payload types", value: "entry_function_payload for all standard actions" },
            { label: "Retry logic", value: "3 attempts, exponential backoff, graceful degradation" },
        ],
        codeExample: [
            { type: "command" as const, text: "engine.simulate(intent)" },
            { type: "blank" as const, text: "" },
            { type: "output" as const, text: "{ gasEstimate: 801," },
            { type: "output" as const, text: "  writeSetSize: 3," },
            { type: "output" as const, text: "  predictedStatus: 'success'," },
            { type: "output" as const, text: "  storageKeys: [" },
            { type: "output" as const, text: "    '0x1::account::Account::...'," },
            { type: "output" as const, text: "    '0x1::coin::CoinStore::...' ] }" },
        ],
    },
    {
        id: "conflict",
        name: "Block-STM Conflict Analyzer",
        path: "lib/conflict-analysis/estimator.ts",
        color: "border-amber-500/40 bg-amber-500/5",
        accent: "text-amber-400",
        dotColor: "bg-amber-400",
        description:
            "Analyzes the write-set from simulation to estimate the probability that this transaction will conflict with concurrent transactions in the same Endless block. Endless uses Block-STM — speculative parallel execution with optimistic-concurrency commit. Conflicting write-sets cause transaction aborts and serial re-execution, degrading throughput.",
        inputs: ["SimulationResult (storageKeys)"],
        outputs: ["ConflictAnalysis: conflictProbability, parallelEfficiencyScore, hotKeys"],
        details: [
            { label: "Model", value: "P(conflict) = 1 - (1 - p_key)^(K × (N-1))" },
            { label: "Hot keys", value: "GovernanceProposal, StakePool, DelegationPool auto-boosted" },
            { label: "Concurrency N", value: "Estimated from configurable block txn count (default: 50)" },
            { label: "Efficiency", value: "max(0, 1 - abort_rate × 1.5)" },
        ],
        codeExample: [
            { type: "command" as const, text: "estimator.analyze(simulation)" },
            { type: "blank" as const, text: "" },
            { type: "output" as const, text: "{ conflictProbability:     0.221," },
            { type: "output" as const, text: "  parallelEfficiencyScore: 0.668," },
            { type: "output" as const, text: "  hotKeys:                 []," },
            { type: "output" as const, text: "  worstCaseLatencyMs:      2 }" },
        ],
    },
    {
        id: "risk",
        name: "Risk Engine",
        path: "lib/risk-engine/engine.ts",
        color: "border-orange-500/40 bg-orange-500/5",
        accent: "text-orange-400",
        dotColor: "bg-orange-400",
        description:
            "Calculates a composite risk score [0.0–1.0] from 8 weighted factors. Factors are evaluated independently against the parsed intent, simulation result, and conflict analysis. The composite score determines routing: APPROVE, ESCALATE_MULTISIG, or REJECT. The multisig escalation threshold and rejection threshold are both configurable.",
        inputs: ["ParsedIntent + SimulationResult + ConflictAnalysis"],
        outputs: ["RiskAssessment: riskScore, riskLevel, requiresMultisig, factors[]"],
        details: [
            { label: "Transfer Size", value: "25% weight — scales with amount / threshold" },
            { label: "Contract Interaction", value: "20% weight — call_contract or deploy" },
            { label: "Storage Conflict", value: "15% weight — from ConflictAnalysis" },
            { label: "AI Uncertainty", value: "10% weight — 1 - confidence" },
            { label: "Governance", value: "15% weight — governance_vote / propose" },
            { label: "Multisig threshold", value: "Default: 0.65 (configurable)" },
        ],
        codeExample: [
            { type: "command" as const, text: "engine.calculateRiskScore(intent, sim, conflict)" },
            { type: "blank" as const, text: "" },
            { type: "output" as const, text: "{ riskScore:       0.660," },
            { type: "output" as const, text: "  riskLevel:       'HIGH'," },
            { type: "output" as const, text: "  requiresMultisig: true," },
            { type: "output" as const, text: "  recommendation:  'ESCALATE: ...' }" },
        ],
    },
    {
        id: "multisig",
        name: "Multisig Guardrail",
        path: "lib/multisig/guardrail.ts",
        color: "border-cyan-500/40 bg-cyan-500/5",
        accent: "text-cyan-400",
        dotColor: "bg-cyan-400",
        description:
            "Manages the multisig proposal lifecycle for high-risk AI transactions. When risk score ≥ 0.65, a proposal is created containing the full intent, simulation, conflict analysis, and risk assessment. Human operators approve or reject the proposal. Once the signature threshold is met, the transaction can be submitted. Expired proposals are automatically blocked.",
        inputs: ["ParsedIntent + RiskAssessment (when requiresMultisig = true)"],
        outputs: ["MultisigProposal: proposalId, status, requiredApprovals, currentApprovals"],
        details: [
            { label: "Score 0.85+", value: "5 required signers" },
            { label: "Score 0.75+", value: "4 required signers" },
            { label: "Score 0.65+", value: "3 required signers" },
            { label: "TTL", value: "24 hours (configurable) — auto-expires to EXPIRED" },
            { label: "Immutability", value: "Payload is frozen at creation — no modification allowed" },
        ],
        codeExample: [
            { type: "command" as const, text: "guardrail.approve(proposalId, signerAddress)" },
            { type: "blank" as const, text: "" },
            { type: "output" as const, text: "{ proposalId: 'f3a9-4c21-8d07'," },
            { type: "output" as const, text: "  status: 'APPROVED'," },
            { type: "output" as const, text: "  currentApprovals: ['0xAlice', '0xBob', '0xCarol']," },
            { type: "output" as const, text: "  requiredApprovals: 3 }" },
        ],
    },
];

export default function ArchitecturePage() {
    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
            {/* Header */}
            <div className="pt-16 pb-12 border-b border-[#1e1e2e]">
                <p className="section-label mb-3">Architecture</p>
                <h1 className="font-mono text-3xl sm:text-4xl font-bold text-white mb-4">
                    5-Step Safety Pipeline
                </h1>
                <p className="text-slate-400 max-w-2xl leading-relaxed">
                    Every AI-generated instruction passes through five deterministic verification stages before
                    any on-chain action is permitted. Each stage is an independent, composable TypeScript module
                    with typed inputs and outputs.
                </p>
            </div>

            {/* Two-column: diagram + principles */}
            <div className="py-16 grid lg:grid-cols-2 gap-16 items-start border-b border-[#1e1e2e]">
                <div>
                    <h2 className="font-mono text-lg font-semibold text-white mb-6">Pipeline Overview</h2>
                    <ArchitectureDiagram />
                </div>
                <div className="flex flex-col gap-6">
                    <h2 className="font-mono text-lg font-semibold text-white">Design Principles</h2>
                    {[
                        {
                            title: "Offline-first",
                            body: "Every module operates with a synthetic fallback. The full pipeline runs without any network access — ideal for CI/CD, airgapped environments, and local development.",
                            icon: "⊡",
                            color: "text-cyan-400",
                        },
                        {
                            title: "Type-safe boundaries",
                            body: "All module interfaces are defined in lib/types.ts. No `any` types cross module boundaries. TypeScript strict mode enforced throughout.",
                            icon: "⟨/⟩",
                            color: "text-blue-400",
                        },
                        {
                            title: "Composable modules",
                            body: "Use the full guard.ts pipeline or drop individual modules into your existing stack. Each module is independently instantiable and configurable.",
                            icon: "◈",
                            color: "text-violet-400",
                        },
                        {
                            title: "Block-STM aware",
                            body: "Conflict analysis is specifically calibrated to Endless's Block-STM parallel execution model. Hot key detection reflects real Endless module storage patterns.",
                            icon: "⊘",
                            color: "text-amber-400",
                        },
                    ].map((p) => (
                        <div key={p.title} className="flex gap-4">
                            <div className={`w-8 h-8 rounded-lg bg-[#111118] border border-[#1e1e2e] flex items-center justify-center font-mono text-sm flex-shrink-0 ${p.color}`}>
                                {p.icon}
                            </div>
                            <div>
                                <h3 className="font-mono text-sm font-semibold text-slate-200 mb-1">{p.title}</h3>
                                <p className="text-sm text-slate-500 leading-relaxed">{p.body}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Module deep dives */}
            <div className="py-16">
                <h2 className="font-mono text-xl font-bold text-white mb-2">Module Reference</h2>
                <p className="text-slate-500 text-sm mb-12 max-w-xl">
                    Each module below describes its inputs, outputs, internal model, and a code example.
                </p>

                <div className="flex flex-col gap-10">
                    {MODULES.map((mod, idx) => (
                        <div key={mod.id} className={`rounded-2xl border ${mod.color} overflow-hidden`}>
                            {/* Module header */}
                            <div className="px-6 py-5 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <span className="w-7 h-7 rounded-full border border-white/10 bg-black/30 flex items-center justify-center font-mono text-xs text-slate-400">
                                        {idx + 1}
                                    </span>
                                    <div>
                                        <h3 className={`font-mono text-base font-bold ${mod.accent}`}>{mod.name}</h3>
                                        <code className="font-mono text-xs text-slate-600">{mod.path}</code>
                                    </div>
                                </div>
                                <div className="flex gap-4 text-xs font-mono">
                                    <div>
                                        <span className="text-slate-600">IN </span>
                                        <span className="text-slate-400">{mod.inputs[0]}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 grid lg:grid-cols-2 gap-8">
                                {/* Description + details */}
                                <div className="flex flex-col gap-5">
                                    <p className="text-sm text-slate-400 leading-relaxed">{mod.description}</p>

                                    <div>
                                        <p className="font-mono text-xs text-slate-500 uppercase tracking-wider mb-3">Implementation Details</p>
                                        <div className="flex flex-col gap-2">
                                            {mod.details.map((d) => (
                                                <div key={d.label} className="flex gap-2 text-xs font-mono">
                                                    <span className="text-slate-600 flex-shrink-0 w-36">{d.label}</span>
                                                    <span className="text-slate-400">{d.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        {mod.outputs.map((o) => (
                                            <span key={o} className="text-xs font-mono bg-black/20 border border-white/5 rounded px-2 py-1 text-slate-500">
                                                ↳ {o}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Code example */}
                                <div>
                                    <Terminal
                                        title={mod.path.split("/").pop() ?? "example"}
                                        lines={mod.codeExample}
                                        className="text-xs"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Data types callout */}
            <div className="py-12 border-t border-[#1e1e2e]">
                <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-6">
                    <div className="flex items-start gap-4">
                        <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 flex-shrink-0">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="font-mono text-sm font-semibold text-slate-200 mb-2">Shared Type Definitions</h3>
                            <p className="text-sm text-slate-500 leading-relaxed mb-3">
                                All interfaces — <code className="font-mono text-cyan-400 text-xs">ParsedIntent</code>,{" "}
                                <code className="font-mono text-cyan-400 text-xs">SimulationResult</code>,{" "}
                                <code className="font-mono text-cyan-400 text-xs">ConflictAnalysis</code>,{" "}
                                <code className="font-mono text-cyan-400 text-xs">RiskAssessment</code>,{" "}
                                <code className="font-mono text-cyan-400 text-xs">GuardResult</code>, and more — are defined in a single source of truth.
                            </p>
                            <code className="font-mono text-xs text-slate-400 bg-[#0d0d14] border border-[#1e1e2e] rounded px-3 py-2 block">
                                lib/types.ts — 216 lines · 12 core interfaces
                            </code>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
