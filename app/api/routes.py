import logging
from typing import Any, Dict

from fastapi import APIRouter, HTTPException

from app.db import repository
from app.graph.workflow import (
    FINAL_ESCALATED_HUMAN,
    build_initial_state,
    serialize_result,
    workflow,
)
from app.models.dispute import DisputeEvent

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/webhooks/dispute")
def ingest_dispute(event: DisputeEvent) -> Dict[str, Any]:
    try:
        final_state = workflow.invoke(build_initial_state(event))
    except Exception:
        logger.exception("Pipeline fault while processing dispute %s", event.dispute_id)
        final_state = build_initial_state(event)
        final_state.update(
            {
                "claim_type": "UNKNOWN_REQUIRES_HUMAN_REVIEW",
                "classification_source": "system_fault",
                "needs_human_review": True,
                "decision": "escalate",
                "final_status": FINAL_ESCALATED_HUMAN,
                "primary_gap": "Internal processing fault; the case was safely parked for human review.",
                "rule_result": {
                    "ce3_applicable": False,
                    "ce3_qualified": False,
                    "qualifying_tx_count": 0,
                    "qualifying_transactions": [],
                    "rejection_reasons": [
                        "Pipeline fault during agent execution; no rule evaluation result is available."
                    ],
                    "evidence_flags": {
                        "three_ds_completed": False,
                        "three_ds_attempted_only": False,
                        "named_recipient_signature": False,
                        "physical_delivery_proof": False,
                        "identifier_match_with_history": False,
                    },
                },
                "errors": ["Pipeline fault during agent execution; case routed to human review."],
            }
        )
    persisted = repository.save_dispute(
        dispute_id=final_state["dispute_id"],
        network=final_state["network"],
        reason_code=final_state["reason_code"],
        claim_type=final_state.get("claim_type") or "UNKNOWN_REQUIRES_HUMAN_REVIEW",
        decision=final_state.get("decision", "escalate"),
        final_status=final_state.get("final_status", "PENDING"),
        win_probability=final_state.get("win_probability", 0.0),
        iterations_used=final_state.get("iterations", 0),
        event_payload=event.model_dump(mode="json"),
        result=serialize_result(final_state, persisted=True),
    )
    response = serialize_result(final_state, persisted=persisted)
    if not persisted:
        response["warning"] = (
            "Result processed but not persisted: database unavailable. "
            "Run `docker compose up -d` and retry."
        )
    return response


@router.get("/disputes")
def list_disputes(limit: int = 50):
    if not repository.available():
        raise HTTPException(
            status_code=503,
            detail="Database unavailable. Start it with `docker compose up -d`.",
        )
    return repository.list_disputes(limit=limit)


@router.get("/disputes/{dispute_id}")
def get_dispute(dispute_id: str):
    if not repository.available():
        raise HTTPException(
            status_code=503,
            detail="Database unavailable. Start it with `docker compose up -d`.",
        )
    record = repository.get_dispute(dispute_id)
    if record is None:
        raise HTTPException(status_code=404, detail=f"Dispute {dispute_id} not found.")
    return record
