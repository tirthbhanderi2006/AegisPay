"""Public V1 Risk Evaluation and Investigation API."""

from datetime import datetime, timezone
import logging
import re
import time
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response
from pydantic import BaseModel, Field, field_validator

from app.api.v1.versioning import get_request_id
from app.audit.models import RiskDecisionSnapshot
from app.audit.replay import replay_decision
from app.audit.repository import audit_repo
from app.auth.middleware import get_authenticated_merchant, verify_merchant_ownership
from app.auth.models import AuthenticatedMerchant
from app.calibration.models import FEATURE_SCHEMA_VERSION
from app.calibration.registry import calibration_registry
from app.currency.converter import currency_converter
from app.decision.models import (
    AuditInfo,
    DecisionAction,
    RiskEvaluationResponse,
    RiskLevel,
    RiskSignalResponse,
    VersionInfo,
)
from app.decision.policy import POLICY_VERSION, apply_decision_policy, determine_risk_level
from app.entity_intelligence.entities import EntityNode, EntityType, make_entity_id
from app.entity_intelligence.graph import entity_graph
from app.entity_intelligence.risk import compute_cross_merchant_risk
from app.errors.models import AegisAPIException, ErrorCode
from app.events.models import IntegrationEventPayload, IntegrationEventType
from app.events.processor import process_integration_event
from app.events.repository import integration_event_repo
from app.firewall.features import extract_session_only
from app.firewall.scoring import compute_risk_score
from app.idempotency.service import check_idempotency, record_idempotent_response
from app.models.firewall import RecommendedAction, SignalSeverity
from app.utils.timeutil import parse_iso8601
from app.webhooks.dispatcher import webhook_dispatcher
from app.webhooks.models import WebhookEventType, WebhookPayload

logger = logging.getLogger(__name__)

v1_risk_router = APIRouter(prefix="/v1/risk", tags=["Public V1 Risk API"])


# ---------------------------------------------------------------------------
# Request Schemas
# ---------------------------------------------------------------------------

class RiskEvaluationRequest(BaseModel):
    """Stable public request schema for /v1/risk/evaluate."""
    transaction_id: str = Field(..., description="Unique merchant transaction reference")
    merchant_id: str = Field(..., description="Merchant identifier")
    amount: float = Field(..., description="Transaction amount")
    currency: str = Field("USD", description="ISO currency code (USD, EUR, INR, GBP, AED, etc.)")
    account_token: Optional[str] = Field(None, description="Masked/tokenized user or account ID")
    device_token: Optional[str] = Field(None, description="Hashed/tokenized device fingerprint")
    ip_token: Optional[str] = Field(None, description="Hashed/tokenized IP address")
    payment_instrument_token: Optional[str] = Field(None, description="Tokenized payment instrument or card hash")
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat(), description="ISO8601 transaction timestamp")
    order_id: Optional[str] = None
    session_id: Optional[str] = None
    billing_country: Optional[str] = None
    shipping_country: Optional[str] = None
    payment_method_type: Optional[str] = None
    client_metadata: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Transaction amount cannot be negative")
        return v

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v: str) -> str:
        if not v or len(v.strip()) != 3:
            raise ValueError("Currency must be a 3-letter ISO code")
        return v.upper().strip()

    @field_validator("account_token", "device_token", "ip_token", "payment_instrument_token")
    @classmethod
    def reject_raw_pan_or_cvv(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        cleaned = re.sub(r"[\s-]", "", v)
        if (13 <= len(cleaned) <= 19) and cleaned.isdigit():
            # Check Luhn algorithm
            def _luhn(s: str) -> bool:
                digits = [int(c) for c in s]
                for i in range(len(digits) - 2, -1, -2):
                    doubled = digits[i] * 2
                    digits[i] = doubled - 9 if doubled > 9 else doubled
                return sum(digits) % 10 == 0
            if _luhn(cleaned):
                raise ValueError("Security violation: Raw Primary Account Number (PAN) is strictly rejected. Pass tokenized identifiers only.")
        if "cvv" in v.lower() or "cvc" in v.lower() or (len(cleaned) in [3, 4] and cleaned.isdigit() and not v.startswith(("dev_", "ip_", "acc_", "tok_", "pi_"))):
            raise ValueError("Security violation: Raw CVV/CVC is strictly rejected.")
        return v


# ---------------------------------------------------------------------------
# Core Evaluation Endpoint
# ---------------------------------------------------------------------------

@v1_risk_router.post("/evaluate", response_model=RiskEvaluationResponse)
async def evaluate_transaction_risk(
    request: Request,
    eval_req: RiskEvaluationRequest,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    auth_merchant: AuthenticatedMerchant = Depends(get_authenticated_merchant),
) -> Any:
    """Evaluate real-time transaction risk through authenticated, idempotent public contract."""
    start_time = time.perf_counter()
    req_id = get_request_id(request)

    # 1. Merchant Ownership Enforcement
    verify_merchant_ownership(auth_merchant, eval_req.merchant_id)

    # 2. Idempotency Check
    cached_response, req_hash = check_idempotency(eval_req.merchant_id, idempotency_key, eval_req)
    if cached_response:
        logger.info("Returning cached idempotent response for merchant %s key %s", eval_req.merchant_id, idempotency_key)
        return cached_response

    # 3. Currency Normalization
    fx_penalty = 0.0
    fx_rate_version = "identity"
    normalized_amount = eval_req.amount
    if eval_req.currency != "USD":
        norm_res = currency_converter.normalize_amount(
            eval_req.amount,
            eval_req.currency,
            as_of=eval_req.timestamp,
        )
        normalized_amount = norm_res.normalized_amount
        fx_rate_version = norm_res.fx_rate_version
        fx_penalty = norm_res.evidence_quality_penalty

    # 4. Ingest Event into Graph & Lifecycle
    event_id = f"evt_{eval_req.transaction_id}_created"
    integration_event = IntegrationEventPayload(
        event_id=event_id,
        event_type=IntegrationEventType.TRANSACTION_CREATED,
        transaction_id=eval_req.transaction_id,
        merchant_id=eval_req.merchant_id,
        timestamp=eval_req.timestamp,
        amount=eval_req.amount,
        currency=eval_req.currency,
        account_token=eval_req.account_token,
        device_token=eval_req.device_token,
        ip_token=eval_req.ip_token,
        payment_instrument_token=eval_req.payment_instrument_token,
    )
    process_integration_event(integration_event)

    # 5. Extract Behavioral Features
    session_events = [
        {
            "event_id": f"se_{eval_req.transaction_id}_0",
            "event_type": "SESSION_STARTED",
            "timestamp": eval_req.timestamp,
            "device_hash": eval_req.device_token,
            "ip_address": eval_req.ip_token,
            "account_id": eval_req.account_token,
        },
        {
            "event_id": f"se_{eval_req.transaction_id}_1",
            "event_type": "PAYMENT_ATTEMPTED",
            "timestamp": eval_req.timestamp,
            "amount": normalized_amount,
            "currency": "USD",
            "device_hash": eval_req.device_token,
            "ip_address": eval_req.ip_token,
            "account_id": eval_req.account_token,
            "payment_instrument_token": eval_req.payment_instrument_token,
        },
    ]
    b_features = extract_session_only(session_events)

    # Compute Evidence Quality
    quality_score = 0.25
    if eval_req.device_token:
        quality_score += 0.15
    if eval_req.ip_token:
        quality_score += 0.15
    if eval_req.account_token:
        quality_score += 0.15
    if eval_req.payment_instrument_token:
        quality_score += 0.10
    quality_score -= fx_penalty
    evidence_quality = round(max(0.0, min(1.0, quality_score)), 2)

    # 6. Active Calibration Config
    active_cal = calibration_registry.get_active()
    risk_score, signals, feature_contributions = compute_risk_score(
        b_features, calibration_config=active_cal
    )

    # 7. Cross-Merchant Entity Intelligence (with graceful degradation)
    degradation_notice = None
    is_graph_degraded = False
    try:
        if eval_req.device_token:
            d_id = make_entity_id(EntityType.DEVICE, eval_req.device_token)
            d_res = compute_cross_merchant_risk(entity_graph, d_id, as_of=eval_req.timestamp)
            if d_res.risk_score > 0.20:
                risk_score = round(max(risk_score, d_res.risk_score), 4)
                for s in d_res.signals:
                    signals.append(s)
        if eval_req.ip_token:
            i_id = make_entity_id(EntityType.IP, eval_req.ip_token)
            i_res = compute_cross_merchant_risk(entity_graph, i_id, as_of=eval_req.timestamp)
            if i_res.risk_score > 0.20:
                risk_score = round(max(risk_score, i_res.risk_score), 4)
                for s in i_res.signals:
                    signals.append(s)
    except Exception as e:
        logger.error("Cross-merchant graph traversal failed: %s", e)
        is_graph_degraded = True
        evidence_quality = round(max(0.0, evidence_quality - 0.25), 2)
        degradation_notice = "Cross-merchant entity intelligence temporarily degraded."

    # Format response signals
    resp_signals = [
        RiskSignalResponse(
            name=s.name,
            severity=s.severity if isinstance(s.severity, SignalSeverity) else SignalSeverity.medium,
            value=s.value,
            contribution=s.contribution,
            description=s.description,
        )
        for s in signals
    ]

    # 8. Decision Policy
    decision_action, explanations = apply_decision_policy(
        risk_score=risk_score,
        evidence_quality=evidence_quality,
        signals=resp_signals,
        low_threshold=active_cal.thresholds.low_threshold if active_cal.thresholds else 0.30,
        high_threshold=active_cal.thresholds.high_threshold if active_cal.thresholds else 0.70,
        eq_threshold=active_cal.thresholds.evidence_quality_threshold if active_cal.thresholds else 0.70,
        is_graph_degraded=is_graph_degraded,
    )
    risk_lvl = determine_risk_level(risk_score)
    decision_id = f"dec_{eval_req.transaction_id}_{int(time.time())}"

    # 9. Immutable Audit Snapshot
    audit_recorded = True
    snap_id = f"snap_{eval_req.transaction_id}"
    from app.firewall.scoring import (
        velocity_component, retry_component, variation_component,
        infrastructure_component, historical_deviation_component, sequence_component
    )
    v_s, _ = velocity_component(b_features)
    r_s, _ = retry_component(b_features)
    var_s, _ = variation_component(b_features)
    i_s, _ = infrastructure_component(b_features)
    h_s, _ = historical_deviation_component(b_features)
    s_s, _ = sequence_component(b_features)
    dev_n = min(1.0, b_features.accounts_on_device / 5.0)
    fail_n = min(1.0, b_features.historical_failure_rate)

    try:
        snapshot = RiskDecisionSnapshot(
            transaction_id=eval_req.transaction_id,
            session_id=eval_req.session_id or f"sess_{eval_req.transaction_id}",
            merchant_id=eval_req.merchant_id,
            timestamp=eval_req.timestamp,
            feature_values={
                "velocity_score": v_s,
                "retry_frequency_score": r_s,
                "infrastructure_risk_score": i_s,
                "variation_anomaly_score": var_s,
                "historical_deviation_score": h_s,
                "sequence_anomaly_score": s_s,
                "device_reuse_rate": dev_n,
                "ip_failure_rate": fail_n,
                "cross_merchant_propagated_risk": 0.0,
                "historical_failure_rate": fail_n,
            },
            feature_contributions=feature_contributions,
            signals=[s.model_dump() for s in resp_signals],
            graph_snapshot_version="graph-live",
            calibration_version=active_cal.version,
            calibration_hash=active_cal.config_hash,
            threshold_version=active_cal.thresholds.version if active_cal.thresholds else "thresh-v1.0",
            fx_rate_version=fx_rate_version,
            feature_schema_version=FEATURE_SCHEMA_VERSION,
            evidence_quality=evidence_quality,
            final_score=risk_score,
            final_action=decision_action.value if hasattr(decision_action, "value") else str(decision_action),
        )
        audit_repo.save_snapshot(snapshot)
        decision_hash = snapshot.decision_hash
    except Exception as e:
        logger.error("Audit snapshot recording failed: %s", e)
        audit_recorded = False
        decision_hash = "unrecorded"
        degradation_notice = (degradation_notice + " | " if degradation_notice else "") + "Audit snapshot storage unavailable."

    elapsed_ms = round((time.perf_counter() - start_time) * 1000.0, 3)

    response = RiskEvaluationResponse(
        transaction_id=eval_req.transaction_id,
        decision_id=decision_id,
        decision=decision_action,
        risk_score=risk_score,
        risk_level=risk_lvl,
        evidence_quality=evidence_quality,
        signals=resp_signals,
        explanation=explanations,
        versions=VersionInfo(
            calibration=active_cal.version,
            policy=POLICY_VERSION,
            graph_snapshot="graph-live",
        ),
        audit=AuditInfo(
            snapshot_id=snap_id,
            decision_hash=decision_hash,
            recorded=audit_recorded,
        ),
        calibration_version=active_cal.version,
        request_id=req_id,
        latency_ms=elapsed_ms,
        degradation_notice=degradation_notice,
    )

    # 10. Webhook Dispatch
    webhook_payload = WebhookPayload(
        event=WebhookEventType.RISK_DECISION_CREATED,
        event_id=f"wevt_{eval_req.transaction_id}",
        transaction_id=eval_req.transaction_id,
        merchant_id=eval_req.merchant_id,
        decision_id=decision_id,
        decision=decision_action.value if hasattr(decision_action, "value") else str(decision_action),
        risk_score=risk_score,
        risk_level=risk_lvl.value,
        timestamp=eval_req.timestamp,
    )
    webhook_dispatcher.dispatch(webhook_payload)

    # 11. Record Idempotency Cache
    record_idempotent_response(
        merchant_id=eval_req.merchant_id,
        idempotency_key=idempotency_key,
        request_hash=req_hash,
        response_payload=response.model_dump(),
    )

    return response


# ---------------------------------------------------------------------------
# Investigation & Replay Endpoints
# ---------------------------------------------------------------------------

@v1_risk_router.get("/transactions/{transaction_id}", response_model=Dict[str, Any])
async def get_transaction_risk_investigation(
    transaction_id: str,
    auth_merchant: AuthenticatedMerchant = Depends(get_authenticated_merchant),
) -> Dict[str, Any]:
    """Retrieve full risk decision details with strict merchant ownership check."""
    snapshot = audit_repo.get_snapshot(transaction_id)
    if not snapshot:
        raise AegisAPIException(
            code=ErrorCode.NOT_FOUND,
            message=f"Transaction '{transaction_id}' not found in risk audit records.",
            status_code=404,
        )

    # Enforce Merchant Ownership
    verify_merchant_ownership(auth_merchant, snapshot.merchant_id)

    return {
        "transaction_id": snapshot.transaction_id,
        "merchant_id": snapshot.merchant_id,
        "decision": snapshot.final_action.value if hasattr(snapshot.final_action, "value") else str(snapshot.final_action),
        "risk_score": snapshot.final_score,
        "evidence_quality": snapshot.evidence_quality,
        "feature_contributions": snapshot.feature_contributions,
        "signals": snapshot.signals,
        "calibration_version": snapshot.calibration_version,
        "threshold_version": snapshot.threshold_version,
        "fx_rate_version": snapshot.fx_rate_version,
        "decision_hash": snapshot.decision_hash,
        "created_at": snapshot.created_at,
    }


@v1_risk_router.get("/transactions/{transaction_id}/entities", response_model=Dict[str, Any])
async def get_transaction_entity_context(
    transaction_id: str,
    auth_merchant: AuthenticatedMerchant = Depends(get_authenticated_merchant),
) -> Dict[str, Any]:
    """Retrieve privacy-safe entity network context for a transaction."""
    snapshot = audit_repo.get_snapshot(transaction_id)
    if not snapshot:
        raise AegisAPIException(
            code=ErrorCode.NOT_FOUND,
            message=f"Transaction '{transaction_id}' not found.",
            status_code=404,
        )

    # Enforce Merchant Ownership
    verify_merchant_ownership(auth_merchant, snapshot.merchant_id)

    # Return privacy-safe entities (zero counterparty merchant identity)
    events = integration_event_repo.list_by_transaction(transaction_id)
    dev_token = events[0].device_token if events else None
    ip_token = events[0].ip_token if events else None
    acc_token = events[0].account_token if events else None

    return {
        "transaction_id": transaction_id,
        "merchant_id": snapshot.merchant_id,
        "entities": {
            "device_token": f"dev_***{dev_token[-4:]}" if dev_token and len(dev_token) >= 4 else (dev_token or "none"),
            "ip_token": f"ip_***{ip_token[-4:]}" if ip_token and len(ip_token) >= 4 else (ip_token or "none"),
            "account_token": f"acct_***{acc_token[-4:]}" if acc_token and len(acc_token) >= 4 else (acc_token or "none"),
        },
        "privacy_notice": "Counterparty merchant identities, raw IPs, and customer PII are strictly excluded per AegisPay privacy boundaries.",
    }


@v1_risk_router.get("/transactions/{transaction_id}/timeline", response_model=Dict[str, Any])
async def get_transaction_event_timeline(
    transaction_id: str,
    auth_merchant: AuthenticatedMerchant = Depends(get_authenticated_merchant),
) -> Dict[str, Any]:
    """Retrieve chronological event timeline visible at decision as_of timestamp."""
    snapshot = audit_repo.get_snapshot(transaction_id)
    if not snapshot:
        raise AegisAPIException(
            code=ErrorCode.NOT_FOUND,
            message=f"Transaction '{transaction_id}' not found.",
            status_code=404,
        )

    # Enforce Merchant Ownership
    verify_merchant_ownership(auth_merchant, snapshot.merchant_id)

    events = integration_event_repo.list_by_transaction(transaction_id)
    return {
        "transaction_id": transaction_id,
        "merchant_id": snapshot.merchant_id,
        "timeline_events": [
            {
                "event_id": e.event_id,
                "event_type": e.event_type.value if hasattr(e.event_type, "value") else str(e.event_type),
                "timestamp": e.timestamp,
                "amount": e.amount,
                "currency": e.currency,
            }
            for e in events
        ],
        "total_events": len(events),
        "as_of_decision": snapshot.timestamp,
    }


@v1_risk_router.post("/transactions/{transaction_id}/replay", response_model=Dict[str, Any])
async def replay_transaction_evaluation(
    transaction_id: str,
    auth_merchant: AuthenticatedMerchant = Depends(get_authenticated_merchant),
) -> Dict[str, Any]:
    """Replay historical risk decision using exact original configuration."""
    snapshot = audit_repo.get_snapshot(transaction_id)
    if not snapshot:
        raise AegisAPIException(
            code=ErrorCode.NOT_FOUND,
            message=f"Transaction '{transaction_id}' not found for replay.",
            status_code=404,
        )

    # Enforce Merchant Ownership
    verify_merchant_ownership(auth_merchant, snapshot.merchant_id)

    # Replay using original calibration version
    res = replay_decision(snapshot)
    return {
        "transaction_id": res.transaction_id,
        "original_score": res.original_score,
        "replayed_score": res.replayed_score,
        "score_delta": res.score_delta,
        "original_action": res.original_decision.value if hasattr(res.original_decision, "value") else str(res.original_decision),
        "replayed_action": res.replayed_decision.value if hasattr(res.replayed_decision, "value") else str(res.replayed_decision),
        "deterministic_match": res.deterministic_match,
        "calibration_version": res.calibration_version,
    }
