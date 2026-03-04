/**
 * Multisig Guardrail
 *
 * When AI-generated transactions exceed the risk threshold, they must
 * be escalated through a multisig approval flow before execution.
 *
 * Execution flow:
 *   AI intent → simulation → risk scoring → multisig proposal → execution
 *
 * This module manages the proposal lifecycle: creation, approval,
 * rejection, expiry, and execution eligibility checks. In production,
 * approvals would be backed by multi-party cryptographic signatures
 * (e.g., using the Endless multisig_account module on-chain).
 */

import { randomUUID } from "crypto";
import type {
    ParsedIntent,
    SimulationResult,
    ConflictAnalysis,
    RiskAssessment,
    MultisigProposal,
    MultisigProposalStatus,
} from "../types.js";

// ─────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────

export interface MultisigGuardrailConfig {
    /** Default number of required approvals */
    defaultRequiredApprovals: number;
    /** How many ms a proposal stays open before auto-expiry */
    proposalTtlMs: number;
    /** Address of the multisig on-chain account (for production use) */
    multisigAccountAddress?: string;
}

const DEFAULT_MULTISIG_CONFIG: MultisigGuardrailConfig = {
    defaultRequiredApprovals: 3,
    proposalTtlMs: 24 * 60 * 60 * 1000, // 24 hours
    multisigAccountAddress: undefined,
};

// ─────────────────────────────────────────────────────
// Multisig Guardrail Class
// ─────────────────────────────────────────────────────

export class MultisigGuardrail {
    private readonly config: MultisigGuardrailConfig;
    private readonly proposals: Map<string, MultisigProposal> = new Map();

    constructor(config: Partial<MultisigGuardrailConfig> = {}) {
        this.config = { ...DEFAULT_MULTISIG_CONFIG, ...config };
    }

    /**
     * Create a new multisig proposal for a high-risk AI transaction.
     *
     * @param creator  Address of the party initiating the proposal
     * @param reason   Human-readable justification string
     */
    createProposal(
        intent: ParsedIntent,
        simulation: SimulationResult,
        riskAssessment: RiskAssessment,
        conflictAnalysis: ConflictAnalysis,
        creator: string,
        reason: string
    ): MultisigProposal {
        const requiredApprovals = this.computeRequiredApprovals(riskAssessment);

        const proposal: MultisigProposal = {
            proposalId: randomUUID(),
            intent,
            simulation,
            riskAssessment,
            conflictAnalysis,
            requiredApprovals,
            currentApprovals: [],
            status: "PENDING",
            createdAt: Date.now(),
            expiresAt: Date.now() + this.config.proposalTtlMs,
            metadata: {
                createdBy: creator,
                reason,
            },
        };

        this.proposals.set(proposal.proposalId, proposal);
        return proposal;
    }

    /**
     * Submit an approval signature for an existing proposal.
     * Returns the updated proposal.
     */
    approve(
        proposalId: string,
        signerAddress: string
    ): MultisigProposal {
        const proposal = this.getProposalOrThrow(proposalId);
        this.assertMutable(proposal);

        if (proposal.currentApprovals.includes(signerAddress)) {
            throw new Error(`Signer ${signerAddress} has already approved proposal ${proposalId}`);
        }

        proposal.currentApprovals.push(signerAddress);

        if (proposal.currentApprovals.length >= proposal.requiredApprovals) {
            proposal.status = "APPROVED";
        }

        this.proposals.set(proposalId, proposal);
        return proposal;
    }

    /**
     * Reject a proposal — permanently blocks execution.
     */
    reject(proposalId: string, signerAddress: string): MultisigProposal {
        const proposal = this.getProposalOrThrow(proposalId);
        this.assertMutable(proposal);

        proposal.status = "REJECTED";
        this.proposals.set(proposalId, proposal);
        return proposal;
    }

    /**
     * Mark a proposal as executed (after on-chain submission).
     */
    markExecuted(proposalId: string): MultisigProposal {
        const proposal = this.getProposalOrThrow(proposalId);

        if (proposal.status !== "APPROVED") {
            throw new Error(
                `Cannot mark proposal ${proposalId} as executed — current status: ${proposal.status}`
            );
        }

        proposal.status = "EXECUTED";
        this.proposals.set(proposalId, proposal);
        return proposal;
    }

    /**
     * Check if a proposal is eligible for execution.
     */
    canExecute(proposalId: string): boolean {
        const proposal = this.proposals.get(proposalId);
        if (!proposal) return false;
        this.refreshExpiryStatus(proposal);
        return proposal.status === "APPROVED";
    }

    /**
     * Get a proposal by ID (returns undefined if not found).
     */
    getProposal(proposalId: string): MultisigProposal | undefined {
        const proposal = this.proposals.get(proposalId);
        if (proposal) this.refreshExpiryStatus(proposal);
        return proposal;
    }

    /**
     * List all proposals with an optional status filter.
     */
    listProposals(
        statusFilter?: MultisigProposalStatus
    ): MultisigProposal[] {
        const all = [...this.proposals.values()];
        all.forEach((p) => this.refreshExpiryStatus(p));

        if (statusFilter) {
            return all.filter((p) => p.status === statusFilter);
        }
        return all.sort((a, b) => b.createdAt - a.createdAt);
    }

    /**
     * Returns a summary of the approval status for display purposes.
     */
    approvalSummary(proposal: MultisigProposal): string {
        return [
            `Proposal: ${proposal.proposalId}`,
            `Status:   ${proposal.status}`,
            `Progress: ${proposal.currentApprovals.length}/${proposal.requiredApprovals} approvals`,
            `Action:   ${proposal.intent.action.toUpperCase()}`,
            `Risk:     ${proposal.riskAssessment.riskLevel} (${proposal.riskAssessment.riskScore.toFixed(2)})`,
            `Expires:  ${new Date(proposal.expiresAt).toISOString()}`,
            `By:       ${proposal.metadata.createdBy}`,
            `Reason:   ${proposal.metadata.reason}`,
        ].join("\n");
    }

    // ─────────────────────────────────────────────
    // Private Helpers
    // ─────────────────────────────────────────────

    private computeRequiredApprovals(risk: RiskAssessment): number {
        if (risk.riskScore >= 0.85) return 5;
        if (risk.riskScore >= 0.75) return 4;
        if (risk.riskScore >= 0.65) return 3;
        return this.config.defaultRequiredApprovals;
    }

    private getProposalOrThrow(proposalId: string): MultisigProposal {
        const proposal = this.proposals.get(proposalId);
        if (!proposal) {
            throw new Error(`MultisigProposal not found: ${proposalId}`);
        }
        this.refreshExpiryStatus(proposal);
        return proposal;
    }

    private assertMutable(proposal: MultisigProposal): void {
        if (proposal.status !== "PENDING") {
            throw new Error(
                `Proposal ${proposal.proposalId} is not in PENDING state (current: ${proposal.status})`
            );
        }
    }

    private refreshExpiryStatus(proposal: MultisigProposal): void {
        if (proposal.status === "PENDING" && Date.now() > proposal.expiresAt) {
            proposal.status = "EXPIRED";
            this.proposals.set(proposal.proposalId, proposal);
        }
    }
}

// ─────────────────────────────────────────────────────
// Factory helper
// ─────────────────────────────────────────────────────

export function createMultisigGuardrail(
    config?: Partial<MultisigGuardrailConfig>
): MultisigGuardrail {
    return new MultisigGuardrail(config);
}
