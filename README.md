# AegisPay

Autonomous chargeback-defense system: dispute webhooks in → deterministic Visa CE3.0 /
Mastercard / NPCI rule evaluation → expected-value routing → LangGraph
drafter⇄auditor agent loop → dossier, merchant notice, or human-review escalation.
Results persist to PostgreSQL (Docker). All agent prompts live verbatim in `MASTER_PROMPT.md`;
project context lives in `AGENT.md`.

## Architecture

```
POST /webhooks/dispute  (synchronous — full result returned in the HTTP response)
   └─► parse_dispute ──► evaluate_rules ──► route_decision
        static reason-code table; miss → LLM fallback classifier
        CE3.0 math is pure Python (the LLM never computes qualification)
        ├─ unknown claim ───────────────► ESCALATE (human review)
        ├─ EV_fight ≤ EV_settle ────────► AUTO-SETTLE + merchant notice
        └─ else ────────────────────────► DRAFT ⇄ AUDIT (max 2 iterations)
                                            ├─ passed ► dossier finalized
                                            └─ exhausted ► escalate
```

## Quickstart

```powershell
# 1. Database
docker compose up -d

# 2. Python env (3.10+)
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# 3. Config
Copy-Item .env.example .env
#   → set GROQ_API_KEY in .env

# 4. Run the API
uvicorn app.main:app --reload

# 5. Or run a fixture through the pipeline without HTTP
python -m app.cli --fixture data/fixtures/visa_ce3_qualified.json --pretty
```

## Fixtures (`data/fixtures/`)

| File | Scenario | Expected outcome |
|---|---|---|
| `visa_ce3_qualified.json` | Strong CE3.0 case: device+IP match, txs 264d & 193d old, 3DS complete, signed delivery | FIGHT → dossier passes audit |
| `visa_weak_no_match.json` | Hist txs <120d, no identifier match, 3DS attempted only | SETTLE → merchant notice |
| `mastercard_unknown_code.json` | Reason code `99.99` not in static table | LLM fallback → UNKNOWN → ESCALATE |
| `npci_udir_duplicate.json` | RuPay/UPI duplicate-processing code | Static hit → FIGHT |

## API

- `POST /webhooks/dispute` — body = dispute webhook JSON (see fixtures). Returns the full final state:
  decision, rule-engine result, win probability, EVs, dossier, audit trail, notice, `persisted` flag.
- `GET /disputes` — recent disputes (requires DB up).
- `GET /disputes/{id}` — full stored record.
- `GET /health` — service + database status.

## Design guarantees

1. LLM never computes qualification/EV — deterministic engine only.
2. LLM may cite only facts present in the masked telemetry block; missing facts render as "Not available".
3. Every agent call enforces JSON mode (`response_format={"type":"json_object"}`) plus fence-strip,
   one repair retry, and Pydantic validation; unparseable output degrades to safe defaults.
4. PII (email/name/phone/PAN) masked before any LLM call; IP/device hashes retained so the auditor
   can verify hard-identifier matches.
5. Audit circuit breaker caps the loop at `AEGIS_MAX_AUDIT_ITERATIONS` (default 2).

## Tests

Unit tests are hermetic (no network, no DB). Integration tests mock the agent LLM calls.

```powershell
pytest -v
```

## Phase 1: Transaction Lifecycle Evidence

AegisPay now maintains a **persistent merchant-side transaction/event lifecycle** for cross-lifecycle
payment intelligence. When a dispute arrives, the system checks for stored lifecycle data and enriches
the dispute processing pipeline with reconstructed evidence.

### Lifecycle Events

Events follow the canonical payment lifecycle:

```
CHECKOUT_STARTED → AUTHENTICATION_COMPLETED → PAYMENT_AUTHORIZED → PAYMENT_CAPTURED
→ ORDER_CONFIRMED → FULFILLMENT_STARTED → DELIVERED
```

Each event carries an integrity hash (SHA-256) and is free of raw PAN/sensitive PII.

### New Endpoints

- `POST /webhooks/payment-event` — ingest merchant lifecycle events (idempotent on `event_id`)
- `GET /transactions/{id}/timeline` — retrieve a reconstructed transaction timeline with
  completeness score, missing evidence, contradictions, and duplicates

### Transaction Reconstruction

Pure deterministic service (no LLM): given a `transaction_id`, returns:
- Ordered timeline of events
- Evidence present / missing
- Contradictory events (e.g., `DELIVERED` before `FULFILLMENT_STARTED`)
- Duplicate events
- Lifecycle completeness score (0.0–1.0)

### Dispute Integration

When a dispute arrives via `POST /webhooks/dispute`:
- If the disputed `transaction_id` exists in the lifecycle store, the timeline is reconstructed
  and injected into `AegisState` (fields: `transaction_timeline`, `evidence_missing`,
  `evidence_conflicts`, `evidence_completeness`)
- If no lifecycle data exists, the pipeline operates exactly as before

### Lifecycle Fixtures (`data/fixtures/`)

| File | Scenario |
|---|---|
| `normal_transaction.json` | Complete lifecycle: checkout → auth → payment → order → fulfillment (no dispute) |
| `disputed_transaction.json` | Same lifecycle + `DISPUTE_OPENED` event |

## Phase 2: Behavioral Intent Firewall

AegisPay includes a **deterministic, explainable, low-latency Behavioral Intent Firewall** that operates BEFORE and DURING payment processing.

> [!IMPORTANT]
> **No ML model or LLM is used in the real-time Intent Firewall.**
> The firewall prioritizes deterministic, explainable, sub-millisecond behavioral signals. ML can be introduced later for score calibration once sufficiently reliable historical outcomes exist.

### Core Pipeline

```
Checkout / Session Telemetry
      ↓
Deterministic Feature Extraction (27 features: velocity, retries, instruments, infra, session, history)
      ↓
Behavioral Intent Engine (weighted components + multi-signal combination boost)
      ↓
Risk Score [0.0 - 1.0] + Intent Class + Explainable Signals
      ↓
Action Policy: ALLOW (<0.3) / CHALLENGE (0.3-0.7) / BLOCK (≥0.7)
      ↓
Payment lifecycle continues → Assessment persisted as context (never alters dispute logic)
```

### Intent Classes

- `NORMAL`: Behavior within expected baselines
- `CARD_TESTING`: High velocity + rapid retries + failure concentration + multiple instruments
- `AUTOMATED_CHECKOUT`: Bot-like inter-event timing consistency (<0.5s stddev) + fast checkout (<2s)
- `ACCOUNT_TAKEOVER_LIKE`: Rapid device/IP switching on an account + velocity spikes
- `SUSPICIOUS_VELOCITY`: Abnormal payment attempt frequency exceeding baselines
- `UNKNOWN`: Insufficient session telemetry (strictly defaults to `ALLOW`)

### Behavioral Features (27 Dimensions)

- **Velocity:** `payment_attempts_last_1m`, `payment_attempts_last_5m`, `payment_failures_last_1m`, `payment_failures_last_5m`, `events_per_second`
- **Retry Behavior:** `retry_count`, `avg_retry_interval_s`, `min_retry_interval_s`, `rapid_retry_ratio`
- **Payment Variation:** `unique_instrument_count`, `amount_variance`, `amount_change_ratio`
- **Identity & Infrastructure:** `accounts_on_device`, `devices_on_account`, `accounts_on_ip`, `ips_on_account`, `device_change_count`, `ip_change_count`
- **Session Behavior:** `session_duration_s`, `checkout_to_payment_s`, `failed_to_success_ratio`, `event_interval_stddev`
- **Historical Context:** `historical_txn_count`, `historical_failure_rate`, `historical_payment_velocity`, `historical_device_count`, `historical_ip_count`

### Endpoints

- `POST /risk/evaluate-session` — evaluate session events for real-time risk & intent
- `GET /risk/assessments/{session_id}` — retrieve stored firewall assessments

### Synthetic Environment & Evaluation CLI

```powershell
# Generate synthetic dataset (13 scenarios: 5 card testing variants, ATO, bots, shared device/IP, retries)
python -m app.synthetic generate --sessions 1000 --seed 42

# Evaluate firewall performance
python -m app.synthetic evaluate --sessions 1000 --seed 42

# Run Session-Only vs Lifecycle-Aware Ablation
python -m app.synthetic ablation --sessions 1000 --seed 42
```

*Note: The dataset is synthetic and used solely for behavioral intelligence validation. It does not represent Razorpay proprietary data.*

### Measured Evaluation Performance (988 synthetic sessions)

- **Precision:** 88.89%
- **Recall:** 88.89%
- **F1 Score:** 88.89%
- **Execution Latency:** P50 = 0.35ms, P95 = 0.69ms, P99 = 1.09ms (Measured on local runtime)

## Upgrade paths

Auth on webhook · async webhook mode with job queue · Alembic migrations · per-node model diversity ·
win-probability calibration from historical outcomes · ML fraud calibration · Phase 3 graph analytics.

