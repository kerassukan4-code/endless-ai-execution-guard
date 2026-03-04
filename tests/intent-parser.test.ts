/**
 * Intent Parser — Unit Tests
 * Tests the natural language → structured action pipeline
 */

import { describe, it, expect } from "vitest";
import { IntentParser } from "../lib/intent-parser/parser.js";

describe("IntentParser", () => {
    const parser = new IntentParser();

    // ─── Transfer ────────────────────────────────────────────

    describe("transfer actions", () => {
        it("should parse basic transfer instruction", () => {
            const result = parser.parse("transfer 5000 tokens to 0xBob");
            expect(result.action).toBe("transfer");
            expect(result.amount).toBe(5000);
            expect(result.target).toBe("0xBob");
        });

        it("should parse 'send' as transfer", () => {
            const result = parser.parse("send 100 EDS to 0xAlice");
            expect(result.action).toBe("transfer");
            expect(result.amount).toBe(100);
            expect(result.target).toBe("0xAlice");
        });

        it("should parse 'pay' as transfer", () => {
            const result = parser.parse("pay 250 tokens to 0xCharlie");
            expect(result.action).toBe("transfer");
            expect(result.amount).toBe(250);
        });

        it("should flag large transfers as sensitive", () => {
            const result = parser.parse("transfer 5000 tokens to 0xBob");
            expect(result.sensitive).toBe(true);
            expect(result.sensitivityReasons.length).toBeGreaterThan(0);
        });

        it("should NOT flag small transfers as sensitive", () => {
            const result = parser.parse("transfer 10 tokens to 0xBob");
            expect(result.sensitive).toBe(false);
        });

        it("should have full confidence when all extractors match", () => {
            const result = parser.parse("transfer 5000 tokens to 0xBob");
            expect(result.confidence).toBe(1.0);
        });

        it("should handle comma-separated amounts", () => {
            const result = parser.parse("transfer 1,000,000 tokens to 0xWhale");
            expect(result.amount).toBe(1000000);
        });
    });

    // ─── Governance ──────────────────────────────────────────

    describe("governance actions", () => {
        it("should parse governance proposal", () => {
            const result = parser.parse(
                "submit a proposal to update minimum stake"
            );
            expect(result.action).toBe("governance_propose");
            expect(result.sensitive).toBe(true);
        });

        it("should parse 'propose' keyword", () => {
            const result = parser.parse("propose a new fee structure");
            expect(result.action).toBe("governance_propose");
        });

        it("should parse governance vote", () => {
            const result = parser.parse("governance vote on proposal 42");
            expect(result.action).toBe("governance_vote");
        });

        it("should parse 'cast a vote'", () => {
            const result = parser.parse("cast a vote for proposal xyz");
            expect(result.action).toBe("governance_vote");
        });

        it("should always flag governance as sensitive", () => {
            const vote = parser.parse("vote on proposal 1");
            expect(vote.sensitive).toBe(true);
        });
    });

    // ─── Deploy ──────────────────────────────────────────────

    describe("deploy actions", () => {
        it("should parse deploy instruction", () => {
            const result = parser.parse("deploy my smart contract");
            expect(result.action).toBe("deploy");
            expect(result.sensitive).toBe(true);
        });

        it("should parse 'publish module'", () => {
            const result = parser.parse("publish module 0xDeadBeef");
            expect(result.action).toBe("deploy");
            expect(result.moduleAddress).toBe("0xDeadBeef");
        });
    });

    // ─── Contract Call ───────────────────────────────────────

    describe("contract call actions", () => {
        it("should parse call_contract", () => {
            const result = parser.parse(
                "call contract 0xDeFi function swap"
            );
            expect(result.action).toBe("call_contract");
            expect(result.sensitive).toBe(true);
        });

        it("should parse 'execute function'", () => {
            const result = parser.parse("execute function mint on 0xNFT");
            expect(result.action).toBe("call_contract");
        });

        it("should extract module address from call", () => {
            const result = parser.parse(
                "call contract 0xABCDEF1234 function do_something"
            );
            expect(result.moduleAddress).toBe("0xABCDEF1234");
            expect(result.functionName).toBe("do_something");
        });
    });

    // ─── Staking ─────────────────────────────────────────────

    describe("staking actions", () => {
        it("should parse stake instruction", () => {
            const result = parser.parse(
                "stake 50000 EDS to validator 0xValidatorA"
            );
            expect(result.action).toBe("stake");
            expect(result.amount).toBe(50000);
            expect(result.target).toBe("validator");
        });

        it("should parse 'delegate' as stake", () => {
            const result = parser.parse("delegate 1000 tokens to 0xPool");
            expect(result.action).toBe("stake");
        });

        it("should parse unstake", () => {
            const result = parser.parse("unstake 5000 tokens");
            expect(result.action).toBe("unstake");
            expect(result.amount).toBe(5000);
        });
    });

    // ─── NFT & Burn ──────────────────────────────────────────

    describe("NFT and burn actions", () => {
        it("should parse mint_nft", () => {
            const result = parser.parse("mint an NFT");
            expect(result.action).toBe("mint_nft");
            expect(result.sensitive).toBe(true);
        });

        it("should parse burn", () => {
            const result = parser.parse("burn 500 tokens");
            expect(result.action).toBe("burn");
            expect(result.amount).toBe(500);
            expect(result.sensitive).toBe(true);
        });
    });

    // ─── Unknown / Edge Cases ────────────────────────────────

    describe("unknown actions and edge cases", () => {
        it("should return unknown for gibberish", () => {
            const result = parser.parse("xyzzy foobar baz");
            expect(result.action).toBe("unknown");
        });

        it("should have low confidence for unknown actions", () => {
            const result = parser.parse("do something random");
            expect(result.action).toBe("unknown");
            expect(result.confidence).toBe(0);
        });

        it("should handle empty string", () => {
            const result = parser.parse("");
            expect(result.action).toBe("unknown");
        });

        it("should preserve rawInput", () => {
            const input = "transfer 100 tokens to 0xTest";
            const result = parser.parse(input);
            expect(result.rawInput).toBe(input);
        });

        it("should include timestamp", () => {
            const before = Date.now();
            const result = parser.parse("transfer 1 token to 0xA");
            expect(result.timestamp).toBeGreaterThanOrEqual(before);
        });
    });

    // ─── Custom Config ───────────────────────────────────────

    describe("custom configuration", () => {
        it("should respect custom largeTransferThreshold", () => {
            const strictParser = new IntentParser({
                largeTransferThreshold: 50,
            });
            const result = strictParser.parse("transfer 60 tokens to 0xBob");
            expect(result.sensitive).toBe(true);
        });

        it("should NOT flag when below custom threshold", () => {
            const lenientParser = new IntentParser({
                largeTransferThreshold: 10000,
            });
            const result = lenientParser.parse(
                "transfer 5000 tokens to 0xBob"
            );
            expect(result.sensitive).toBe(false);
        });
    });

    // ─── Batch Parsing ───────────────────────────────────────

    describe("batch parsing", () => {
        it("should parse multiple intents", () => {
            const results = parser.parseBatch([
                "transfer 100 tokens to 0xA",
                "stake 500 EDS to validator 0xB",
                "burn 50 tokens",
            ]);
            expect(results).toHaveLength(3);
            expect(results[0]!.action).toBe("transfer");
            expect(results[1]!.action).toBe("stake");
            expect(results[2]!.action).toBe("burn");
        });
    });
});
