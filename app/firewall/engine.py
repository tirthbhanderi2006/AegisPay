"""Firewall engine — top-level orchestrator.

Ties feature extraction -> scoring -> intent -> policy into a single
deterministic evaluation.  Measures its own latency.

Two call modes:
  - session-only (no historical events)
  - lifecycle-aware (Phase 1 history injected)
"""

import time
import logging
from typing import Any, Dict, List, Optional

from app.firewall.features import extract_lifecycle_aware, extract_session_only
from app.firewall.intent import classify_intent
from app.firewall.policy import POLICY_VERSION, decide_action
from app.firewall.scoring import ENGINE_VERSION, compute_risk_score
from app.models.firewall import (
    FirewallAssessment,
    RecommendedAction,
    SessionEvaluationRequest,
)

logger = logging.getLogger(__name__)


def evaluate_session(
    request: SessionEvaluationRequest,
    historical_events: Optional[List[Dict[str, Any]]] = None,
    cross_merchant_graph: Optional[Any] = None,
) -> FirewallAssessment:
    """Run the full firewall evaluation pipeline.

    Returns a ``FirewallAssessment`` with risk_score, intent, action,
    signals, and latency measurement.
    """
    start = time.perf_counter()

    # Convert session events to dicts
    session_events = [ev.model_dump() for ev in request.events]

    # Inject top-level identifiers into events that lack them
    for ev in session_events:
        if not ev.get("device_hash") and request.device_hash:
            ev["device_hash"] = request.device_hash
        if not ev.get("ip_address") and request.ip_address:
            ev["ip_address"] = request.ip_address
        if not ev.get("account_id") and request.account_id:
            ev["account_id"] = request.account_id

    # --- Feature extraction ---
    missing_data: List[str] = []
    if historical_events:
        features = extract_lifecycle_aware(session_events, historical_events)
    else:
        features = extract_session_only(session_events)
        if features.historical_txn_count == 0:
            missing_data.append("historical_transaction_data")

    # Check for other missing data
    has_device = any(e.get("device_hash") for e in session_events)
    has_ip = any(e.get("ip_address") for e in session_events)
    has_account = any(e.get("account_id") for e in session_events)
    if not has_device:
        missing_data.append("device_hash")
    if not has_ip:
        missing_data.append("ip_address")
    if not has_account:
        missing_data.append("account_id")

    # --- Evidence Quality calculation (deterministic) ---
    quality_score = 0.0
    if session_events:
        quality_score += 0.25
    if has_device:
        quality_score += 0.15
    if has_ip:
        quality_score += 0.15
    if has_account:
        quality_score += 0.15
    if historical_events and len(historical_events) > 0:
        quality_score += 0.30
    evidence_quality = round(min(1.0, quality_score), 2)

    # --- Base Behavioral Scoring ---
    risk_score, signals, feature_contributions = compute_risk_score(features)

    # --- Cross-Merchant Intelligence Integration ---
    if cross_merchant_graph:
        from app.entity_intelligence.entities import EntityType, make_entity_id
        from app.entity_intelligence.risk import compute_cross_merchant_risk
        from app.models.firewall import RiskSignal, SignalSeverity
        dev = request.device_hash or next((e.get("device_hash") for e in session_events if e.get("device_hash")), None)
        ip = request.ip_address or next((e.get("ip_address") for e in session_events if e.get("ip_address")), None)

        cross_risk_max = 0.0
        if dev:
            d_id = make_entity_id(EntityType.DEVICE, dev)
            d_res = compute_cross_merchant_risk(cross_merchant_graph, d_id)
            if d_res.risk_score > 0.2:
                cross_risk_max = max(cross_risk_max, d_res.risk_score)
                for s in d_res.signals:
                    signals.append(RiskSignal(
                        name=s.name,
                        value=s.value,
                        severity=s.severity,
                        contribution=s.contribution,
                        description=s.description,
                    ))
        if ip:
            i_id = make_entity_id(EntityType.IP, ip)
            i_res = compute_cross_merchant_risk(cross_merchant_graph, i_id)
            if i_res.risk_score > 0.2:
                cross_risk_max = max(cross_risk_max, i_res.risk_score)
                for s in i_res.signals:
                    signals.append(RiskSignal(
                        name=s.name,
                        value=s.value,
                        severity=s.severity,
                        contribution=s.contribution,
                        description=s.description,
                    ))


        if cross_risk_max > risk_score:
            risk_score = round(max(risk_score, cross_risk_max), 4)

    # --- Intent classification ---
    intent, _reasons = classify_intent(features)

    # --- Conservative Action policy ---
    action = decide_action(risk_score, intent)
    # Conservative policy rule: if high risk is solely driven by cross-merchant graph but evidence quality is low,
    # downgrade BLOCK to CHALLENGE (never blind block on weak evidence)
    if action == RecommendedAction.BLOCK and evidence_quality < 0.70 and risk_score < 0.85:
        action = RecommendedAction.CHALLENGE

    elapsed_ms = (time.perf_counter() - start) * 1000.0

    return FirewallAssessment(
        session_id=request.session_id,
        risk_score=risk_score,
        intent=intent,
        action=action,
        signals=signals,
        missing_data=missing_data,
        features=features,
        feature_contributions=feature_contributions,
        evidence_quality=evidence_quality,
        policy_version=POLICY_VERSION,
        engine_version=ENGINE_VERSION,
        latency_ms=round(elapsed_ms, 3),
    )



def evaluate_session_from_dicts(
    session_events: List[Dict[str, Any]],
    session_id: str = "unknown",
    merchant_id: str = "unknown",
    historical_events: Optional[List[Dict[str, Any]]] = None,
    device_hash: Optional[str] = None,
    ip_address: Optional[str] = None,
    account_id: Optional[str] = None,
    cross_merchant_graph: Optional[Any] = None,
) -> FirewallAssessment:
    """Convenience wrapper that accepts raw dicts instead of Pydantic models.

    Used by the synthetic evaluation framework.
    """
    from app.models.firewall import SessionEvent, SessionEvaluationRequest

    events = []
    for ev in session_events:
        events.append(SessionEvent(
            event_id=ev.get("event_id", ""),
            event_type=ev.get("event_type", ""),
            timestamp=ev.get("timestamp", ""),
            metadata=ev.get("metadata", {}),
            device_hash=ev.get("device_hash", device_hash),
            ip_address=ev.get("ip_address", ip_address),
            amount=ev.get("amount"),
            currency=ev.get("currency", "USD"),
            payment_instrument_token=ev.get("payment_instrument_token"),
            account_id=ev.get("account_id", account_id),
        ))

    request = SessionEvaluationRequest(
        merchant_id=merchant_id,
        session_id=session_id,
        events=events,
        device_hash=device_hash,
        ip_address=ip_address,
        account_id=account_id,
    )
    return evaluate_session(request, historical_events=historical_events, cross_merchant_graph=cross_merchant_graph)
