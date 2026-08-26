"""Lifecycle event ingestion API.

Provides:
  - ``POST /webhooks/payment-event`` — ingest merchant lifecycle events
  - ``GET /transactions/{transaction_id}/timeline`` — retrieve reconstructed timeline
"""

import logging
import uuid
from typing import Any, Dict

from fastapi import APIRouter, HTTPException

from app.lifecycle_repo import lifecycle_repository
from app.engine.reconstruction import reconstruct_transaction
from app.models.lifecycle import (
    PaymentEventEnvelope,
    _compute_integrity_hash,
)

logger = logging.getLogger(__name__)

lifecycle_router = APIRouter()


@lifecycle_router.post("/webhooks/payment-event")
def ingest_payment_event(envelope: PaymentEventEnvelope) -> Dict[str, Any]:
    """Ingest a merchant payment lifecycle event.

    - Validates schema (Pydantic)
    - Enforces ``event_id`` idempotency (409 on duplicate)
    - Auto-creates/upserts the parent transaction record
    - Persists the event + auto-generated evidence record
    - Returns deterministic acknowledgement
    - **No LLM call.**
    """
    # 1. Check idempotency
    if lifecycle_repository.event_exists(envelope.event_id):
        raise HTTPException(
            status_code=409,
            detail=f"Event {envelope.event_id} already ingested (idempotent reject).",
        )

    # 2. Upsert parent transaction
    tx_saved = lifecycle_repository.save_transaction(
        transaction_id=envelope.transaction_id,
        merchant_id=envelope.merchant_id,
        amount=envelope.amount,
        currency=envelope.currency,
        ip_address=envelope.ip_address,
        device_hash=envelope.device_hash,
        card_last4=envelope.card_last4,
    )
    if not tx_saved:
        raise HTTPException(
            status_code=503,
            detail="Database unavailable. Start it with `docker compose up -d`.",
        )

    # 3. Persist the event
    integrity_hash = _compute_integrity_hash(
        envelope.event_id, envelope.transaction_id,
        envelope.event_type.value, envelope.timestamp,
    )
    event_saved = lifecycle_repository.save_event(
        event_id=envelope.event_id,
        transaction_id=envelope.transaction_id,
        merchant_id=envelope.merchant_id,
        event_type=envelope.event_type.value,
        timestamp=envelope.timestamp,
        source=envelope.source,
        metadata=envelope.metadata,
        integrity_hash=integrity_hash,
    )
    if not event_saved:
        # Could be a race-condition duplicate
        raise HTTPException(
            status_code=409,
            detail=f"Event {envelope.event_id} already ingested (idempotent reject).",
        )

    # 4. Auto-generate an evidence record from the event
    evidence_id = f"evd_{envelope.event_id}"
    evidence_hash = _compute_integrity_hash(
        evidence_id, envelope.transaction_id,
        envelope.event_type.value, envelope.timestamp,
    )
    lifecycle_repository.save_evidence(
        evidence_id=evidence_id,
        transaction_id=envelope.transaction_id,
        merchant_id=envelope.merchant_id,
        event_id=envelope.event_id,
        evidence_type=envelope.event_type.value,
        timestamp=envelope.timestamp,
        source=envelope.source,
        data=envelope.metadata,
        integrity_hash=evidence_hash,
    )

    return {
        "status": "accepted",
        "event_id": envelope.event_id,
        "transaction_id": envelope.transaction_id,
        "event_type": envelope.event_type.value,
        "integrity_hash": integrity_hash,
    }


@lifecycle_router.get("/transactions/{transaction_id}/timeline")
def get_transaction_timeline(transaction_id: str) -> Dict[str, Any]:
    """Retrieve the reconstructed transaction lifecycle timeline."""
    reconstruction = reconstruct_transaction(transaction_id, repo=lifecycle_repository)
    if reconstruction is None:
        raise HTTPException(
            status_code=404,
            detail=f"Transaction {transaction_id} not found in lifecycle store.",
        )
    return reconstruction.model_dump()
