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
from app.firewall.scoring import (
    ENGINE_VERSION,
    compute_risk_score,
    velocity_component,
    retry_component,
    variation_component,
    infrastructure_component,
    historical_deviation_component,
    sequence_component,
)
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
    calibration_config: Optional[Any] = None,
    record_audit: bool = True,
) -> FirewallAssessment:
    """Run the full firewall evaluation pipeline.

    Supports Phase 4 calibration, multi-currency normalization, and audit snapshots.
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

    # --- Phase 4 Multi-Currency Normalization ---
    from app.currency.converter import currency_converter
    fx_penalty = 0.0
    fx_rate_version = "identity"
    for ev in session_events:
        curr = ev.get("currency")
        amt = ev.get("amount")
        if curr and amt and curr != "USD":
            ts = ev.get("timestamp")
            norm_res = currency_converter.normalize_amount(float(amt), curr, as_of=ts)
            ev["amount"] = norm_res.normalized_amount
            fx_rate_version = norm_res.fx_rate_version
            if norm_res.evidence_quality_penalty > 0:
                fx_penalty = max(fx_penalty, norm_res.evidence_quality_penalty)

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

    quality_score -= fx_penalty
    evidence_quality = round(max(0.0, min(1.0, quality_score)), 2)

    # --- Base Behavioral Scoring (Supports Calibrated Config) ---
    risk_score, signals, feature_contributions = compute_risk_score(
        features, calibration_config=calibration_config
    )

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
    thresh_config = getattr(calibration_config, "thresholds", None)
    low_thresh = thresh_config.low_threshold if thresh_config else 0.30
    high_thresh = thresh_config.high_threshold if thresh_config else 0.70
    eq_thresh = thresh_config.evidence_quality_threshold if thresh_config else 0.70

    action = decide_action(risk_score, intent, low_threshold=low_thresh, high_threshold=high_thresh)
    # Conservative policy rule: if high risk is solely driven by cross-merchant graph but evidence quality is low,
    # downgrade BLOCK to CHALLENGE (never blind block on weak evidence)
    if action == RecommendedAction.BLOCK and evidence_quality < eq_thresh and risk_score < 0.85:
        action = RecommendedAction.CHALLENGE

    elapsed_ms = (time.perf_counter() - start) * 1000.0

    # --- Phase 4 Immutable Decision Audit Snapshot ---
    if record_audit:
        from app.audit.models import RiskDecisionSnapshot
        from app.audit.repository import audit_repo
        from app.calibration.models import FEATURE_SCHEMA_VERSION

        txn_id = request.transaction_id or f"txn_{request.session_id}"
        cal_ver = getattr(calibration_config, "version", "calibration-heuristic-v1.0")
        cal_hash = getattr(calibration_config, "config_hash", "default_hash")
        thresh_ver = getattr(thresh_config, "version", "thresh-default-v1.0")

        v_s, _ = velocity_component(features)
        r_s, _ = retry_component(features)
        var_s, _ = variation_component(features)
        i_s, _ = infrastructure_component(features)
        h_s, _ = historical_deviation_component(features)
        s_s, _ = sequence_component(features)
        dev_n = min(1.0, features.accounts_on_device / 5.0)
        fail_n = min(1.0, features.historical_failure_rate)

        snapshot = RiskDecisionSnapshot(
            transaction_id=txn_id,
            session_id=request.session_id,
            merchant_id=request.merchant_id,
            timestamp=session_events[-1].get("timestamp", "1970-01-01T00:00:00Z") if session_events else "1970-01-01T00:00:00Z",
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
            signals=[s.model_dump() if hasattr(s, "model_dump") else s for s in signals],
            graph_snapshot_version="graph-live",
            calibration_version=cal_ver,
            calibration_hash=cal_hash,
            threshold_version=thresh_ver,
            fx_rate_version=fx_rate_version,
            feature_schema_version=FEATURE_SCHEMA_VERSION,
            evidence_quality=evidence_quality,
            final_score=risk_score,
            final_action=action,
        )
        audit_repo.save_snapshot(snapshot)

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
    calibration_config: Optional[Any] = None,
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
            amount=ev.get("amount"),
            currency=ev.get("currency") or "USD",
            payment_method=ev.get("payment_method"),
            device_hash=ev.get("device_hash") or device_hash,
            ip_address=ev.get("ip_address") or ip_address,
            payment_instrument_token=ev.get("payment_instrument_token"),
            account_id=ev.get("account_id") or account_id,
        ))

    request = SessionEvaluationRequest(
        merchant_id=merchant_id,
        session_id=session_id,
        events=events,
        device_hash=device_hash,
        ip_address=ip_address,
        account_id=account_id,
    )
    return evaluate_session(
        request,
        historical_events=historical_events,
        cross_merchant_graph=cross_merchant_graph,
        calibration_config=calibration_config,
    )
