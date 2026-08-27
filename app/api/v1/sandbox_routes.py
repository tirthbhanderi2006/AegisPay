"""Public V1 Sandbox API for synthetic scenario testing."""

from typing import Any, Dict
from fastapi import APIRouter, Depends, Header, Request

from app.api.v1.risk_routes import RiskEvaluationRequest, evaluate_transaction_risk
from app.auth.middleware import get_authenticated_merchant
from app.auth.models import AuthenticatedMerchant
from app.decision.models import RiskEvaluationResponse
from app.entity_intelligence.synthetic import generate_cross_merchant_dataset

v1_sandbox_router = APIRouter(prefix="/v1/sandbox", tags=["Public V1 Sandbox API"])


@v1_sandbox_router.post("/transactions", response_model=RiskEvaluationResponse)
async def evaluate_sandbox_transaction(
    request: Request,
    scenario_type: str = "DEVICE_REUSE_RING",
    auth_merchant: AuthenticatedMerchant = Depends(get_authenticated_merchant),
) -> RiskEvaluationResponse:
    """Execute complete end-to-end evaluation using a synthetic scenario."""
    dataset = generate_cross_merchant_dataset(sample_count=20, seed=42)
    sample = dataset[0]

    # Map to evaluation request
    curr_events = sample["current_session"]
    first_ev = curr_events[0] if curr_events else {}

    eval_req = RiskEvaluationRequest(
        transaction_id=f"sandbox_{sample['scenario_id']}",
        merchant_id=auth_merchant.merchant_id,
        amount=float(first_ev.get("amount", 100.0)),
        currency="USD",
        device_token=first_ev.get("device_hash"),
        ip_token=first_ev.get("ip_address"),
        account_token=first_ev.get("account_id"),
        timestamp=first_ev.get("timestamp", "2026-08-27T10:00:00Z"),
    )

    return await evaluate_transaction_risk(
        request=request,
        eval_req=eval_req,
        idempotency_key=None,
        auth_merchant=auth_merchant,
    )
