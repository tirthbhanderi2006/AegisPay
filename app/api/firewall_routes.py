"""Firewall API routes.

POST /risk/evaluate-session  -- evaluate a session's behavioral risk
GET  /risk/assessments/{session_id} -- retrieve past assessments
"""

import logging
import uuid
from typing import Any, Dict

from fastapi import APIRouter, HTTPException

from app.firewall.engine import evaluate_session
from app.lifecycle_repo import lifecycle_repository
from app.models.firewall import SessionEvaluationRequest

logger = logging.getLogger(__name__)

firewall_router = APIRouter()


@firewall_router.post("/risk/evaluate-session")
def evaluate_session_endpoint(request: SessionEvaluationRequest) -> Dict[str, Any]:
    """Evaluate a session's behavioral risk.

    Deterministic.  No LLM.  No ML.
    Optionally enriches with Phase 1 historical data if transaction_id
    or account_id has lifecycle events stored.
    """
    # Optionally fetch historical events for lifecycle-aware evaluation
    historical_events = None
    if request.transaction_id:
        raw = lifecycle_repository.get_events_for_transaction(request.transaction_id)
        if raw:
            historical_events = [dict(r) for r in raw]

    assessment = evaluate_session(request, historical_events=historical_events)

    # Persist the assessment
    assessment_id = f"fwa_{uuid.uuid4().hex[:16]}"
    lifecycle_repository.save_assessment(
        assessment_id=assessment_id,
        session_id=assessment.session_id,
        merchant_id=request.merchant_id,
        risk_score=assessment.risk_score,
        intent=assessment.intent.value,
        action=assessment.action.value,
        signals=[s.model_dump() for s in assessment.signals],
        features=assessment.features.model_dump() if assessment.features else {},
        missing_data=assessment.missing_data,
        policy_version=assessment.policy_version,
        engine_version=assessment.engine_version,
        latency_ms=assessment.latency_ms,
        transaction_id=request.transaction_id,
    )

    result = assessment.model_dump()
    result["assessment_id"] = assessment_id
    return result


@firewall_router.get("/risk/assessments/{session_id}")
def get_assessments(session_id: str) -> Dict[str, Any]:
    """Retrieve past assessments for a session."""
    assessments = lifecycle_repository.get_assessments_for_session(session_id)
    return {"session_id": session_id, "assessments": assessments}
