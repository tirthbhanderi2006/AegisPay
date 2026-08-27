"""Public V1 Merchant Integration Events API."""

import logging
from typing import Any, Dict
from fastapi import APIRouter, Depends

from app.auth.middleware import get_authenticated_merchant, verify_merchant_ownership
from app.auth.models import AuthenticatedMerchant
from app.events.models import IntegrationEventPayload
from app.events.processor import process_integration_event

logger = logging.getLogger(__name__)

v1_event_router = APIRouter(prefix="/v1/events", tags=["Public V1 Events API"])


@v1_event_router.post("", response_model=Dict[str, Any])
async def ingest_merchant_event(
    event: IntegrationEventPayload,
    auth_merchant: AuthenticatedMerchant = Depends(get_authenticated_merchant),
) -> Dict[str, Any]:
    """Ingest external payment lifecycle event (authorized, completed, failed, refunded, disputed)."""
    # Enforce Merchant Ownership
    verify_merchant_ownership(auth_merchant, event.merchant_id)

    processed = process_integration_event(event)
    return {
        "event_id": event.event_id,
        "transaction_id": event.transaction_id,
        "merchant_id": event.merchant_id,
        "status": "processed" if processed else "already_processed_idempotent",
        "timestamp": event.timestamp,
    }
