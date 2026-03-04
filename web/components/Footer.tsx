export function Footer() {
    return (
        <footer className="border-t border-[#1e1e2e] bg-[#0a0a0f] mt-20">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="font-mono text-sm font-semibold text-slate-300">endless-guard</span>
                            <span className="font-mono text-xs text-[#2a2a3e] border border-[#1e1e2e] rounded px-1.5 py-0.5">v1.0.0</span>
                        </div>
                        <p className="text-xs text-slate-500 font-mono">
                            AI-safe execution framework for the Endless blockchain
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                        {[
                            { label: "Endless Docs", href: "https://docs.endless.link" },
                            { label: "RPC Spec", href: "https://rpc.endless.link/v1/spec" },
                            { label: "Explorer", href: "https://scan.endless.link/?network=testnet" },
                            { label: "GitHub", href: "https://github.com/endless-labs/endless-ai-execution-guard" },
                        ].map((link) => (
                            <a
                                key={link.href}
                                href={link.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-mono text-slate-500 hover:text-cyan-400 transition-colors"
                            >
                                {link.label} ↗
                            </a>
                        ))}
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-[#1e1e2e] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <p className="text-xs text-slate-600 font-mono">
                        Apache License 2.0 · Built for the Endless Developer Community
                    </p>
                    <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-xs font-mono text-slate-600">
                            Testnet live · Chain ID 220
                        </span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
