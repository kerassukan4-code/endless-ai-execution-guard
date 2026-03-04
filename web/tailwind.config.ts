import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                mono: ["JetBrains Mono", "Fira Code", "ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
                sans: ["Inter", "system-ui", "sans-serif"],
            },
            colors: {
                background: "#0a0a0f",
                surface: "#111118",
                "surface-2": "#16161f",
                "surface-3": "#1c1c28",
                border: "#1e1e2e",
                "border-bright": "#2a2a3e",
                cyan: {
                    400: "#22d3ee",
                    500: "#06b6d4",
                    600: "#0891b2",
                },
                green: {
                    400: "#4ade80",
                    500: "#22c55e",
                },
                amber: {
                    400: "#fbbf24",
                },
                red: {
                    400: "#f87171",
                },
                "text-primary": "#e2e8f0",
                "text-secondary": "#94a3b8",
                "text-muted": "#475569",
            },
            animation: {
                "fade-in": "fadeIn 0.5s ease-in-out",
                "slide-up": "slideUp 0.4s ease-out",
                blink: "blink 1s step-end infinite",
                "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
            },
            keyframes: {
                fadeIn: {
                    "0%": { opacity: "0" },
                    "100%": { opacity: "1" },
                },
                slideUp: {
                    "0%": { opacity: "0", transform: "translateY(12px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
                blink: {
                    "0%, 100%": { opacity: "1" },
                    "50%": { opacity: "0" },
                },
            },
            backgroundImage: {
                "grid-pattern":
                    "linear-gradient(rgba(34,211,238,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.03) 1px, transparent 1px)",
                "hero-gradient":
                    "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(34,211,238,0.12), transparent)",
                "glow-cyan": "radial-gradient(circle, rgba(34,211,238,0.15) 0%, transparent 70%)",
            },
            backgroundSize: {
                "grid-sm": "24px 24px",
            },
            boxShadow: {
                "glow-cyan": "0 0 24px rgba(34,211,238,0.2)",
                "glow-green": "0 0 24px rgba(74,222,128,0.2)",
                "inner-border": "inset 0 0 0 1px rgba(255,255,255,0.05)",
            },
        },
    },
    plugins: [],
};

export default config;
