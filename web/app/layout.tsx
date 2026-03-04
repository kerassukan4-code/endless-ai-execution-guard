import type { Metadata } from "next";
import "./globals.css";
import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Endless AI Execution Guard — Developer Documentation",
  description:
    "AI-safe execution framework for the Endless blockchain ecosystem. Simulate, analyze, and gate AI-generated transactions with Block-STM conflict detection and multisig guardrails.",
  keywords: ["endless", "blockchain", "AI safety", "developer tools", "Block-STM", "CLI"],
  icons: {
    icon: "/endles.png",
    apple: "/endles.png",
  },
  openGraph: {
    title: "Endless AI Execution Guard",
    description: "AI-safe execution framework for the Endless blockchain ecosystem.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0a0a0f] text-slate-200 antialiased">
        <NavBar />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
