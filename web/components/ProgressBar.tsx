interface ProgressBarProps {
    label: string;
    value: number; // 0–100
    color?: "cyan" | "green" | "amber" | "red";
    suffix?: string;
    sublabel?: string;
    showValue?: boolean;
}

const BAR_CLASSES: Record<string, string> = {
    cyan: "progress-bar-cyan",
    green: "progress-bar-green",
    amber: "progress-bar-amber",
    red: "progress-bar-red",
};

const VALUE_CLASSES: Record<string, string> = {
    cyan: "text-cyan-400",
    green: "text-green-400",
    amber: "text-amber-400",
    red: "text-red-400",
};

export function ProgressBar({
    label,
    value,
    color = "cyan",
    suffix = "%",
    sublabel,
    showValue = true,
}: ProgressBarProps) {
    const clampedValue = Math.min(100, Math.max(0, value));

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
                <div>
                    <span className="font-mono text-sm text-slate-300">{label}</span>
                    {sublabel && (
                        <span className="font-mono text-xs text-slate-600 ml-2">{sublabel}</span>
                    )}
                </div>
                {showValue && (
                    <span className={`font-mono text-sm font-bold ${VALUE_CLASSES[color]}`}>
                        {clampedValue.toFixed(1)}{suffix}
                    </span>
                )}
            </div>
            <div className="h-2 bg-[#1e1e2e] rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full ${BAR_CLASSES[color]} transition-all duration-700`}
                    style={{ width: `${clampedValue}%` }}
                />
            </div>
        </div>
    );
}

// Scenario bar row in the benchmark table
interface ScenarioRowProps {
    name: string;
    gas: string;
    conflictRate: number;
    efficiency: number;
    multisigRate: number;
}

export function ScenarioRow({ name, gas, conflictRate, efficiency, multisigRate }: ScenarioRowProps) {
    const effColor = efficiency > 70 ? "green" : efficiency > 40 ? "amber" : "red";
    const conflictColor = conflictRate < 20 ? "green" : conflictRate < 50 ? "amber" : "red";

    return (
        <tr className="border-b border-[#1e1e2e] hover:bg-white/[0.02] transition-colors">
            <td className="py-3 px-4">
                <span className="font-mono text-sm text-slate-300">{name}</span>
            </td>
            <td className="py-3 px-4">
                <span className="font-mono text-sm text-slate-400">{gas}</span>
            </td>
            <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-[#1e1e2e] rounded-full">
                        <div
                            className={`h-full rounded-full progress-bar-${conflictColor}`}
                            style={{ width: `${conflictRate}%` }}
                        />
                    </div>
                    <span className={`font-mono text-xs text-${conflictColor}-400`}>{conflictRate.toFixed(1)}%</span>
                </div>
            </td>
            <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-[#1e1e2e] rounded-full">
                        <div
                            className={`h-full rounded-full progress-bar-${effColor}`}
                            style={{ width: `${efficiency}%` }}
                        />
                    </div>
                    <span className={`font-mono text-xs text-${effColor}-400`}>{efficiency.toFixed(1)}%</span>
                </div>
            </td>
            <td className="py-3 px-4">
                <span className={`font-mono text-xs ${multisigRate > 0 ? "text-amber-400" : "text-slate-600"}`}>
                    {multisigRate.toFixed(1)}%
                </span>
            </td>
        </tr>
    );
}
