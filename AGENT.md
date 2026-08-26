# AegisPay — Agent Context File

> **READ THIS FIRST in every new session.** This file is the single source of project
> truth. Update the Work Log and Decisions Log after every milestone. If a session
> ends, the next session must be able to continue from this file alone.

---

## 1. Project Overview

**AegisPay** — autonomous chargeback-defense system for a payment gateway (hackathon build).

Flow: dispute webhook → deterministic reason-code parse (static table, LLM fallback on miss)
→ deterministic Visa CE3.0 rule evaluation → expected-value routing (fight vs auto-settle vs escalate)
→ LangGraph agent loop (`DefenseDrafterNode` ⇄ `AdversarialAuditorNode`, max 2 iterations)
→ finalized dossier / merchant notice / human-review escalation.
Results persisted to PostgreSQL (Docker). Prompts live verbatim in `MASTER_PROMPT.md`.

## 2. Hard Constraints (do NOT violate)

1. The LLM **never** computes qualification or EV math — deterministic engine only. Rule-engine result is injected pre-computed into prompts; drafter is told not to re-derive.
2. LLM may reference ONLY facts present in the injected telemetry block; missing facts become "Not available" (never guessed).
3. All agents output STRICT JSON: Groq `response_format={"type":"json_object"}` + fence-strip + one repair retry + Pydantic validation + safe-default fallback on total failure.
4. Audit circuit breaker: `max_iterations = 2`.
5. Stateless loop safety: auditor feedback + iteration count are re-injected on every drafter call (no reliance on conversation memory).
6. PII masking before any LLM call: mask email/name/PAN/phone; KEEP ip_address + device_hash (auditor verifies hard-identifier matches).
7. Classifier has an explicit uncertainty escape hatch → `UNKNOWN_REQUIRES_HUMAN_REVIEW`.

## 3. Stack & Bindings

| Component | Choice |
|---|---|
| Language | Python 3.10+ |
| Graph | LangGraph (`StateGraph`) |
| LLM client | `langchain-groq` → `ChatGroq(model="openai/gpt-oss-120b", temperature=0, model_kwargs={"response_format": {"type": "json_object"}})` (see ADR-008; originally llama-3.3-70b-versatile, retired by Groq) |
| API | FastAPI (sync webhook by design) |
| DB | PostgreSQL 16 via Docker Compose, driver `psycopg[binary]` v3, JSONB columns |
| Validation | Pydantic v2 |
| Tests | pytest |

Config single source of truth: `app/config.py` (env-overridable, see `.env.example`).

Webhook contract: **synchronous by default** — `def` endpoint calls `graph.invoke()` and returns the complete final state (dossier, audit trail, decision) in the HTTP response.

Response shape:
```json
{
  "dispute_id": "...", "network": "...", "reason_code": "...",
  "claim_type": "...", "classification_source": "static_table|llm_fallback",
  "decision": "fight|settle|escalate", "final_status": "...",
  "iterations_used": 1,
  "rule_engine": { "ce3_qualified": true, "qualifying_tx_count": 2, "...": "..." },
  "win_probability": 0.0, "expected_value_fight": 0.0, "expected_value_settle": 0.0,
  "dossier": null | {...}, "audit_trail": [...], "notice": null | {...},
  "persisted": true
}
```

## 4. Architecture

```
POST /webhooks/dispute
   └─► parse_dispute ──► evaluate_rules ──► route_decision
        (static lookup      (CE3.0 pure       ├─ needs_human_review ► finalize_escalated
         │ miss → LLM        python math)     ├─ EV_fight ≤ EV_settle ► auto_settlement_notice ► finalize_settled
         fallback classifier)                 └─ else ► draft_dossier ⇄ audit_dossier (≤ max_iterations)
                                                     ├─ passed ► finalize_fought
                                                     └─ exhausted ► finalize_escalated
```

CE3.0 qualification (deterministic): disputed tx + ≥2 historical undisputed txs,
each within **120–365 days** before the disputed transaction, each sharing at least one
hard identifier (**IP address OR device_hash**) with the disputed transaction.

EV routing math:
- `EV_fight = p·A − (1−p)(A + fee) − cost_to_fight`
- `EV_settle = −A` (chargeback fee is incurred only if the chargeback stands)
- fight iff `EV_fight > EV_settle` ⇔ `p > (fee+cost)/(2A+fee)`; escalate overrides when classification unknown.

Win-probability heuristic (deterministic): base per claim_type; +0.35 CE3.0 qualified;
+0.05 identifier match (when not qualified); +0.15 3DS completed (ECI 05); −0.03 attempted-only;
+0.08 named-recipient signature; +0.03 physical delivery proof; clamped [0.02, 0.95].

## 5. File Map

```
MASTER_PROMPT.md          prompts spec (verbatim source of all system/user templates)
AGENT.md                  this file
IMPLEMENTATION_PLAN.md    full approved plan
README.md                 quickstart + demo guide
requirements.txt          pinned deps
.env.example              env template (GROQ_API_KEY, DATABASE_URL, ...)
docker-compose.yml        postgres:16-alpine service "db" (aegis/aegis/aegispay @ localhost:5432)

app/
├── config.py             Settings dataclass (env-driven)
├── db.py                 psycopg3 repository (init_schema, save/get/list disputes)
├── lifecycle_repo.py     [Phase 1] psycopg3 lifecycle repository (transactions, payment_events, evidence_records)
├── main.py               FastAPI app factory + /health
├── cli.py                python -m app.cli --fixture data/fixtures/x.json [--no-db]
├── models/
│   ├── dispute.py        Network, ClaimType, TransactionTelemetry, DisputeEvent
│   ├── engine.py         EvidenceFlags, QualifyingTransaction, RuleEngineResult
│   ├── outputs.py        DossierDraft, AuditVerdict, MerchantNotice, ClaimClassification, EvidencePoint
│   └── lifecycle.py      [Phase 1] EventType, PaymentTransaction, PaymentEvent, EvidenceRecord, TransactionReconstruction
├── engine/
│   ├── reason_codes.py   static Visa/Mastercard/NPCI lookup (NPCI illustrative)
│   ├── ce3_rules.py      deterministic CE3.0 + evidence-flag evaluation
│   ├── expected_value.py win-prob heuristics + EV routing math
│   └── reconstruction.py [Phase 1] deterministic transaction reconstruction service (no LLM)
├── agents/
│   ├── llm.py            ChatGroq singleton, JSON extraction, repair retry, Pydantic validation
│   ├── drafter.py        DefenseDrafterNode  (prompt verbatim from MASTER_PROMPT.md §1)
│   ├── auditor.py        AdversarialAuditorNode (§2)
│   ├── settlement.py     AutoSettlementNode (§3)
│   └── classifier.py     reason-code fallback classifier (§4)
├── graph/
│   ├── state.py          AegisState TypedDict (+ Phase 1 lifecycle fields)
│   └── workflow.py       StateGraph wiring, enrich_from_lifecycle node, conditional edges, serialize_result()
├── api/
│   ├── routes.py         POST /webhooks/dispute (sync), GET /disputes[/{id}]
│   └── lifecycle_routes.py [Phase 1] POST /webhooks/payment-event, GET /transactions/{id}/timeline
└── utils/
    ├── masking.py        PII masking pre-LLM
    └── timeutil.py       tolerant ISO-8601 parsing (Z-suffix safe)

data/fixtures/            4 dispute webhooks + 2 lifecycle fixtures (see §8)
tests/                    unit tests (no LLM/db) + mocked-graph integration + lifecycle tests
```

## 6. Work Log / Status

| # | Milestone | Status |
|---|---|---|
| 1 | AGENT.md + IMPLEMENTATION_PLAN.md written (updated for Postgres/Docker) | DONE |
| 2 | Scaffold: requirements.txt, .env.example, README.md, docker-compose.yml, app/config.py | DONE |
| 3 | Models + utils (masking, timeutil) | DONE |
| 4 | Deterministic engine (reason_codes, ce3_rules, expected_value) | DONE |
| 5 | Agents (llm wrapper w/ json_object binding, drafter, auditor, settlement, classifier) | DONE |
| 6 | LangGraph state + workflow with circuit breaker + conditional edges | DONE |
| 7 | Postgres layer (app/db.py), FastAPI routes (sync webhook), main.py, cli.py | DONE |
| 8 | Mock fixtures ×4 | DONE |
| 9 | Test suite (unit + mocked-graph integration) written | DONE |
| 10 | User env setup (.env w/ GROQ key, venv deps, own postgres container) | DONE |
| 11 | pytest: **32/32 passed**; fixes during test phase → see ADR-008/009 | DONE |
| 12 | Live Groq smoke tests — all 4 fixtures verified end-to-end + persisted to Postgres | DONE |
| 13 | **Next.js 14 command dashboard** (`dashboard/`) — 3-panel UI, mock fallback, build green, live-verified vs backend | DONE |
| 14 | **Phase 1 — Transaction/Evidence Lifecycle Foundation:** domain models (lifecycle.py), normalized DB tables (lifecycle_repo.py), reconstruction service (reconstruction.py), event ingestion API (lifecycle_routes.py), AegisState enrichment (enrich_from_lifecycle node), fixtures ×2, test suite 16 new tests | DONE |

### Live-run verification results (2026-08-25)
| Fixture | decision | final_status | iterations | notes |
|---|---|---|---|---|
| visa_ce3_qualified | fight | DISPUTE_CONTESTED_DOSSIER_FINALIZED | 2 | auditor caught real arithmetic slip (192→193d); drafter fixed; passed @ 0.97 |
| visa_weak_no_match | settle | AUTO_SETTLED_MERCHANT_NOTIFIED | 0 | p=0.32, EV −89.00 vs −79.99; notice tip cites 120-day window |
| mastercard_unknown_code | escalate | ESCALATED_REQUIRES_HUMAN_REVIEW | 0 | llm_fallback classifier → UNKNOWN |
| npci_udir_duplicate | fight | DISPUTE_CONTESTED_DOSSIER_FINALIZED | 1 | dossier argued non-duplication (amount/order mismatch); passed @ 0.93 |

### Dashboard (`dashboard/`, Next.js 14 App Router + TS + Tailwind)
- `npm run dev` (port 3000) alongside backend on 8000; CORS added to FastAPI for localhost:3000.
- **Theme v2 (user directive): premium LIGHT theme, green/blue, no gradients.** Canvas #F7F9FB, white cards (`shadow-card` soft elevation), ink slate-navy #101B2D; azure #2563EB = interactive accent (buttons/focus/active tabs/current pipeline step); emerald #059669 strictly win/success; amber/red semantic. Glow shadows removed → `soft-pulse` opacity keyframe. Dossier document stays warm-zinc paper w/ border+`shadow-pop`.
- Panels: feed+metrics (left), telemetry+EV math+draft⇄audit trail (center), artifact inspector (right: dossier w/ SHA-256 hash & print-to-PDF / savings notice / escalation queue).
- Role switcher (Gateway Risk Lead ↔ Merchant Admin) swaps metric sets; scenario bar POSTs the 4 fixtures; LangGraph pipeline strip animates Parsing→CE3.0→Audit→Finalize during the synchronous call.
- Mock mode auto-engages when `/health` is unreachable — serves verified fixture responses so demos never break.
- Verified: `tsc --noEmit` clean, `next build` green (107 kB first load), GET / 200, CORS header correct, list endpoint returns all 4 persisted disputes.
- **Backend resilience hardening (ADR-011)** landed after user's live session hit a Groq `json_validate_failed` 400 that previously caused HTTP 500. Suite now **42/42 green**.

## 7. Decisions Log (ADRs)

- **ADR-001 — PostgreSQL via Docker replaces in-memory store.** User directive. Single `disputes` table, JSONB `event_payload` + `result`, upsert on dispute_id. App degrades gracefully (HTTP still returns result, `persisted:false`) if DB is down. DSN default `postgresql://aegis:aegis@localhost:5432/aegispay` (`AEGIS_DATABASE_URL`).
- **ADR-002 — Synchronous webhook.** User directive. `def` handler (threadpool) + `graph.invoke()`; no job queue for demo. Async mode = upgrade path.
- **ADR-003 — Groq JSON-mode binding.** User directive. `model="llama-3.3-70b-versatile"`, `response_format={"type":"json_object"}` passed explicitly via `model_kwargs`; defense-in-depth parsing kept regardless.
- **ADR-004 — EV parameters:** `dispute_fee_usd=15.00`, `cost_to_fight_usd=50.00`. Fee modeled as incurred only if the chargeback stands (`EV_settle=−A`). Tuned so weak-evidence small tickets auto-settle (threshold `p*=(fee+cost)/(2A+fee)`) while strong CE3.0 cases always fight.
- **ADR-005 — NPCI/UPI reason-code table is illustrative.** Only Visa/Mastercard tables are authoritative; NPCI codes route through the LLM fallback classifier when not found (which is exactly its designed purpose).
- **ADR-006 — Safe defaults on LLM failure:** unparseable dossier → honest "Insufficient" draft (audit will fail it); unparseable audit → `passed:false` (loop escalates); unparseable classification → UNKNOWN + human review. System never crashes on bad LLM output.
- **ADR-007 — Masking keeps IP/device_hash intact** because AdversarialAuditor checklist item #2 requires verifying exact identifier matches between transactions.
- **ADR-008 — Model migration to `openai/gpt-oss-120b`.** Groq returned 404 `model_not_found` for `llama-3.3-70b-versatile` on first live call (2026-08-25); the account's `/models` listing no longer includes it. Selected `openai/gpt-oss-120b` as the strongest available successor for structured JSON + formal tone. Binding contract unchanged (`response_format json_object`, temperature 0). User env note: they run their own postgres container (db `dezai`) instead of the compose service; `.env` `AEGIS_DATABASE_URL` points at it.
- **ADR-009 — Fixes discovered during live smoke tests (2026-08-25):**
  (a) **Telemetry block now includes disputed + ALL historical transactions** (was disputed-only) — drafter couldn't cite historical IP/device hashes and auditor couldn't verify identifier matches, causing guaranteed escalation deadlock on strong cases.
  (b) **`mask_record` wired into drafter + auditor prompt injection** — masking utility existed but wasn't applied before LLM calls; PII previously leaked to Groq.
  (c) **Calendar-day counting** in ce3_rules (`(disputed.date() − hist.date()).days`) so engine/auditor/drafter share one day-count definition (auditor flagged floored-time deltas as arithmetic errors).
  (d) **429 resilience:** `invoke_with_rate_limit_retry` (≤6 attempts, honors "try again in Xs", exp backoff) + `AEGIS_LLM_MAX_TOKENS=2048` cap for Groq free-tier TPM (8k/min).
  (e) primary_gap now reports "None — CE3.0 qualifying evidence chain satisfied." when qualified instead of the default gap text.
- **ADR-011 — LLM fault containment (found via user's live dashboard session):** Groq intermittently returns HTTP 400 `json_validate_failed` with the model's near-valid JSON embedded in `error.failed_generation` (observed: one stray `}` / missing `]`). Fixes: (1) `balance_json_text()` deterministically repairs mismatched/missing closers + unclosed strings; `extract_json_object()` now tries direct → substring → balanced candidates; (2) `_call()` catches ALL non-rate-limit LLM errors, salvages `failed_generation` (via SDK `.body`, regex fallback) and parses it; (3) route-level guard in `/webhooks/dispute` converts any pipeline exception into a safe ESCALATED human-review result — **HTTP 500s are now impossible**. Verified in production: a TPM-exhausted run degraded to the honest "Insufficient" draft → auditor rejected 2× → circuit-breaker escalation (no crash); immediate retry passed iter-1 @ 0.96. Regression coverage: `tests/test_llm_json.py` (10 tests; suite total 42).
- **ADR-010 — Dashboard stack & decisions:** Next.js 14.2.35 (14.2.32 flagged by security advisory) + React 18 + Tailwind 3 + lucide-react only (hand-rolled primitives, no Radix dep). System font stacks instead of Google Fonts (no build-time network fetch). Amounts cache seeded from fixtures because `GET /disputes` list rows omit `amount` — metrics sum known amounts. Ops-decision buttons on escalation card are client-side demo state (backend has no such endpoint yet — listed as upgrade path).
- **ADR-012 — Phase 1 lifecycle persistence layer.** Three normalized tables (`transactions`, `payment_events`, `evidence_records`) added alongside existing `disputes` table; no JSONB blobs for lifecycle data. `LifecycleRepository` follows same thread-safe pattern as `DisputeRepository`. `enrich_from_lifecycle` node is inserted as the first node in the LangGraph workflow (`START → enrich → parse_dispute → ...`); returns empty dict when no lifecycle data exists, preserving all existing behavior. Reconstruction service is pure deterministic (no LLM). Event ingestion endpoint enforces `event_id` idempotency via primary key constraint. All 42 original tests still pass; 16 new lifecycle tests added (58 total).

## 8. Fixture Scenarios (`data/fixtures/`)

| File | Network/code | Expected path |
|---|---|---|
| `visa_ce3_qualified.json` | VISA 10.4, $495.00, device+IP match on 2 hist txs (264d & 193d), 3DS ECI 05, named signature | FIGHT → dossier passes audit (observed: pass on iter 2 @ 0.97) |
| `visa_weak_no_match.json` | VISA 10.4, $79.99, hist txs <120d, NO identifier match, 3DS attempted-only, no signature | SETTLE → merchant notice (p=0.32) |
| `mastercard_unknown_code.json` | MASTERCARD 99.99 (not in table) | LLM fallback classifier → UNKNOWN → ESCALATE |
| `npci_udir_duplicate.json` | NPCI FRM-DUP, $310.00 | static hit → DUPLICATE_CHARGE → FIGHT (observed: pass on iter 1 @ 0.93 — dossier argues non-duplication) |
| `normal_transaction.json` | Lifecycle fixture: complete checkout→auth→payment→order→fulfillment (no dispute) | Used for lifecycle ingestion + reconstruction tests |
| `disputed_transaction.json` | Same lifecycle + DISPUTE_OPENED event | Used for disputed lifecycle reconstruction tests |

## 9. Known Gaps / Upgrade Paths

- No auth on webhook (demo).
- Async webhook mode (?sync=false) + job queue.
- Alembic migrations once schema evolves beyond v1.
- Model diversity per node (auditor on stronger model).
- Win-probability calibration from historical outcomes.
- Phase 2: ML fraud firewall leveraging lifecycle evidence.
- Phase 3: Graph analytics across transaction/merchant networks.

---

## 10. SESSION HANDOFF — updated 2026-08-25 (post-verification)

**State: SYSTEM FULLY VERIFIED END-TO-END.** 32/32 tests green; all 4 fixtures ran against live
Groq (`openai/gpt-oss-120b`) with results persisted to the user's Postgres container.
See Work Log "Live-run verification results" table for observed outcomes and ADR-008/009 for
every fix made during verification.

### If resuming
- Everything runs via: `.venv\Scripts\Activate.ps1`, then `pytest -q`,
  `python -m app.cli --fixture data/fixtures/<x>.json --pretty`, or `uvicorn app.main:app --reload`.
- DB = user's own postgres container (`postgres`, port 5432, db `dezai`; DSN in local `.env`).
- Groq free tier ≈ 8k TPM per model → expect 429 backoff pauses between agent calls (by design).
- Remaining upgrade paths are listed in §9; nothing is blocking.
