# System Architecture — Endless AI Execution Guard

## Research Findings

### Endless Ecosystem Analysis

**Platform:** Endless is a Move-based blockchain platform (Endless Web3 Genesis Cloud) that integrates AI, serverless architecture, and distributed frameworks. It uses a REST API for node interaction aligned with the Aptos API design (OpenAPI 3.0), with key differences in chain-level branding and specific module addresses.

**SDK ecosystem:** The primary TypeScript SDK is `@endlesslab/endless-ts-sdk` (v1.0.0). Ecosystem projects like the Endless Multisender use Vite + vanilla JS with the SDK for token operations. The API exposes endpoints at `https://rpc.endless.link/v1` with typed JSON responses.

**RPC API structure:**
- `GET /` — ledger info (chain ID, epoch, block height)
- `GET /accounts/{address}` — sequence number + auth key
- `GET /accounts/{address}/resources` — Move resources
- `POST /transactions/simulate` — dry-run with write-set output
- `GET /transactions/{hash}` — finalized transaction data

**Move module conventions:**
- Core modules at `0x1::` prefix (e.g., `0x1::endless_coin`, `0x1::endless_governance`)
- Token/NFT handled by `0x3::token::`
- Module IDs follow `{address}::{module_name}` format

**Block-STM:** Endless uses Block-STM for parallel execution. Transactions share storage key space and conflicts cause speculative abort cycles, reducing throughput.

---

## Architecture Principles

### 1. Module Separation of Concerns

Each module has a single, well-defined responsibility:

```
ParsedIntent ←─── IntentParser
      │
      ▼
SimulationResult ←─── SimulationEngine ←─── EndlessRpcAdapter
      │
      ▼
ConflictAnalysis ←─── ConflictEstimator
      │
      ▼  
RiskAssessment ←─── RiskEngine
      │
      ▼
GuardResult ←─── ExecutionGuard (pipeline orchestrator)
      │
      ├── APPROVE
      ├── ESCALATE_MULTISIG ←─── MultisigGuardrail
      └── REJECT
```

### 2. Offline-First Design

All modules operate with a **synthetic fallback** mode. This means:
- The full pipeline runs without any network access
- CI/CD pipelines can test without live RPC
- Developers on airgapped environments can still analyze intents

The RPC adapter uses exponential backoff retry with graceful degradation to the synthetic simulation engine when the node is unreachable.

### 3. Type Safety

All module boundaries use strict TypeScript interfaces defined in `lib/types.ts`. No `any` types cross module boundaries. All inputs are validated structurally (Zod integration is available for runtime validation of external inputs).

### 4. Composability

Modules are designed for independent use:

```typescript
// Use only the conflict analyzer (no intent parsing needed)
const estimator = new ConflictEstimator();
const analysis = estimator.analyze(existingSimulationResult);

// Use only the risk engine
const engine = new RiskEngine({ multisigThreshold: 0.70 });
const risk = engine.calculateRiskScore(intent, simulation, conflict);
```

---

## Module Deep Dives

### IntentParser

**Pattern matching approach:** Uses a priority-ordered array of `IntentPattern` definitions, each with:
- `patterns: RegExp[]` — ordered from most specific to least specific
- `extractors: { amount?, target?, moduleAddress?, functionName? }` — entity extraction

**Pattern priority order** (high → low specificity):
1. `governance_propose` — matches "submit a proposal", "propose"
2. `governance_vote` — matches "governance vote", "cast a vote"
3. `deploy` — matches "deploy", "publish module"
4. `call_contract` — matches "call contract", "execute function"
5. `transfer` — matches "transfer", "send", "pay"
6. `mint_nft` — matches "mint"
7. `burn` — matches "burn"
8. `stake` / `unstake`

**Confidence scoring:**
```
confidence = 0.6 (base) + 0.4 × (satisfied_extractors / total_extractors)
```

### SimulationEngine

**Action → Move function mapping:**

| Action | Move Function |
|--------|---------------|
| transfer | `0x1::endless_account::transfer_coins` |
| stake | `0x1::delegation_pool::add_stake` |
| deploy | `0x1::code::publish_package_txn` |
| governance_vote | `0x1::endless_governance::vote` |
| mint_nft | `0x3::token::create_token_script` |

**Synthetic simulation gas model:**

| Action | Base Gas | Jitter |
|--------|----------|--------|
| transfer | 800 | ±300 |
| stake | 1,400 | ±300 |
| deploy | 12,000 | ±300 |
| governance ops | 2,000–5,000 | ±300 |
| mint_nft | 3,500 | ±300 |

### ConflictEstimator

**Key contention model:**

```
p_key = base_rate(0.05) + hot_boost(ratio × 0.4) + key_count_factor(n × 0.01)
P(conflict) = 1 - (1 - p_key)^K × (1 - (1 - compound_p)^(N-1))
```

**Hot key patterns** (automatically detected):
- `0x1::endless_governance::*` — global governance state
- `0x1::stake::StakePool::*` — shared stake pools
- `::DelegationPool::*` — delegation aggregators
- `::Collections::global` — NFT collection registries
- `sequence_number` — account sequence counters

**Parallel efficiency:**
```
efficiency = max(0, 1 - abort_rate × 1.5)
```

### RiskEngine

**Factor weights:**

| Factor | Weight | Triggers |
|--------|--------|---------|
| Transfer Size | 25% | Transfer ≥ threshold |
| Contract Interaction | 20% | call_contract or deploy |
| Storage Conflict | 15% | Any conflict probability |
| AI Uncertainty | 10% | Always (1 - confidence) |
| Governance | 15% | governance_* actions |
| Unknown Action | 10% | action === "unknown" |
| Sensitivity Flag | 5% | sensitive === true |
| High Gas Cost | 5% | gas > 5,000 units |

**Multisig signer requirements:**

| Risk Score | Required Signers |
|------------|-----------------|
| ≥ 0.85 | 5 |
| ≥ 0.75 | 4 |
| ≥ 0.65 | 3 |
| < 0.65 | configurable (default: 3) |

### ReplayAnalyzer

**Optimization algorithm:**

1. Build N×N conflict matrix using pairwise Jaccard similarity on storage key sets
2. Apply greedy graph coloring to partition into conflict-free groups
3. Within each group, sort by ascending risk score (safer first)
4. Flatten into optimized execution order

**Efficiency formula:**
```
efficiency(ordering) = max(0, 1 - avg_conflict_probability × 1.8)
improvement = (optimized - baseline) / baseline × 100%
```

---

## Data Flow Diagrams

### Single Transaction Evaluation

```
Input: "transfer 5000 tokens to 0xBob"
         │
         ▼ IntentParser.parse()
ParsedIntent {
  action: "transfer",
  amount: 5000,
  target: "0xBob",
  sensitive: true,
  confidence: 1.0
}
         │
         ▼ SimulationEngine.simulate()
SimulationResult {
  gasEstimate: 801,
  writeSetSize: 3,
  predictedStatus: "success",
  storageKeys: [
    "0x1::account::Account::0xSender",
    "0x1::coin::CoinStore<EndlessCoin>::0xSender",
    "0x1::coin::CoinStore<EndlessCoin>::0xBob"
  ]
}
         │
         ▼ ConflictEstimator.analyze()
ConflictAnalysis {
  conflictProbability: 0.221,
  parallelEfficiencyScore: 0.668,
  optimizationSuggestion: "..."
}
         │
         ▼ RiskEngine.calculateRiskScore()
RiskAssessment {
  riskScore: 0.360,
  riskLevel: "MEDIUM",
  requiresMultisig: false,
  recommendation: "APPROVE: ..."
}
         │
         ▼ ExecutionGuard.route()
GuardResult {
  decision: "APPROVE",
  ...
}
```

---

## Extension Points

### Custom Risk Factors

```typescript
// Extend the RiskEngine by subclassing
class DomainRiskEngine extends RiskEngine {
  // Override thresholds per domain
}

const engine = new DomainRiskEngine({
  largeTransferThreshold: 500,  // stricter threshold
  multisigThreshold: 0.50,     // lower escalation bar
  rejectThreshold: 0.85,
});
```

### Custom Intent Patterns

```typescript
const parser = new IntentParser({
  largeTransferThreshold: 100,  // conservative for high-security env
  flagContractInteractions: true,
  flagGovernanceOps: true,
});
```

### Production Multisig Integration

In production, the `MultisigGuardrail` proposal lifecycle connects to the Endless on-chain `multisig_account` contract:

```typescript
// Proposals would call:
// 0x1::multisig_account::create_transaction()
// 0x1::multisig_account::approve_transaction()
// 0x1::multisig_account::execute_rejected_transaction()
```

The `MultisigGuardrail.multisigAccountAddress` config maps to the on-chain account.
