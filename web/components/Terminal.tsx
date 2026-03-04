"use client";
import { useState, useEffect } from "react";

interface TerminalLine {
    type: "command" | "output" | "blank" | "comment" | "success" | "warning" | "error" | "header";
    text: string;
}

interface TerminalProps {
    title?: string;
    lines: TerminalLine[];
    animate?: boolean;
    className?: string;
}

const LINE_COLORS: Record<TerminalLine["type"], string> = {
    command: "text-cyan-400",
    output: "text-slate-300",
    blank: "text-transparent",
    comment: "text-slate-600",
    success: "text-green-400",
    warning: "text-amber-400",
    error: "text-red-400",
    header: "text-slate-200 font-semibold",
};

const LINE_PREFIX: Record<TerminalLine["type"], string> = {
    command: "$ ",
    output: "  ",
    blank: "",
    comment: "# ",
    success: "  ✓ ",
    warning: "  ⚠ ",
    error: "  ✗ ",
    header: "  ",
};

export function Terminal({ title = "terminal", lines, animate = false, className = "" }: TerminalProps) {
    const [visibleCount, setVisibleCount] = useState(animate ? 0 : lines.length);

    useEffect(() => {
        if (!animate) return;
        setVisibleCount(0);
        let i = 0;
        const interval = setInterval(() => {
            i++;
            setVisibleCount(i);
            if (i >= lines.length) clearInterval(interval);
        }, 60);
        return () => clearInterval(interval);
    }, [animate, lines.length]);

    const visibleLines = lines.slice(0, visibleCount);

    return (
        <div className={`rounded-xl overflow-hidden border border-[#1e1e2e] bg-[#0d0d14] ${className}`}>
            {/* Window chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1e1e2e] bg-[#111118]">
                <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/70" />
                    <div className="w-3 h-3 rounded-full bg-amber-500/70" />
                    <div className="w-3 h-3 rounded-full bg-green-500/70" />
                </div>
                <span className="ml-2 text-xs font-mono text-slate-500">{title}</span>
            </div>

            {/* Terminal body */}
            <div className="p-5 overflow-x-auto min-h-[120px]">
                <pre className="font-mono text-sm leading-7">
                    {visibleLines.map((line, i) => (
                        <div key={i} className={`${LINE_COLORS[line.type]} flex`}>
                            {line.type !== "blank" && (
                                <span className={line.type === "command" ? "text-slate-500" : ""}>
                                    {LINE_PREFIX[line.type]}
                                </span>
                            )}
                            <span>{line.text}</span>
                        </div>
                    ))}
                    {visibleCount < lines.length && animate && (
                        <span className="inline-block w-2 h-4 bg-cyan-400 animate-blink ml-1" />
                    )}
                </pre>
            </div>
        </div>
    );
}

export function InlineCode({ children }: { children: React.ReactNode }) {
    return (
        <code className="font-mono text-sm bg-[#111118] border border-[#1e1e2e] text-cyan-400 px-1.5 py-0.5 rounded">
            {children}
        </code>
    );
}
