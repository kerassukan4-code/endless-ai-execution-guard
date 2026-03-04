export function ArchitectureDiagram() {
    const steps = [
        {
            id: "ai",
            label: "AI Agent",
            sublabel: "LLM-generated instruction",
            icon: "🤖",
            color: "border-slate-600 bg-slate-800/30 text-slate-300",
            dot: "bg-slate-500",
        },
        {
            id: "intent",
            label: "Intent Parser",
            sublabel: "lib/intent-parser/",
            icon: "⟨/⟩",
            color: "border-blue-500/40 bg-blue-500/5 text-blue-300",
            dot: "bg-blue-400",
            detail: "NL → structured action + confidence score",
        },
        {
            id: "sim",
            label: "Simulation Engine",
            sublabel: "lib/simulation/",
            icon: "⚡",
            color: "border-violet-500/40 bg-violet-500/5 text-violet-300",
            dot: "bg-violet-400",
            detail: "Gas estimate · write-set · predicted status",
        },
        {
            id: "conflict",
            label: "Block-STM Conflict Analyzer",
            sublabel: "lib/conflict-analysis/",
            icon: "⊘",
            color: "border-amber-500/40 bg-amber-500/5 text-amber-300",
            dot: "bg-amber-400",
            detail: "Write-set overlap · parallel efficiency score",
        },
        {
            id: "risk",
            label: "Risk Engine",
            sublabel: "lib/risk-engine/",
            icon: "◈",
            color: "border-orange-500/40 bg-orange-500/5 text-orange-300",
            dot: "bg-orange-400",
            detail: "8-factor weighted score [0.0 – 1.0]",
        },
        {
            id: "gate",
            label: "Guard Gate",
            sublabel: "lib/guard.ts",
            icon: "⬡",
            color: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300",
            dot: "bg-cyan-400",
            detail: "Route: APPROVE · ESCALATE · REJECT",
        },
    ];

    const outcomes = [
        {
            label: "APPROVE",
            desc: "Submit to Endless RPC",
            color: "border-green-500/40 bg-green-500/5 text-green-400",
            dot: "bg-green-400",
        },
        {
            label: "ESCALATE",
            desc: "Multisig proposal · N signatures",
            color: "border-amber-500/40 bg-amber-500/5 text-amber-400",
            dot: "bg-amber-400",
        },
        {
            label: "REJECT",
            desc: "Block execution · log reason",
            color: "border-red-500/40 bg-red-500/5 text-red-400",
            dot: "bg-red-400",
        },
    ];

    return (
        <div className="w-full max-w-2xl mx-auto">
            {/* Pipeline */}
            <div className="flex flex-col items-center gap-0">
                {steps.map((step, i) => (
                    <div key={step.id} className="flex flex-col items-center w-full max-w-md">
                        {/* Node */}
                        <div
                            className={`w-full border rounded-xl px-5 py-4 flex items-center gap-4 ${step.color} transition-all hover:scale-[1.01]`}
                        >
                            <div className="w-9 h-9 rounded-lg bg-black/30 flex items-center justify-center font-mono text-sm flex-shrink-0">
                                {step.icon}
                            </div>
                            <div className="flex-1">
                                <div className="font-mono text-sm font-semibold">{step.label}</div>
                                {step.detail && (
                                    <div className="font-mono text-xs opacity-60 mt-0.5">{step.detail}</div>
                                )}
                            </div>
                            <code className="text-xs opacity-40 font-mono hidden sm:block">{step.sublabel}</code>
                        </div>

                        {/* Connector arrow */}
                        {i < steps.length - 1 && (
                            <div className="flex flex-col items-center py-1">
                                <div className="w-px h-4 bg-[#2a2a3e]" />
                                <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                                    <path d="M0 0L5 6L10 0" fill="#2a2a3e" />
                                </svg>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Outcomes */}
            <div className="mt-3 flex flex-col items-center">
                <div className="flex flex-col items-center py-1">
                    <div className="w-px h-4 bg-[#2a2a3e]" />
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                        <path d="M0 0L5 6L10 0" fill="#2a2a3e" />
                    </svg>
                </div>
                <div className="grid grid-cols-3 gap-2 w-full max-w-md">
                    {outcomes.map((o) => (
                        <div
                            key={o.label}
                            className={`border rounded-xl p-3 text-center ${o.color}`}
                        >
                            <div className="flex items-center justify-center gap-1.5 mb-1">
                                <div className={`w-1.5 h-1.5 rounded-full ${o.dot}`} />
                                <span className="font-mono text-xs font-bold">{o.label}</span>
                            </div>
                            <p className="font-mono text-[10px] opacity-60 leading-tight">{o.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
