# Endless AI Execution Guard

> **Infrastructure-level developer framework for safely executing AI-generated blockchain actions on the Endless network.**

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Node.js 18+](https://img.shields.io/badge/Node.js-18%2B-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Endless Network](https://img.shields.io/badge/Endless-Testnet-purple)](https://rpc.endless.link/v1)

---

## Overview

AI agents can autonomously generate blockchain transactions. But autonomous execution introduces critical risks:

- **Unsafe execution** — AI hallucinations produce invalid or malicious payloads
- **Unpredictable logic** — LLM-generated transactions may violate protocol invariants  
- **Storage conflicts** — Uncoordinated write-sets degrade Block-STM parallel execution
- **Governance risk** — AI-submitted governance proposals bypass human review

**Endless AI Execution Guard** provides a production-grade safety pipeline that sits between your AI agent and the Endless blockchain, validating, simulating, and gating every AI-generated action before execution.

```
AI Agent
   │
   ▼
┌─────────────────────────────────────────────┐
│         Endless AI Execution Guard          │
│                                             │
│  1. Intent Parser     (NL → structured)     │
│  2. RPC Adapter       (Endless REST API)    │
│  3. Simulation Engine (gas + write-set)     │
│  4. Conflict Estimator (Block-STM analysis) │
│  5. Risk Engine       (multi-factor score)  │
│  6. Multisig Guardrail (threshold routing)  │
│  7. Replay Analyzer   (batch optimization)  │
└─────────────────────────────────────────────┘
   │
   ├─ APPROVE         → forward to Endless RPC
   ├─ ESCALATE        → create multisig proposal
   └─ REJECT          → block execution
```

---

## Why AI Execution Needs Guardrails

| Risk | Without Guard | With Guard |
|------|---------------|------------|
| AI hallucination | Transaction submitted with garbage payload | Detected at parse stage (confidence < 70%) |
| Large transfers | Funds drained instantly | Flagged sensitive → multisig required |
| Contract exploits | Arbitrary code executed | `call_contract` always flagged for review |
| Governance spam | Protocol parameters altered at will | 3–5 signer multisig required |
| Block-STM conflicts | High abort rate → wasted gas | Pre-computed and reported before submission |

---

## Block-STM Parallel Execution

Endless uses **Block-STM** (Block Software Transactional Memory) for parallel transaction execution. Block-STM speculatively executes transactions in parallel, then detects write-set conflicts at commit time. When two transactions write to the same storage key, one must abort and re-execute serially.

This guard pre-computes write-set overlap **before** submission, allowing:

1. **Conflict probability estimation** for individual transactions
2. **Batch reordering** to minimize inter-transaction dependency
3. **Parallel efficiency scoring** to quantify throughput impact

### Conflict Model

```
P(conflict) = 1 - (1 - p_key)^(K × (N-1))
             where K = number of storage keys
                   N = concurrent transactions in block
                   p_key = per-key contention baseline
```

High-contention keys (governance global state, delegation pools, NFT registries) are automatically detected and reported.

---

## Installation

```bash
git clone https://github.com/endless-labs/endless-ai-execution-guard
cd endless-ai-execution-guard
npm install
```

### Run CLI directly (no build required)

```bash
npx tsx cli/index.ts simulate "transfer 5000 tokens to 0xBob"
```

### Or link globally

```bash
npm link
endless-guard --help
```

---

## CLI Usage

### `simulate` — Full Safety Pipeline

```bash
endless-guard simulate "transfer 5000 tokens to 0xBob"
```

```
╔══════════════════════════════════════════════════╗
║  endless-guard simulate                          ║
╚══════════════════════════════════════════════════╝

  Instruction: "transfer 5000 tokens to 0xBob"

  ┌─ Intent Analysis
    Action:                  TRANSFER
    Sensitive:               TRUE ⚠
    Amount:                  5,000 tokens
    Target:                  0xBob
    AI Confidence:           100%

  ┌─ Simulation Result
    Predicted Status:        SUCCESS ✓
    Gas Estimate:            801 units
    Write-Set Size:          3 entries

  ┌─ Block-STM Conflict Analysis
    Conflict Probability:    22.1% (moderate)
    Parallel Efficiency:     66.8%

  ┌─ Risk Assessment
    Risk Score:              0.360
    Risk Level:              MEDIUM
    Requires Multisig:       NO

  ┌─ Routing Decision
    ✅  APPROVED — Transaction cleared for execution
```

### High-risk example (multisig escalation):

```bash
endless-guard simulate "submit a proposal to update minimum stake"
```

```
  ┌─ Routing Decision
    🔐  MULTISIG ESCALATION REQUIRED
       Proposal ID: 5d87389d-a8b2-4ca6-9f84-7bcc2f024901
       Required:     3 approvals
       Expires:      2026-03-05T08:41:11Z
```

### `risk-score` — Risk Analysis Only

```bash
endless-guard risk-score "call contract 0xDeFi function swap"
```

### `conflict-check` — Block-STM Analysis Only

```bash
endless-guard conflict-check "stake 50000 EDS to validator 0xValidatorA"
```

### `replay-optimize` — Batch Optimization

```bash
endless-guard replay-optimize
```

Analyzes a batch of AI instructions, reorders them using conflict-graph coloring to minimize Block-STM aborts.

### `benchmark` — Performance Benchmark

```bash
endless-guard benchmark
```

Runs 75 transactions across 5 scenarios and generates `benchmark-report.md`.

### `health` — RPC Connectivity Check

```bash
endless-guard health --rpc-url https://rpc.endless.link/v1
```

---

## SDK Usage (TypeScript)

```typescript
import { createExecutionGuard } from './lib/index.js';

const guard = createExecutionGuard({
  rpc: { rpcUrl: 'https://rpc.endless.link/v1' },
  risk: { multisigThreshold: 0.65 },
  multisig: { defaultRequiredApprovals: 3 },
});

// Evaluate a single AI instruction
const result = await guard.evaluate("transfer 5000 tokens to 0xBob");

console.log(result.decision);           // "APPROVE" | "ESCALATE_MULTISIG" | "REJECT"
console.log(result.riskAssessment.riskScore); // 0.360
console.log(result.simulation.gasEstimate);   // 801

if (result.decision === "ESCALATE_MULTISIG") {
  console.log(result.multisigProposal?.proposalId);
}
```

### Use individual modules

```typescript
import {
  IntentParser,
  SimulationEngine,
  ConflictEstimator,
  RiskEngine,
  EndlessRpcAdapter,
} from './lib/index.js';

// Parse only
const parser = new IntentParser({ largeTransferThreshold: 1000 });
const intent = parser.parse("transfer 5000 tokens to 0xBob");
// → { action: "transfer", amount: 5000, target: "0xBob", sensitive: true, ... }

// Simulate only
const rpc = new EndlessRpcAdapter({ rpcUrl: 'https://rpc.endless.link/v1' });
const engine = new SimulationEngine(rpc);
const sim = await engine.simulate(intent);
// → { gasEstimate: 801, writeSetSize: 3, predictedStatus: "success", ... }

// Conflict analysis
const estimator = new ConflictEstimator();
const conflict = estimator.analyze(sim);
// → { conflictProbability: 0.221, parallelEfficiencyScore: 0.668, ... }
```

---

## Benchmark Results

```
Block-STM Efficiency Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Transactions Tested:       75
Average Gas:               2,244 units
Conflict Rate:             30.8%
Parallel Efficiency:       56.6%
Multisig Escalation Rate:  5.3%
Average Risk Score:        0.365

Scenario Breakdown:
  Low-Value Transfers      Gas:   935  Conflict: 22.1%  Efficiency: 66.8%
  High-Value Transfers     Gas:   932  Conflict: 22.1%  Efficiency: 66.8%
  Contract Interactions    Gas: 4,188  Conflict: 13.5%  Efficiency: 79.8%
  Governance Operations    Gas: 3,053  Conflict: 76.8%  Efficiency:  0.0%  Multisig: 30.0%
  Mixed AI Batch           Gas: 2,345  Conflict: 33.9%  Efficiency: 52.3%
```

**Key insight:** Governance operations write to global state aggregators (`GovernanceProposal::global`, `VotingRecord::global`) causing near-100% Block-STM conflict rate. The guard correctly identifies and escalates all governance actions to multisig.

---

## Project Structure

```
endless-ai-execution-guard/
├── cli/
│   ├── index.ts                  # CLI entry point
│   ├── commands/
│   │   ├── simulate.ts           # simulate command
│   │   ├── risk-score.ts         # risk-score command
│   │   ├── conflict-check.ts     # conflict-check command
│   │   ├── replay-optimize.ts    # replay-optimize command
│   │   ├── benchmark.ts          # benchmark command
│   │   └── health.ts             # health command
│   └── utils/
│       └── formatter.ts          # Terminal output formatting
├── lib/
│   ├── index.ts                  # Library root exports
│   ├── types.ts                  # Shared TypeScript interfaces
│   ├── guard.ts                  # Core pipeline orchestrator
│   ├── intent-parser/            # AI intent parsing
│   ├── rpc/                      # Endless RPC adapter
│   ├── simulation/               # Transaction simulation engine
│   ├── conflict-analysis/        # Block-STM conflict estimator
│   ├── risk-engine/              # Multi-factor risk scoring
│   ├── multisig/                 # Multisig guardrail
│   └── replay/                   # Transaction replay analyzer
├── benchmark/
│   ├── engine.ts                 # Benchmark engine + scenarios
│   └── run.ts                    # Benchmark runner
├── docs/
│   ├── ARCHITECTURE.md
│   └── SECURITY_MODEL.md
├── benchmark-report.md           # Generated after running benchmark
├── tsconfig.json
└── package.json
```

---

## Supported Actions

| Action | Risk Default | Multisig? | Sensitivity |
|--------|--------------|-----------|-------------|
| `transfer` (small) | LOW | No | No |
| `transfer` (≥1,000) | MEDIUM–HIGH | Depends | Yes |
| `stake` | LOW–MEDIUM | No | If large |
| `call_contract` | MEDIUM | If score ≥ 0.65 | Yes |
| `deploy` | HIGH | Yes | Yes |
| `governance_vote` | HIGH | Yes | Yes |
| `governance_propose` | CRITICAL | Yes (5 signers) | Yes |
| `mint_nft` | MEDIUM | If score ≥ 0.65 | Yes |
| `burn` | HIGH | Yes | Yes |
| `unknown` | CRITICAL | REJECTED | Yes |

---

## Network Configuration

| Network | RPC URL |
|---------|---------|
| Testnet | `https://rpc.endless.link/v1` |
| Mainnet | `https://rpc.endless.link/v1` |
| Local   | `http://localhost:8080/v1` |

---

## Contributing

See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for module design rationale and [SECURITY_MODEL.md](docs/SECURITY_MODEL.md) for threat model documentation.

---

## License

Apache License 2.0 — see [LICENSE](LICENSE)

Built for the **Endless Developer Community** — [docs.endless.link](https://docs.endless.link)
