interface FeatureCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    badge?: string;
    badgeColor?: "cyan" | "green" | "amber" | "red";
    module?: string;
}

const BADGE_STYLES: Record<string, string> = {
    cyan: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    green: "bg-green-500/10 text-green-400 border-green-500/20",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    red: "bg-red-500/10 text-red-400 border-red-500/20",
};

export function FeatureCard({
    icon,
    title,
    description,
    badge,
    badgeColor = "cyan",
    module,
}: FeatureCardProps) {
    return (
        <div className="group card-base p-6 flex flex-col gap-4">
            {/* Icon + badge row */}
            <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500/15 transition-colors">
                    {icon}
                </div>
                {badge && (
                    <span className={`text-xs font-mono px-2 py-0.5 rounded border ${BADGE_STYLES[badgeColor]}`}>
                        {badge}
                    </span>
                )}
            </div>

            {/* Content */}
            <div>
                <h3 className="font-mono text-sm font-semibold text-slate-100 mb-1.5">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
            </div>

            {/* Module path */}
            {module && (
                <div className="mt-auto pt-3 border-t border-[#1e1e2e]">
                    <code className="text-xs font-mono text-slate-600">{module}</code>
                </div>
            )}
        </div>
    );
}

// Stat card variant
interface StatCardProps {
    label: string;
    value: string | number;
    unit?: string;
    trend?: "up" | "down" | "neutral";
    color?: "cyan" | "green" | "amber" | "red";
}

export function StatCard({ label, value, unit, color = "cyan" }: StatCardProps) {
    const valueColors: Record<string, string> = {
        cyan: "text-cyan-400",
        green: "text-green-400",
        amber: "text-amber-400",
        red: "text-red-400",
    };

    return (
        <div className="card-base p-5">
            <p className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-2">{label}</p>
            <p className={`font-mono text-2xl font-bold ${valueColors[color]}`}>
                {value}
                {unit && <span className="text-sm font-normal text-slate-500 ml-1">{unit}</span>}
            </p>
        </div>
    );
}
