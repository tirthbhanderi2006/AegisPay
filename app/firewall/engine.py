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
    SessionEvaluationRequest,
)

logger = logging.getLogger(__name__)


def evaluate_session(
    request: SessionEvaluationRequest,
    historical_events: Optional[List[Dict[str, Any]]] = None,
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

    # --- Scoring ---
    risk_score, signals = compute_risk_score(features)

    # --- Intent classification ---
    intent, _reasons = classify_intent(features)

    # --- Action policy ---
    action = decide_action(risk_score, intent)

    elapsed_ms = (time.perf_counter() - start) * 1000.0

    return FirewallAssessment(
        session_id=request.session_id,
        risk_score=risk_score,
        intent=intent,
        action=action,
        signals=signals,
        missing_data=missing_data,
        features=features,
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
    return evaluate_session(request, historical_events=historical_events)
