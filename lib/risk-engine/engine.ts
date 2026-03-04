/**
 * AI Transaction Risk Engine
 *
 * Calculates a composite risk score for AI-generated blockchain transactions
 * by combining multiple weighted risk factors:
 *
 * Factor              Weight  Rationale
 * ─────────────────────────────────────────────────────────────
 * Transfer size       0.25    Large transfers cause irreversible fund movement
 * Contract interact   0.20    Smart contract bugs can drain accounts
 * Storage overlap     0.15    High conflict rate → failed txns, wasted gas
 * AI-generated        0.10    LLM hallucinations produce malformed payloads
 * Governance        0.15    Protocol-level changes require broad consensus
 * Unknown action      0.10    Unrecognized intents should always be blocked
 * Sensitive flag      0.05    Sensitivity classification boost
 *
 * Risk scores range from 0.0 (no risk) to 1.0 (maximum risk).
 * Scores above 0.65 require multisig approval before execution.
 */

import type {
    ParsedIntent,
    SimulationResult,
    ConflictAnalysis,
    RiskAssessment,
    RiskFactor,
    RiskLevel,
} from "../types.js";

// ─────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────

export interface RiskEngineConfig {
    /** Token amount threshold above which transfer is "large" (in base units) */
    largeTransferThreshold: number;
    /** Risk score above which multisig is required [0.0–1.0] */
    multisigThreshold: number;
    /** Risk score above which transaction is auto-rejected [0.0–1.0] */
    rejectThreshold: number;
    /** Gas estimate above which a transaction is flagged as expensive */
    highGasThreshold: number;
}

const DEFAULT_RISK_CONFIG: RiskEngineConfig = {
    largeTransferThreshold: 1_000,
    multisigThreshold: 0.65,
    rejectThreshold: 0.90,
    highGasThreshold: 5_000,
};

// ─────────────────────────────────────────────────────
// Risk Factor Definitions
// ─────────────────────────────────────────────────────

type FactorEvaluator = (
    intent: ParsedIntent,
    simulation: SimulationResult,
    conflict: ConflictAnalysis,
    config: RiskEngineConfig
) => { score: number; description: string } | null;

interface FactorDef {
    name: string;
    weight: number;
    evaluate: FactorEvaluator;
}

const RISK_FACTOR_DEFS: FactorDef[] = [
    // 1. Transfer size
    {
        name: "Transfer Size",
        weight: 0.25,
        evaluate: (intent, _sim, _conf, config) => {
            if (intent.action !== "transfer") return null;
            const amount = intent.amount ?? 0;
            if (amount === 0) return { score: 0, description: "Zero-value transfer" };
            const ratio = Math.min(1, amount / (config.largeTransferThreshold * 10));
            return {
                score: ratio,
                description: `Transfer of ${amount.toLocaleString()} tokens (threshold: ${config.largeTransferThreshold.toLocaleString()})`,
            };
        },
    },

    // 2. Contract interaction
    {
        name: "Contract Interaction",
        weight: 0.20,
        evaluate: (intent) => {
            if (
                intent.action === "call_contract" ||
                intent.action === "deploy"
            ) {
                const score = intent.action === "deploy" ? 0.90 : 0.65;
                return {
                    score,
                    description:
                        intent.action === "deploy"
                            ? "Smart contract deployment: irreversible bytecode publication"
                            : "External contract call: execution depends on remote Move logic",
                };
            }
            return null;
        },
    },

    // 3. Storage overlap / conflict risk
    {
        name: "Storage Conflict Risk",
        weight: 0.15,
        evaluate: (_intent, _sim, conflict) => {
            if (conflict.conflictProbability === 0) return null;
            return {
                score: conflict.conflictProbability,
                description: `Conflict probability: ${(conflict.conflictProbability * 100).toFixed(1)}% (parallel efficiency: ${(conflict.parallelEfficiencyScore * 100).toFixed(0)}%)`,
            };
        },
    },

    // 4. AI-generated intent uncertainty
    {
        name: "AI Generation Uncertainty",
        weight: 0.10,
        evaluate: (intent) => {
            // Lower confidence = higher risk from hallucination / misparse
            const uncertaintyScore = 1 - intent.confidence;
            return {
                score: uncertaintyScore,
                description: `AI parser confidence: ${(intent.confidence * 100).toFixed(0)}% — lower confidence indicates potential hallucination`,
            };
        },
    },

    // 5. Governance operations
    {
        name: "Governance Operation",
        weight: 0.15,
        evaluate: (intent) => {
            if (
                intent.action === "governance_vote" ||
                intent.action === "governance_propose"
            ) {
                const score = intent.action === "governance_propose" ? 0.85 : 0.55;
                return {
                    score,
                    description:
                        intent.action === "governance_propose"
                            ? "Governance proposal submission: impacts entire protocol"
                            : "Governance vote: participation in protocol-level decisions",
                };
            }
            return null;
        },
    },

    // 6. Unknown action
    {
        name: "Unknown Action",
        weight: 0.10,
        evaluate: (intent) => {
            if (intent.action !== "unknown") return null;
            return {
                score: 1.0,
                description: "Unrecognized AI instruction — cannot determine safety",
            };
        },
    },

    // 7. Sensitivity flag
    {
        name: "Sensitivity Flag",
        weight: 0.05,
        evaluate: (intent) => {
            if (!intent.sensitive) return null;
            return {
                score: 0.8,
                description: `Flagged sensitive: ${intent.sensitivityReasons.join(", ")}`,
            };
        },
    },
];

// ─────────────────────────────────────────────────────
// Risk Level Classification
// ─────────────────────────────────────────────────────

function classifyRiskLevel(score: number): RiskLevel {
    if (score < 0.25) return "LOW";
    if (score < 0.50) return "MEDIUM";
    if (score < 0.75) return "HIGH";
    return "CRITICAL";
}

// ─────────────────────────────────────────────────────
// Risk Engine Class
// ─────────────────────────────────────────────────────

export class RiskEngine {
    private readonly config: RiskEngineConfig;

    constructor(config: Partial<RiskEngineConfig> = {}) {
        this.config = { ...DEFAULT_RISK_CONFIG, ...config };
    }

    /**
     * Calculate a composite risk assessment for a transaction.
     *
     * Returns a normalized risk score [0.0–1.0], classified risk level,
     * contributing factors, and actionable recommendations.
     */
    calculateRiskScore(
        intent: ParsedIntent,
        simulation: SimulationResult,
        conflict: ConflictAnalysis
    ): RiskAssessment {
        const activeFactors: RiskFactor[] = [];
        let weightedSum = 0;
        let totalWeight = 0;

        for (const factorDef of RISK_FACTOR_DEFS) {
            const result = factorDef.evaluate(intent, simulation, conflict, this.config);
            if (result === null) continue;

            weightedSum += result.score * factorDef.weight;
            totalWeight += factorDef.weight;

            activeFactors.push({
                name: factorDef.name,
                weight: factorDef.weight,
                description: result.description,
            });
        }

        // High gas also adds a small extra penalty
        if (simulation.gasEstimate > this.config.highGasThreshold) {
            const gasRatio = Math.min(1, simulation.gasEstimate / (this.config.highGasThreshold * 5));
            weightedSum += gasRatio * 0.05;
            totalWeight += 0.05;
            activeFactors.push({
                name: "High Gas Cost",
                weight: 0.05,
                description: `Gas estimate ${simulation.gasEstimate.toLocaleString()} exceeds threshold ${this.config.highGasThreshold.toLocaleString()}`,
            });
        }

        const riskScore = totalWeight > 0
            ? parseFloat(Math.min(1, weightedSum / totalWeight).toFixed(3))
            : 0;

        const riskLevel = classifyRiskLevel(riskScore);
        const requiresMultisig = riskScore >= this.config.multisigThreshold;
        const recommendation = this.buildRecommendation(
            riskScore,
            riskLevel,
            requiresMultisig,
            activeFactors
        );

        return {
            riskScore,
            riskLevel,
            factors: activeFactors,
            recommendation,
            requiresMultisig,
            estimatedImpact: this.describeImpact(intent, simulation),
        };
    }

    /**
     * Batch risk scoring — returns scores sorted by descending risk
     */
    scoreBatch(
        items: Array<{
            intent: ParsedIntent;
            simulation: SimulationResult;
            conflict: ConflictAnalysis;
        }>
    ): RiskAssessment[] {
        return items
            .map(({ intent, simulation, conflict }) =>
                this.calculateRiskScore(intent, simulation, conflict)
            )
            .sort((a, b) => b.riskScore - a.riskScore);
    }

    // ─────────────────────────────────────────────
    // Private Helpers
    // ─────────────────────────────────────────────

    private buildRecommendation(
        score: number,
        level: RiskLevel,
        multisig: boolean,
        factors: RiskFactor[]
    ): string {
        const topFactor = factors[0]?.name ?? "none";

        if (score >= this.config.rejectThreshold) {
            return `REJECT: Risk score ${score.toFixed(2)} exceeds rejection threshold. Primary concern: ${topFactor}. Do not execute without full manual review.`;
        }
        if (multisig) {
            return `ESCALATE: Risk score ${score.toFixed(2)} requires multisig approval (${level}). Primary concern: ${topFactor}. Obtain ${this.recommendedSigners(score)} signatures before proceeding.`;
        }
        if (score >= 0.40) {
            return `CAUTION: Moderate risk (${score.toFixed(2)}). Verify intent accuracy and simulate on testnet before mainnet execution.`;
        }
        return `APPROVE: Low risk score ${score.toFixed(2)}. Transaction is safe to execute with standard single-signer authorization.`;
    }

    private recommendedSigners(score: number): number {
        if (score >= 0.85) return 5;
        if (score >= 0.75) return 4;
        if (score >= 0.65) return 3;
        return 2;
    }

    private describeImpact(
        intent: ParsedIntent,
        simulation: SimulationResult
    ): string {
        const gasUsd = (simulation.gasEstimate * 0.0000001).toFixed(6);
        const keysAffected = simulation.storageKeys.length;

        return `${keysAffected} storage key(s) affected; estimated gas cost ≈ ${simulation.gasEstimate.toLocaleString()} units (~${gasUsd} EDS equivalent)`;
    }
}

// ─────────────────────────────────────────────────────
// Factory helper
// ─────────────────────────────────────────────────────

export function createRiskEngine(
    config?: Partial<RiskEngineConfig>
): RiskEngine {
    return new RiskEngine(config);
}
