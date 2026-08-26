# AegisPay — Implementation Plan

> Status tracker lives in `AGENT.md` §6. This document is the approved build plan.

## 1. Goal

Autonomous chargeback-defense system: dispute webhook in → deterministic rule evaluation
→ EV routing → LangGraph drafter⇄auditor loop → dossier / merchant notice / escalation,
persisted to Postgres (Docker). Hackathon-demo grade.

## 2. Approved Stack

- Python 3.10+, LangGraph, langchain-groq, FastAPI, Pydantic v2, pytest
- LLM binding (user directive, migrated per AGENT.md ADR-008): `ChatGroq(model="openai/gpt-oss-120b",
  temperature=0, model_kwargs={"response_format": {"type": "json_object"}})` — pinned in `app/config.py`
  (original spec model `llama-3.3-70b-versatile` was retired by Groq)
- Webhook (user directive): synchronous by default; full completed state returned in the HTTP response body
- DB (user directive): PostgreSQL 16 on Docker Compose; `psycopg[binary]` v3; JSONB payload columns

## 3. Architecture

```
POST /webhooks/dispute  (sync)
   └─► parse_dispute ──► evaluate_rules ──► route_decision
        static reason-code lookup; miss → LLM fallback classifier
        CE3.0 pure-python math (never LLM)
        ├─ needs_human_review ──────────► finalize_escalated
        ├─ EV_fight ≤ EV_settle ────────► auto_settlement_notice ► finalize_settled
        └─ else ────────────────────────► draft_dossier ⇄ audit_dossier (≤2 iters)
                                            ├─ passed ► finalize_fought
                                            └─ exhausted ► finalize_escalated
```

## 4. File Tree

```
app/
├── config.py            Settings (env-driven, single source of truth)
├── db.py                DisputeRepository: init_schema / save / get / list  (psycopg3)
├── main.py              FastAPI app + /health (db status)
├── cli.py               python -m app.cli --fixture <path> [--no-db] [--pretty]
├── models/
│   ├── dispute.py       Network, ClaimType, TransactionTelemetry, DisputeEvent
│   ├── engine.py        EvidenceFlags, QualifyingTransaction, RuleEngineResult
│   └── outputs.py       EvidencePoint, DossierDraft, AuditVerdict, MerchantNotice, ClaimClassification
├── engine/
│   ├── reason_codes.py  Visa/Mastercard authoritative table; NPCI illustrative; miss→None
│   ├── ce3_rules.py     120–365d window, ≥2 qualifying txs, IP/device_hash hard-match, evidence flags, rejection reasons
│   └── expected_value.py win-prob heuristic + EV_fight/EV_settle + route decision
├── agents/
│   ├── llm.py           ChatGroq singleton (JSON mode), fence-strip → parse → repair-retry → Pydantic validate
│   ├── drafter.py       §1 prompt verbatim
│   ├── auditor.py       §2 prompt verbatim
│   ├── settlement.py    §3 prompt verbatim
│   └── classifier.py    §4 prompt verbatim
├── graph/
│   ├── state.py         AegisState TypedDict (total=False)
│   └── workflow.py      nodes, conditional edges, circuit breaker, serialize_result()
├── api/routes.py        POST /webhooks/dispute, GET /disputes, GET /disputes/{id}
└── utils/
    ├── masking.py       mask email/name/phone/PAN pre-LLM; keep ip_address + device_hash
    └── timeutil.py      ISO-8601 parser tolerant of "Z"

data/fixtures/   visa_ce3_qualified | visa_weak_no_match | mastercard_unknown_code | npci_udir_duplicate
tests/           test_reason_codes, test_ce3_rules, test_expected_value, test_masking, test_graph (+conftest)
```

Root: `docker-compose.yml`, `requirements.txt`, `.env.example`, `README.md`,
`AGENT.md`, `IMPLEMENTATION_PLAN.md`, `MASTER_PROMPT.md`.

## 5. Key Mechanics

### 5.1 Deterministic rule engine (CE3.0 / evidence flags)
- qualifying hist tx: parsed timestamp within [120, 365] days before disputed ts AND shares ip_address OR device_hash with disputed tx
- qualified ⇔ ≥2 qualifying txs
- every exclusion emits a specific human-readable rejection reason (feeds drafter + settlement notice)
- flags: three_ds_completed (ECI 05 / status completed), attempted_only (ECI 06 / attempted), named_recipient_signature, physical_delivery_proof, identifier_match_with_history

### 5.2 Win probability & EV routing
- base per claim_type: FRAUD_UNRECOGNIZED .35, PRODUCT_NOT_RECEIVED .30, DUPLICATE_CHARGE .55, SERVICE_NOT_AS_DESCRIBED .30, PROCESSING_ERROR .45, UNKNOWN .25
- adjustments: +.35 qualified | +.05 identifier-match-only; +.15 3DS complete | −.03 attempted; +.08 named signature; +.03 physical proof; clamp [.02,.95]
- `EV_fight = p·A − (1−p)(A+fee) − cost_to_fight`; `EV_settle = −A`; defaults fee=$15, cost_to_fight=$50
- escalate overrides whenever classification is UNKNOWN or confidence < 0.4

### 5.3 LLM JSON discipline (defense-in-depth)
server-side json_object mode → fence-strip regex → `json.loads` → fallback substring {…} extraction → ONE repair call re-sending raw output → Pydantic validate → safe default (ADR-006).

### 5.4 Persistence
```sql
CREATE TABLE IF NOT EXISTS disputes (
  dispute_id TEXT PRIMARY KEY,
  network TEXT NOT NULL, reason_code TEXT NOT NULL, claim_type TEXT NOT NULL,
  decision TEXT NOT NULL, final_status TEXT NOT NULL,
  win_probability DOUBLE PRECISION, iterations_used INTEGER NOT NULL DEFAULT 0,
  event_payload JSONB NOT NULL, result JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now());
```
Upsert on conflict. DB failure never fails the webhook — response carries `"persisted": false`.

## 6. Execution Order

1. AGENT.md + IMPLEMENTATION_PLAN.md
2. Scaffold (requirements/.env.example/docker-compose/config)
3. Models + utils
4. Deterministic engine
5. Agents
6. Graph
7. DB + API + CLI
8. Fixtures
9. Tests
10. **STOP — user sets up environment** (`docker compose up -d`, venv, `pip install -r requirements.txt`, `.env` with GROQ_API_KEY)
11. Run pytest; fix
12. Live Groq smoke test via CLI fixture runs + uvicorn

## 7. Acceptance Criteria

- `pytest` green without network/db (LLM fully mocked in integration tests)
- Strong fixture → decision=fight, audit passed within ≤2 iterations
- Weak fixture → decision=settle + merchant notice generated
- Unknown MC code → escalate path exercised via fallback classifier
- All four fixtures persist rows in Dockerized Postgres when run through CLI/API
