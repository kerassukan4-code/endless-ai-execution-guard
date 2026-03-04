import Link from "next/link";
import { Terminal } from "@/components/Terminal";
import { FeatureCard } from "@/components/FeatureCard";

const HERO_TERMINAL_LINES = [
  { type: "comment" as const, text: "endless-ai-execution-guard v1.0.0" },
  { type: "blank" as const, text: "" },
  { type: "command" as const, text: 'endless-guard simulate "transfer 50000 tokens to 0xWhale"' },
  { type: "blank" as const, text: "" },
  { type: "output" as const, text: "  Intent:   TRANSFER  ·  Sensitive: TRUE ⚠" },
  { type: "output" as const, text: "  Amount:   50,000 tokens  →  0xWhale" },
  { type: "output" as const, text: "  Gas Est:  918 units" },
  { type: "output" as const, text: "  Conflict: 22.1% (moderate)" },
  { type: "output" as const, text: "  Risk:     0.588 · HIGH" },
  { type: "blank" as const, text: "" },
  { type: "warning" as const, text: "MULTISIG ESCALATION REQUIRED" },
  { type: "output" as const, text: "  Proposal: f3a9-4c21-8d07  ·  Requires: 3 approvals" },
  { type: "output" as const, text: "  Expires:  2026-03-05T08:41:11Z" },
];

const FEATURES = [
  {
    icon: <ParseIcon />,
    title: "Intent Parser",
    description:
      "Converts natural language AI instructions into structured blockchain actions with regex pattern matching and confidence scoring.",
    badge: "NLP",
    module: "lib/intent-parser/parser.ts",
  },
  {
    icon: <SimIcon />,
    title: "Simulation Engine",
    description:
      "Translates parsed intents into Move transaction payloads and simulates them against the Endless RPC. Falls back to deterministic synthetic model offline.",
    badge: "RPC",
    module: "lib/simulation/engine.ts",
  },
  {
    icon: <ConflictIcon />,
    title: "Block-STM Conflict Analyzer",
    description:
      "Estimates write-set conflict probability using a probabilistic model aligned with Endless's parallel execution architecture. Detects hot storage keys.",
    badge: "Block-STM",
    badgeColor: "amber" as const,
    module: "lib/conflict-analysis/estimator.ts",
  },
  {
    icon: <RiskIcon />,
    title: "Risk Engine",
    description:
      "Calculates a composite risk score (0.0–1.0) from 8 weighted factors: transfer size, contract interaction, AI confidence, governance, gas cost, and more.",
    badge: "Scoring",
    module: "lib/risk-engine/engine.ts",
  },
  {
    icon: <MultisigIcon />,
    title: "Multisig Guardrail",
    description:
      "Manages the full proposal lifecycle for high-risk transactions: create → approve → execute. Scales required signers (3–5) based on risk score.",
    badge: "Safety",
    badgeColor: "green" as const,
    module: "lib/multisig/guardrail.ts",
  },
  {
    icon: <ReplayIcon />,
    title: "Replay Analyzer",
    description:
      "Applies greedy graph-coloring to reorder AI transaction batches and minimize Block-STM conflict aborts. Computes efficiency improvement vs. naive ordering.",
    badge: "Optimizer",
    badgeColor: "amber" as const,
    module: "lib/replay/analyzer.ts",
  },
];

const RISKS = [
  {
    icon: <AlertIcon />,
    title: "Unsafe Execution",
    body: "LLM hallucinations produce plausible but incorrect payloads — wrong addresses, invalid amounts, fabricated module paths. These are undetectable without simulation.",
    color: "border-red-500/30 bg-red-500/5",
    iconColor: "text-red-400 bg-red-500/10 border-red-500/20",
  },
  {
    icon: <ContractIcon />,
    title: "Unpredictable Contract Behaviour",
    body: "AI-generated call_contract instructions may target vulnerable functions or pass malformed arguments. No LLM can guarantee Move contract invariants.",
    color: "border-orange-500/30 bg-orange-500/5",
    iconColor: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  },
  {
    icon: <ConflictWarningIcon />,
    title: "Block-STM Storage Conflicts",
    body: "Concurrent AI transactions writing to the same storage keys (governance global state, shared stake pools) cause speculative abort cycles, wasting gas and degrading throughput.",
    color: "border-amber-500/30 bg-amber-500/5",
    iconColor: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  },
  {
    icon: <OrderIcon />,
    title: "Inefficient Transaction Ordering",
    body: "Naive AI batches submit transactions in generation order, ignoring write-set dependencies. Optimal ordering — computed from conflict graphs — can reduce abort rates by 30–80%.",
    color: "border-yellow-500/30 bg-yellow-500/5",
    iconColor: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  },
  {
    icon: <GovernanceIcon />,
    title: "Governance Manipulation",
    body: "An autonomous AI agent can quietly submit governance proposals or cast votes without human review — altering protocol-level parameters with no oversight.",
    color: "border-violet-500/30 bg-violet-500/5",
    iconColor: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  },
  {
    icon: <ConfidenceIcon />,
    title: "Low-Confidence Parses",
    body: "Ambiguous or novel phrasings produce low-confidence intent parses. Executing a 60%-confidence parse of a high-value transfer is a critical risk. Confidence must gate execution.",
    color: "border-slate-500/30 bg-slate-500/5",
    iconColor: "text-slate-400 bg-slate-500/10 border-slate-500/20",
  },
];

const WORKFLOW_STEPS = [
  {
    actor: "Developer",
    action: "Defines an AI agent policy and authorised action scope",
    detail: "e.g. max transfer 1,000 EDS · no governance · whitelist of contracts",
    color: "border-slate-500/40 text-slate-300",
    dot: "bg-slate-400",
  },
  {
    actor: "AI Agent",
    action: "Generates natural language blockchain instruction",
    detail: '"transfer 5000 tokens to 0xBob"',
    color: "border-blue-500/40 text-blue-300",
    dot: "bg-blue-400",
    mono: true,
  },
  {
    actor: "endless-guard simulate",
    action: "Full pipeline: parse → simulate → conflict → risk → route",
    detail: "result: APPROVE | ESCALATE_MULTISIG | REJECT",
    color: "border-cyan-500/40 text-cyan-300",
    dot: "bg-cyan-400",
    code: true,
  },
  {
    actor: "Risk Gate",
    action: "Score ≥ 0.65 → multisig proposal created · score ≥ 0.90 → auto-reject",
    detail: "Human signers review proposal before any keys are touched",
    color: "border-amber-500/40 text-amber-300",
    dot: "bg-amber-400",
  },
  {
    actor: "Multisig Approval",
    action: "N-of-M human signers approve the proposal within TTL window",
    detail: "3–5 signatures required depending on risk score",
    color: "border-green-500/40 text-green-300",
    dot: "bg-green-400",
  },
  {
    actor: "Endless RPC",
    action: "Transaction submitted to Endless network for on-chain execution",
    detail: "Only reaches this stage after all guards pass",
    color: "border-slate-600/40 text-slate-400",
    dot: "bg-slate-500",
  },
];

const SAFETY_STAGES = [
  {
    num: "01",
    name: "Intent Parsing",
    module: "lib/intent-parser/",
    description:
      "Natural language is matched against priority-ordered regex patterns. A confidence score [0–1] is assigned. Unknown actions are immediately rejected.",
    check: "Rejects ambiguous or unrecognised instructions",
    color: "text-blue-400",
    border: "border-blue-500/30",
    bg: "bg-blue-500/5",
  },
  {
    num: "02",
    name: "Simulation",
    module: "lib/simulation/",
    description:
      "The parsed intent is translated into a Move transaction payload and dry-run against the Endless RPC. Gas estimate and write-set are captured.",
    check: "Detects transactions that would abort before any keys are signed",
    color: "text-violet-400",
    border: "border-violet-500/30",
    bg: "bg-violet-500/5",
  },
  {
    num: "03",
    name: "Conflict Analysis",
    module: "lib/conflict-analysis/",
    description:
      "Write-set keys from simulation are scored against a probabilistic Block-STM conflict model. Hot global keys (governance, stake pools) are flagged automatically.",
    check: "Quantifies throughput impact before submission",
    color: "text-amber-400",
    border: "border-amber-500/30",
    bg: "bg-amber-500/5",
  },
  {
    num: "04",
    name: "Risk Scoring",
    module: "lib/risk-engine/",
    description:
      "Eight weighted factors produce a composite risk score. Factors include transfer size, contract interaction, AI confidence, governance, conflict rate, gas cost, and sensitivity flags.",
    check: "Single numerical score routes to APPROVE · ESCALATE · REJECT",
    color: "text-orange-400",
    border: "border-orange-500/30",
    bg: "bg-orange-500/5",
  },
  {
    num: "05",
    name: "Multisig Guardrail",
    module: "lib/multisig/",
    description:
      "High-risk transactions create an immutable proposal. The payload is frozen at creation. Required signatures scale from 3 to 5 based on risk score. Proposals expire after 24 hours.",
    check: "Human operators are the final authority on high-risk execution",
    color: "text-cyan-400",
    border: "border-cyan-500/30",
    bg: "bg-cyan-500/5",
  },
];

export default function HomePage() {
  return (
    <>
      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-grid">
        <div className="absolute inset-0 bg-hero-gradient pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-cyan-500/5 blur-3xl rounded-full pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24">
          {/* Badge */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/5 text-xs font-mono text-cyan-400">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Endless Developer Tooling · v1.0.0
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-6">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-mono font-bold tracking-tight text-white mb-4">
              Endless AI{" "}
              <span className="text-gradient-cyan">Execution Guard</span>
            </h1>
            <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
              AI-safe execution framework for the Endless blockchain ecosystem.
            </p>
            <p className="text-sm text-slate-500 max-w-xl mx-auto mt-3 leading-relaxed">
              A CLI developer tool that sits between your AI agent and the Endless network —
              validating, simulating, and gating every AI-generated transaction before execution.
            </p>
          </div>

          {/* CTA buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-14">
            <Link href="/architecture" className="btn-primary">
              View Architecture →
            </Link>
            <Link href="/docs" className="btn-secondary">
              CLI Reference
            </Link>
            <a
              href="https://github.com/endless-labs/endless-ai-execution-guard"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              <GitHubIcon />
              GitHub
            </a>
          </div>

          {/* Hero terminal */}
          <div className="max-w-3xl mx-auto">
            <Terminal
              title="endless-guard · simulate"
              lines={HERO_TERMINAL_LINES}
              className="shadow-glow-cyan"
            />
          </div>
        </div>
      </section>

      {/* ── Stats strip ─────────────────────────────────────────────────── */}
      <section className="border-y border-[#1e1e2e] bg-[#0d0d14]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x-0 md:divide-x divide-y md:divide-y-0 divide-[#1e1e2e]">
            {[
              { label: "Transactions / Benchmark", value: "75", unit: "txns" },
              { label: "Parallel Efficiency", value: "56.6", unit: "%" },
              { label: "Avg Risk Score", value: "0.365", unit: "" },
              { label: "Testnet Chain ID", value: "220", unit: "" },
            ].map((stat) => (
              <div key={stat.label} className="px-0 md:px-8 py-4 md:py-0 first:pl-0 last:pr-0">
                <p className="font-mono text-2xl font-bold text-cyan-400">
                  {stat.value}
                  {stat.unit && <span className="text-sm text-slate-500 ml-1">{stat.unit}</span>}
                </p>
                <p className="font-mono text-xs text-slate-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TASK 1: Why AI Execution Needs Guardrails ───────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-24">
        <div className="max-w-3xl mb-14">
          <p className="section-label mb-3">The Problem</p>
          <h2 className="font-mono text-3xl font-bold text-white mb-5 leading-tight">
            Why AI Execution Needs Guardrails
          </h2>
          <p className="text-slate-400 leading-relaxed mb-4">
            AI agents can autonomously generate and submit blockchain transactions — including token
            transfers, governance proposals, contract deployments, and NFT operations. This automation
            offers significant leverage, but introduces a class of failure modes that does not exist
            with human-authored transactions.
          </p>
          <p className="text-slate-500 text-sm leading-relaxed">
            Without a deterministic safety layer between the AI agent and the network, any one
            of the following failure modes can silently execute on-chain.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {RISKS.map((risk) => (
            <div
              key={risk.title}
              className={`rounded-xl border p-5 flex flex-col gap-3 ${risk.color}`}
              style={{ transition: "border-color 0.2s" }}
            >
              <div className={`w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 ${risk.iconColor}`}>
                {risk.icon}
              </div>
              <div>
                <h3 className="font-mono text-sm font-semibold text-slate-100 mb-1.5">
                  {risk.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">{risk.body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Resolution callout */}
        <div className="mt-10 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-6 flex flex-col sm:flex-row items-start gap-4">
          <div className="w-9 h-9 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0">
            <ShieldCheckIcon />
          </div>
          <div>
            <p className="font-mono text-sm font-semibold text-cyan-300 mb-1">
              Endless AI Execution Guard provides the missing safety layer
            </p>
            <p className="text-sm text-slate-400 leading-relaxed">
              Every AI-generated instruction passes through a five-stage deterministic pipeline —
              intent parsing, simulation, Block-STM conflict analysis, risk scoring, and multisig
              gating — before any on-chain action is permitted. The pipeline is stateless, offline-capable,
              and composable with your existing Endless toolchain.
            </p>
          </div>
        </div>
      </section>

      {/* ── TASK 2: Developer Workflow ───────────────────────────────────── */}
      <section className="border-t border-[#1e1e2e] bg-[#0d0d14] py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            {/* Text side */}
            <div>
              <p className="section-label mb-3">Developer Workflow</p>
              <h2 className="font-mono text-3xl font-bold text-white mb-5 leading-tight">
                From AI instruction to safe execution
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                The Guard integrates into your existing AI agent pipeline as a pre-execution hook.
                No keys leave your environment. The tool performs read-only RPC queries and
                deterministic local analysis — only the final approved transaction touches the network.
              </p>
              <div className="flex flex-col gap-2 text-sm">
                {[
                  { label: "No private keys required", desc: "Guard operates read-only on the RPC" },
                  { label: "Offline-capable", desc: "Synthetic simulation mode for CI/CD" },
                  { label: "Composable", desc: "Use the full pipeline or individual modules" },
                  { label: "TypeScript native", desc: "Drop directly into any Node.js AI agent" },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-3 py-2 border-b border-[#1e1e2e] last:border-0">
                    <span className="text-green-400 mt-0.5 flex-shrink-0">
                      <CheckIcon />
                    </span>
                    <div>
                      <span className="font-mono text-slate-300 text-xs font-semibold">{item.label}</span>
                      <span className="text-slate-600 text-xs"> — {item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pipeline diagram */}
            <div>
              <div className="flex flex-col items-start gap-0">
                {WORKFLOW_STEPS.map((step, i) => (
                  <div key={step.actor} className="flex gap-4 w-full">
                    {/* Spine */}
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className={`w-3 h-3 rounded-full border-2 mt-5 ${step.dot} border-[#0d0d14] flex-shrink-0`} />
                      {i < WORKFLOW_STEPS.length - 1 && (
                        <div className="w-px flex-1 bg-[#2a2a3e] min-h-[36px]" />
                      )}
                    </div>
                    {/* Card */}
                    <div className={`flex-1 mb-2 border rounded-xl px-4 py-3 ${step.color}`}>
                      <div className="flex items-center gap-2 mb-0.5">
                        {step.code ? (
                          <code className="font-mono text-xs font-bold">{step.actor}</code>
                        ) : (
                          <span className="font-mono text-xs font-bold">{step.actor}</span>
                        )}
                      </div>
                      <p className="font-mono text-xs opacity-70 leading-relaxed">{step.action}</p>
                      <p className={`font-mono text-[10px] opacity-40 mt-0.5 ${step.mono ? "italic" : ""}`}>
                        {step.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TASK 3: Execution Safety Model ──────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-24">
        <div className="text-center mb-16">
          <p className="section-label mb-3">Safety Model</p>
          <h2 className="font-mono text-3xl font-bold text-white mb-4">
            Execution Safety Model
          </h2>
          <p className="text-slate-500 text-sm max-w-lg mx-auto leading-relaxed">
            Every AI instruction must pass through five deterministic verification stages.
            Each gate is a typed TypeScript module with a single, well-defined responsibility.
            Failure at any stage halts execution.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SAFETY_STAGES.map((stage) => (
            <div
              key={stage.num}
              className={`rounded-xl border p-5 flex flex-col gap-3 ${stage.border} ${stage.bg}`}
            >
              <div className="flex items-center justify-between">
                <span className={`font-mono text-3xl font-bold opacity-20 ${stage.color}`}>
                  {stage.num}
                </span>
                <code className="font-mono text-[10px] text-slate-600">{stage.module}</code>
              </div>
              <div>
                <h3 className={`font-mono text-sm font-bold mb-1.5 ${stage.color}`}>
                  {stage.name}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">{stage.description}</p>
              </div>
              <div className="flex items-start gap-2 pt-2 border-t border-white/5 mt-auto">
                <span className="text-green-400 mt-0.5 flex-shrink-0">
                  <CheckIcon />
                </span>
                <p className="text-xs text-slate-600 font-mono">{stage.check}</p>
              </div>
            </div>
          ))}

          {/* Summary card spanning full width on md */}
          <div className="md:col-span-2 lg:col-span-3 rounded-xl border border-[#1e1e2e] bg-[#111118] px-6 py-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
              <div>
                <p className="font-mono text-xs text-slate-500 mb-1">Pipeline result</p>
                <p className="font-mono text-sm text-slate-300">
                  Every stage produces a typed result that feeds the next. The final{" "}
                  <code className="text-cyan-400">GuardResult</code> contains the decision and the
                  complete audit trail: confidence, gas estimate, conflict probability, risk score,
                  and all contributing factors.
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {[
                  { label: "APPROVE", color: "text-green-400 border-green-500/30 bg-green-500/5" },
                  { label: "ESCALATE", color: "text-amber-400 border-amber-500/30 bg-amber-500/5" },
                  { label: "REJECT", color: "text-red-400 border-red-500/30 bg-red-500/5" },
                ].map((d) => (
                  <span
                    key={d.label}
                    className={`font-mono text-xs px-2.5 py-1.5 rounded-lg border font-bold ${d.color}`}
                  >
                    {d.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Install section ──────────────────────────────────────────────── */}
      <section className="border-t border-[#1e1e2e] bg-[#0d0d14] py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col lg:flex-row gap-12 items-start">
            <div className="flex-1">
              <p className="section-label mb-3">Get Started</p>
              <h2 className="font-mono text-2xl font-bold text-white mb-4">
                Up and running in seconds
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                No wallet required. No private keys. The Guard operates as a local CLI tool — it reads
                the live Endless RPC to simulate transactions, then routes them through the safety
                pipeline before any secrets are touched.
              </p>
              <div className="flex flex-col gap-3 text-sm font-mono text-slate-400">
                {[
                  { step: "1", label: "Clone the repository" },
                  { step: "2", label: "Install dependencies" },
                  { step: "3", label: "Run the CLI" },
                ].map((item) => (
                  <div key={item.step} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-xs flex items-center justify-center font-bold flex-shrink-0">
                      {item.step}
                    </span>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 w-full">
              <Terminal
                title="install"
                lines={[
                  { type: "command", text: "git clone github.com/endless-labs/endless-ai-execution-guard" },
                  { type: "command", text: "cd endless-ai-execution-guard && npm install" },
                  { type: "blank", text: "" },
                  { type: "comment", text: "Run against the live Endless testnet RPC" },
                  { type: "command", text: 'npx tsx cli/index.ts simulate "transfer 500 tokens to 0xBob"' },
                  { type: "blank", text: "" },
                  { type: "success", text: "APPROVED — Transaction cleared for execution" },
                ]}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Modules grid ─────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-12">
          <p className="section-label mb-3">Modules</p>
          <h2 className="font-mono text-2xl font-bold text-white mb-3">
            Seven independent, composable modules
          </h2>
          <p className="text-slate-500 text-sm max-w-lg mx-auto">
            Use the full pipeline or drop individual modules into your existing Endless toolchain.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </section>

      {/* ── TASK 4: Built for Endless Developers ────────────────────────── */}
      <section className="border-t border-[#1e1e2e] bg-[#0d0d14] py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div>
              <p className="section-label mb-3">CLI Tool</p>
              <h2 className="font-mono text-3xl font-bold text-white mb-5 leading-tight">
                Built for Endless Developers
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed mb-8">
                Every command is a focused, composable analysis tool. Pipe results into your
                scripts, use <code className="font-mono text-cyan-400 text-xs">--json</code> for
                machine-readable output, or consume the TypeScript SDK directly from your agent codebase.
              </p>

              <div className="grid grid-cols-2 gap-3 mb-8">
                {[
                  { cmd: "simulate", desc: "Full 5-stage pipeline", accent: "cyan" },
                  { cmd: "risk-score", desc: "Risk scoring only", accent: "orange" },
                  { cmd: "conflict-check", desc: "Block-STM analysis", accent: "amber" },
                  { cmd: "replay-optimize", desc: "Batch reordering", accent: "violet" },
                  { cmd: "benchmark", desc: "75-tx performance suite", accent: "green" },
                  { cmd: "health", desc: "RPC connectivity check", accent: "slate" },
                ].map((item) => (
                  <div
                    key={item.cmd}
                    className="card-base p-3 text-left"
                  >
                    <code className="text-xs font-mono text-cyan-400">endless-guard {item.cmd}</code>
                    <p className="text-xs text-slate-600 mt-1">{item.desc}</p>
                  </div>
                ))}
              </div>

              <Link href="/docs" className="btn-primary">
                Full CLI Reference →
              </Link>
            </div>

            <div className="flex flex-col gap-4">
              <Terminal
                title="endless-guard · workflow"
                lines={[
                  { type: "comment", text: "Step 1 — assess risk before doing anything" },
                  { type: "command", text: 'endless-guard risk-score "stake 100000 tokens to 0xValidator"' },
                  { type: "output", text: "  Risk Score: 0.720  ·  Level: HIGH" },
                  { type: "warning", text: "  Multisig required — do not submit unilaterally" },
                  { type: "blank", text: "" },
                  { type: "comment", text: "Step 2 — check Block-STM impact" },
                  { type: "command", text: 'endless-guard conflict-check "stake 100000 tokens to 0xValidator"' },
                  { type: "output", text: "  Conflict: 44.2%  ·  Eff: 32.7%" },
                  { type: "output", text: "  🔥 Hot key: 0x1::stake::StakePool::0xValidator" },
                  { type: "blank", text: "" },
                  { type: "comment", text: "Step 3 — full safety pipeline with routing" },
                  { type: "command", text: 'endless-guard simulate "stake 100000 tokens to 0xValidator"' },
                  { type: "blank", text: "" },
                  { type: "warning", text: "  🔐 MULTISIG ESCALATION REQUIRED" },
                  { type: "output", text: "  Proposal: a3f2-9e11-4bc7  ·  3 approvals needed" },
                ]}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── TASK 5: Open Source / GitHub ─────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-24">
        <div className="rounded-2xl border border-[#1e1e2e] bg-[#111118] overflow-hidden">
          {/* Top decorative line */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />

          <div className="p-8 sm:p-12">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-10">
              <div className="flex-1 max-w-xl">
                <p className="section-label mb-3">Open Source</p>
                <h2 className="font-mono text-3xl font-bold text-white mb-5 leading-tight">
                  Open Source Developer Tooling
                </h2>
                <p className="text-slate-400 text-sm leading-relaxed mb-4">
                  Endless AI Execution Guard is open source and designed for the Endless developer
                  community. Contributions, custom risk factors, new CLI commands, and module
                  extensions are welcome — the modular architecture makes it straightforward to add
                  domain-specific safety logic without touching the core pipeline.
                </p>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Licensed under Apache 2.0. Built to be forked, extended, and deployed in any
                  Endless ecosystem project that integrates AI-generated transaction execution.
                </p>

                <div className="flex flex-wrap gap-3 mt-7">
                  <a
                    href="https://github.com/endless-labs/endless-ai-execution-guard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary"
                  >
                    <GitHubIcon />
                    View on GitHub
                  </a>
                  <a
                    href="https://docs.endless.link"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary"
                  >
                    Endless Docs ↗
                  </a>
                  <a
                    href="https://rpc.endless.link/v1/spec"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary"
                  >
                    RPC Spec ↗
                  </a>
                </div>
              </div>

              {/* Repo card */}
              <div className="w-full lg:w-80 flex-shrink-0">
                <div className="rounded-xl border border-[#2a2a3e] bg-[#0d0d14] p-5">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-[#111118] border border-[#1e1e2e] flex items-center justify-center">
                      <GitHubIconLg />
                    </div>
                    <div>
                      <p className="font-mono text-xs text-slate-500">endless-labs</p>
                      <p className="font-mono text-sm text-slate-200 font-semibold">
                        endless-ai-execution-guard
                      </p>
                    </div>
                  </div>
                  <p className="font-mono text-xs text-slate-500 leading-relaxed mb-5">
                    AI-safe execution framework for the Endless blockchain. CLI + TypeScript SDK.
                  </p>
                  <div className="flex gap-4 text-xs font-mono text-slate-500 mb-4">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-400" />TypeScript
                    </span>
                    <span>Apache 2.0</span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                      Testnet live
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-4 border-t border-[#1e1e2e] text-center">
                    {[
                      { label: "Modules", value: "7" },
                      { label: "Commands", value: "6" },
                      { label: "License", value: "APL 2" },
                    ].map((s) => (
                      <div key={s.label}>
                        <p className="font-mono text-base font-bold text-cyan-400">{s.value}</p>
                        <p className="font-mono text-[10px] text-slate-600">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

// ── Icon Components ────────────────────────────────────────────────────────────

function ParseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
    </svg>
  );
}
function SimIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
function ConflictIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
function RiskIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
function MultisigIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
function ReplayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 .49-4" />
    </svg>
  );
}
function GitHubIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}
function GitHubIconLg() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-slate-400">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}
function AlertIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
function ContractIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
    </svg>
  );
}
function ConflictWarningIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
function OrderIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}
function GovernanceIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
function ConfidenceIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  );
}
function ShieldCheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
