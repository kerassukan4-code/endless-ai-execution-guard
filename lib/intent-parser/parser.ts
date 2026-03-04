/**
 * Endless AI Intent Parser
 *
 * Converts natural language instructions from AI agents into structured
 * blockchain action descriptors. Includes sensitivity classification and
 * confidence scoring to aid downstream risk evaluation.
 *
 * Example input:  "transfer 5000 tokens to 0xBob"
 * Example output: { action: "transfer", amount: 5000, target: "0xBob", sensitive: true, ... }
 */

import type { ParsedIntent, ActionType } from "../types.js";

// ─────────────────────────────────────────────────────
// Sensitivity thresholds (configurable)
// ─────────────────────────────────────────────────────

export interface IntentParserConfig {
    /** Transfers above this amount (in base units) are flagged sensitive */
    largeTransferThreshold: number;
    /** Always flag contract interactions as sensitive */
    flagContractInteractions: boolean;
    /** Always flag governance operations as sensitive */
    flagGovernanceOps: boolean;
}

const DEFAULT_PARSER_CONFIG: IntentParserConfig = {
    largeTransferThreshold: 1_000,
    flagContractInteractions: true,
    flagGovernanceOps: true,
};

// ─────────────────────────────────────────────────────
// Intent Pattern Definitions
// ─────────────────────────────────────────────────────

interface IntentPattern {
    action: ActionType;
    patterns: RegExp[];
    extractors: Extractors;
}

interface Extractors {
    amount?: RegExp;
    target?: RegExp;
    moduleAddress?: RegExp;
    functionName?: RegExp;
}

const INTENT_PATTERNS: IntentPattern[] = [
    // ── Governance patterns checked FIRST (high specificity) ──────────────
    {
        action: "governance_propose",
        patterns: [
            /\bpropose\b/i,
            /\bsubmit\s+(?:a\s+)?proposal/i,
            /\bcreate\s+(?:a\s+)?governance/i,
        ],
        extractors: {},
    },
    {
        action: "governance_vote",
        patterns: [
            /\bgovernance\s+vote/i,
            /\bcast\s+(?:a\s+)?vote/i,
            /\bvote\s+(?:on|for|against)/i,
        ],
        extractors: {
            target: /(?:on|for|against)\s+(?:proposal\s+)?(\w+)/i,
        },
    },
    // ── Deploy / Contract (before generic patterns) ───────────────────────
    {
        action: "deploy",
        patterns: [
            /\bdeploy\b/i,
            /\bpublish\s+(?:a\s+)?(?:module|contract|package)/i,
            /\bupload\s+(?:contract|module)/i,
        ],
        extractors: {
            moduleAddress: /(0x[a-fA-F0-9]{6,})/i,
            functionName: /(?:module|contract)\s+named?\s+(\w+)/i,
        },
    },
    {
        action: "call_contract",
        patterns: [
            /\bcall\s+(?:contract|function)/i,
            /\bexecute\s+(?:contract|function|module)/i,
            /\binvoke\b/i,
            /\binteract\s+with\b/i,
        ],
        extractors: {
            moduleAddress: /(0x[a-fA-F0-9]{6,})/i,
            functionName: /(?:function|method)\s+(?:named?\s+)?(\w+)/i,
        },
    },
    // ── Token operations ──────────────────────────────────────────────────
    {
        action: "transfer",
        patterns: [
            /\btransfer\b/i,
            /\bsend\b/i,
            /\bmove\s+\d/i,
            /\bpay\b/i,
        ],
        extractors: {
            amount: /(\d[\d,_]*(?:\.\d+)?)\s*(?:tokens?|coins?|eds|EDS)?/i,
            target: /(?:to|→|->)\s+(0x[a-fA-F0-9]{6,}|\w+)/i,
        },
    },
    {
        action: "mint_nft",
        patterns: [
            /\bmint\b/i,
            /\bcreate\s+(?:an?\s+)?(?:nft|token|asset)/i,
            /\bgenerate\s+(?:nft|asset)/i,
        ],
        extractors: {
            target: /(?:collection|to)\s+(0x[a-fA-F0-9]{6,}|\w+)/i,
        },
    },
    {
        action: "burn",
        patterns: [
            /\bburn\b/i,
            /\bdestroy\s+tokens?/i,
        ],
        extractors: {
            amount: /(\d[\d,_]*(?:\.\d+)?)/i,
        },
    },
    // ── Staking ───────────────────────────────────────────────────────────
    {
        action: "stake",
        patterns: [
            /\bstake\b/i,
            /\bdelegate\b/i,
            /\bdeposit\s+to\s+validator/i,
        ],
        extractors: {
            amount: /(\d[\d,_]*(?:\.\d+)?)\s*(?:tokens?|coins?|eds)?/i,
            target: /(?:to|with|validator)\s+(0x[a-fA-F0-9]{6,}|\w+)/i,
        },
    },
    {
        action: "unstake",
        patterns: [
            /\bunstake\b/i,
            /\bwithdraw\s+(?:from\s+)?stake/i,
            /\breadjust\s+stake/i,
        ],
        extractors: {
            amount: /(\d[\d,_]*(?:\.\d+)?)/i,
        },
    },
];

// ─────────────────────────────────────────────────────
// Sensitivity Classifier
// ─────────────────────────────────────────────────────

function classifySensitivity(
    action: ActionType,
    amount: number | undefined,
    config: IntentParserConfig
): { sensitive: boolean; reasons: string[] } {
    const reasons: string[] = [];

    if (
        action === "transfer" &&
        amount !== undefined &&
        amount >= config.largeTransferThreshold
    ) {
        reasons.push(`Large transfer: ${amount.toLocaleString()} tokens`);
    }

    if (
        config.flagContractInteractions &&
        (action === "call_contract" || action === "deploy")
    ) {
        reasons.push("Contract interaction: elevated execution risk");
    }

    if (
        config.flagGovernanceOps &&
        (action === "governance_vote" || action === "governance_propose")
    ) {
        reasons.push("Governance operation: requires community consensus");
    }

    if (action === "burn") {
        reasons.push("Irreversible token burn");
    }

    if (action === "mint_nft") {
        reasons.push("NFT minting: on-chain asset creation");
    }

    if (action === "stake" && amount !== undefined && amount >= config.largeTransferThreshold) {
        reasons.push(`Large stake delegation: ${amount.toLocaleString()} tokens`);
    }

    return { sensitive: reasons.length > 0, reasons };
}

// ─────────────────────────────────────────────────────
// Intent Parser
// ─────────────────────────────────────────────────────

export class IntentParser {
    private readonly config: IntentParserConfig;

    constructor(config: Partial<IntentParserConfig> = {}) {
        this.config = { ...DEFAULT_PARSER_CONFIG, ...config };
    }

    /**
     * Parse a natural language instruction into a structured ParsedIntent.
     * Throws if the intent cannot be identified.
     */
    parse(rawInput: string): ParsedIntent {
        const normalized = rawInput.trim();

        let matchedPattern: IntentPattern | null = null;
        let confidence = 0;

        for (const pattern of INTENT_PATTERNS) {
            for (const regex of pattern.patterns) {
                if (regex.test(normalized)) {
                    matchedPattern = pattern;
                    confidence = this.computeConfidence(normalized, pattern);
                    break;
                }
            }
            if (matchedPattern) break;
        }

        const action: ActionType = matchedPattern?.action ?? "unknown";
        const extractors = matchedPattern?.extractors ?? {};

        // Extract amount
        let amount: number | undefined;
        if (extractors.amount) {
            const m = normalized.match(extractors.amount);
            if (m?.[1]) {
                amount = parseFloat(m[1].replace(/[,_]/g, ""));
            }
        }

        // Extract target address
        let target: string | undefined;
        if (extractors.target) {
            const m = normalized.match(extractors.target);
            if (m?.[1]) target = m[1];
        }

        // Extract module address
        let moduleAddress: string | undefined;
        if (extractors.moduleAddress) {
            const m = normalized.match(extractors.moduleAddress);
            if (m?.[1]) moduleAddress = m[1];
        }

        // Extract function name
        let functionName: string | undefined;
        if (extractors.functionName) {
            const m = normalized.match(extractors.functionName);
            if (m?.[1]) functionName = m[1];
        }

        // Classify sensitivity
        const { sensitive, reasons } = classifySensitivity(action, amount, this.config);

        return {
            rawInput: normalized,
            action,
            amount,
            target,
            moduleAddress,
            functionName,
            sensitive,
            sensitivityReasons: reasons,
            confidence,
            timestamp: Date.now(),
        };
    }

    /**
     * Batch-parse multiple instructions
     */
    parseBatch(inputs: string[]): ParsedIntent[] {
        return inputs.map((input) => this.parse(input));
    }

    /**
     * Compute a confidence score (0.0–1.0) for the match
     */
    private computeConfidence(
        input: string,
        pattern: IntentPattern
    ): number {
        let score = 0.6; // base confidence

        // More extractors satisfied = higher confidence
        const extractors = pattern.extractors;
        let extractorCount = 0;
        let satisfiedCount = 0;

        if (extractors.amount) {
            extractorCount++;
            if (extractors.amount.test(input)) satisfiedCount++;
        }
        if (extractors.target) {
            extractorCount++;
            if (extractors.target.test(input)) satisfiedCount++;
        }
        if (extractors.moduleAddress) {
            extractorCount++;
            if (extractors.moduleAddress.test(input)) satisfiedCount++;
        }
        if (extractors.functionName) {
            extractorCount++;
            if (extractors.functionName.test(input)) satisfiedCount++;
        }

        if (extractorCount > 0) {
            score += 0.4 * (satisfiedCount / extractorCount);
        }

        return parseFloat(score.toFixed(2));
    }
}

// ─────────────────────────────────────────────────────
// Factory helper
// ─────────────────────────────────────────────────────

export function createIntentParser(
    config?: Partial<IntentParserConfig>
): IntentParser {
    return new IntentParser(config);
}
