# Security Model — Endless AI Execution Guard

## Threat Model

This document describes the security assumptions, threats addressed, and mitigations implemented by the Endless AI Execution Guard.

---

## Trust Assumptions

| Component | Trusted? | Notes |
|-----------|----------|-------|
| AI Agent (LLM) | **NOT trusted** | Primary threat source — treated as adversarial input |
| Endless RPC Node | Partially trusted | Connectivity checked; results independently validated |
| Multisig signers | Trusted | Human operators in the approval chain |
| Intent parser | Trusted | Deterministic regex-based — no external calls |
| Risk engine | Trusted | Pure function — no external state |

---

## Threats Addressed

### T1 — AI Hallucination / Prompt Injection

**Threat:** An LLM agent generates a blockchain instruction containing:
- A fabricated target address (e.g., attacker-controlled)
- An instruction that exceeds intended scope ("transfer all tokens")
- A prompt-injection attack that overrides safety instructions

**Mitigation:**
- Intent parser assigns a **confidence score** to every parsed intent
- Intents with confidence < 70% produce a warning and increase risk score
- The `AI Generation Uncertainty` risk factor (weight: 10%) penalizes low-confidence parses
- Unknown actions are **always rejected** regardless of risk score

### T2 — Large Fund Transfers

**Threat:** An AI agent sends a large transfer instruction (e.g., drain an account).

**Mitigation:**
- `largeTransferThreshold` (default: 1,000 tokens) triggers `sensitive: true`
- Transfer Size risk factor scales linearly to `amount / (threshold × 10)`
- At high amounts, risk score crosses the multisig threshold → human approval required

### T3 — Smart Contract Exploitation

**Threat:** An AI agent generates a `call_contract` instruction targeting a malicious or buggy contract.

**Mitigation:**
- All `call_contract` and `deploy` actions set `sensitive: true`
- Contract Interaction factor (weight: 20%) adds significant risk score
- Simulation detects aborts from the contract before submission
- Deploy actions receive risk score ≥ 0.9 → always escalated

### T4 — Governance Manipulation

**Threat:** An AI agent autonomously submits governance proposals or votes, potentially altering protocol parameters.

**Mitigation:**
- `governance_propose` receives risk score ≈ 0.85 (Governance factor: 85%)
- `governance_vote` receives significant risk boost
- Governance actions write to global hot keys → near-100% conflict detection triggers warning
- Effectively all governance operations require multisig (3–5 signers)

### T5 — Block-STM Resource Exhaustion

**Threat:** An AI batch of transactions all write to the same hot storage keys, causing massive abort rates and gas waste.

**Mitigation:**
- Conflict estimator detects hot key patterns before submission
- Conflict probability reported to operator for manual review
- `replay-optimize` command reorders batches to minimize conflicts
- High conflict probability (>50%) adds warnings to guard result

### T6 — Replay Attacks

**Threat:** A signed transaction is captured and rebroadcast.

**Mitigation:** Replay protection is handled at the Endless protocol level via monotonically increasing account sequence numbers. The guard validates `sequenceNumber` against the RPC before simulation.

### T7 — RPC Spoofing / MITM

**Threat:** A compromised RPC node returns false simulation results, tricking the guard into approving malicious transactions.

**Mitigation:**
- Guard is designed for **defense in depth**: even with a spoofed RPC that says simulation succeeded, the risk engine still evaluates from the parsed intent + write-set
- Production deployments should use TLS-verified RPC endpoints and optionally cross-check multiple nodes
- The synthetic fallback mode can be used for risk scoring without any RPC trust

---

## Risk Score Interpretation

| Score | Level | Action |
|-------|-------|--------|
| 0.00 – 0.24 | LOW | Auto-approve with single signer |
| 0.25 – 0.49 | MEDIUM | Auto-approve with caution warning |
| 0.50 – 0.64 | HIGH | Caution — verify on testnet first |
| 0.65 – 0.89 | HIGH (multisig) | Escalate — 3–5 signers required |
| 0.90 – 1.00 | CRITICAL | Auto-reject — do not execute |

---

## Multisig Flow Security

```
AI Agent generates instruction
         │
         ▼
  Guard evaluates → risk ≥ 0.65
         │
         ▼
  MultisigGuardrail.createProposal()
  - Assigns proposalId (UUID v4)
  - Records intent + simulation + risk in proposal
  - Sets TTL (default: 24 hours)
         │
         ▼
  Human signers review via external system:
  guard.multisigGuardrail.approve(proposalId, signerAddress)
         │
         ▼
  Once ≥ N signatures collected:
  proposal.status = "APPROVED"
         │
         ▼
  Transaction submitted on-chain
  guard.multisigGuardrail.markExecuted(proposalId)
```

**Security properties of the proposal:**
- Proposals are **immutable** once created (payload cannot be changed after creation)
- Each signer can only approve **once** (duplicate check prevents signature replay)
- Proposals **expire** after 24h if not fully approved (configurable TTL)
- Rejected proposals are **permanently blocked** and cannot be re-approved

---

## Sensitive Action Classification

An action is classified as `sensitive: true` if any of the following apply:

1. Transfer amount ≥ `largeTransferThreshold`
2. Action is `call_contract` or `deploy`
3. Action is `governance_vote` or `governance_propose`
4. Action is `burn` (irreversible)
5. Action is `mint_nft`

All sensitive actions produce explicit `sensitivityReasons` for operator review.

---

## Deployment Security Checklist

- [ ] Set `largeTransferThreshold` appropriate for your token denomination
- [ ] Configure `multisigThreshold` based on your risk tolerance (recommend 0.50–0.65)
- [ ] Deploy multisig signers on separate key stores (HSM preferred)
- [ ] Set proposal TTL based on your operational response time
- [ ] Monitor `conflictRate` — sustained >50% indicates a batch structuring problem
- [ ] Review all `ESCALATE_MULTISIG` proposals before signing
- [ ] Never sign REJECT-status proposals or expired proposals
- [ ] Run `endless-guard health` before each production session to verify RPC connectivity
- [ ] Use testnet simulation for new AI agent instructions before mainnet deployment
- [ ] Log all `GuardResult` decisions for audit trail

---

## Known Limitations

1. **No cryptographic intent verification** — The intent parser cannot verify that an AI instruction originated from an authorized agent. In production, add a signing mechanism to authenticate AI agent output.

2. **Synthetic gas estimates** — When the RPC is unavailable, gas estimates may deviate from real values by ±30%. Always run with live RPC for high-value transactions.

3. **Regex-based NL parsing** — The intent parser uses deterministic regex patterns, not a semantic NLP model. Novel phrasings may be misclassified as `unknown` (triggering rejection) rather than the correct action.

4. **No on-chain enforcement** — This guard is client-side only. A determined attacker who bypasses this SDK can still submit directly to the RPC. For maximum security, use Endless's on-chain `multisig_account` module as the final execution gatekeeper.

5. **Conflict estimation is probabilistic** — The conflict estimator produces probability estimates, not guarantees. A transaction estimated at 5% conflict may still conflict in practice if the block happens to include many contending transactions.
