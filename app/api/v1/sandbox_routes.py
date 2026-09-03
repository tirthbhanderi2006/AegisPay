"""Public V1 Sandbox API for synthetic scenario testing."""

import json
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, Header, Request

from app.api.v1.risk_routes import RiskEvaluationRequest, evaluate_transaction_risk
from app.auth.middleware import get_authenticated_merchant
from app.auth.models import AuthenticatedMerchant
from app.decision.models import RiskEvaluationResponse
from app.entity_intelligence.synthetic import (
    generate_cross_merchant_dataset,
    LABEL_DEVICE_REUSE_RING,
    LABEL_IP_REUSE_RING,
    LABEL_DISTRIBUTED_LOW_AND_SLOW,
    LABEL_ACCOUNT_DEVICE_ROTATION,
    LABEL_MERCHANT_HOPPING,
    LABEL_MIXED_ENTITY_RING,
    LABEL_LEGITIMATE_OFFICE_NETWORK,
    LABEL_LEGITIMATE_FAMILY_DEVICE,
    LABEL_LEGITIMATE_MOBILE_NETWORK,
    LABEL_ISOLATED_NORMAL_USER,
)

v1_sandbox_router = APIRouter(prefix="/v1/sandbox", tags=["Public V1 Sandbox API"])

SCENARIO_MAPPING: Dict[str, str] = {
    "normal": LABEL_ISOLATED_NORMAL_USER,
    "isolated_normal_user": LABEL_ISOLATED_NORMAL_USER,
    "velocity": LABEL_MERCHANT_HOPPING,
    "merchant_hopping": LABEL_MERCHANT_HOPPING,
    "entity": LABEL_DEVICE_REUSE_RING,
    "device_reuse_ring": LABEL_DEVICE_REUSE_RING,
    "ip_ring": LABEL_IP_REUSE_RING,
    "ip_reuse_ring": LABEL_IP_REUSE_RING,
    "manual": LABEL_DISTRIBUTED_LOW_AND_SLOW,
    "distributed_low_and_slow": LABEL_DISTRIBUTED_LOW_AND_SLOW,
    "account_rotation": LABEL_ACCOUNT_DEVICE_ROTATION,
    "account_device_rotation": LABEL_ACCOUNT_DEVICE_ROTATION,
    "mixed": LABEL_MIXED_ENTITY_RING,
    "office": LABEL_LEGITIMATE_OFFICE_NETWORK,
    "family": LABEL_LEGITIMATE_FAMILY_DEVICE,
    "mobile": LABEL_LEGITIMATE_MOBILE_NETWORK,
}


@v1_sandbox_router.post("/transactions", response_model=RiskEvaluationResponse)
async def evaluate_sandbox_transaction(
    request: Request,
    scenario_type: Optional[str] = None,
    auth_merchant: AuthenticatedMerchant = Depends(get_authenticated_merchant),
) -> RiskEvaluationResponse:
    """Execute complete end-to-end evaluation using a synthetic scenario."""
    # Attempt to read JSON body if provided
    requested_key = scenario_type or "velocity"
    try:
        body = await request.json()
        if isinstance(body, dict):
            requested_key = body.get("scenario") or body.get("scenario_type") or requested_key
    except Exception:
        pass

    target_label = SCENARIO_MAPPING.get(str(requested_key).lower(), str(requested_key))

    dataset = generate_cross_merchant_dataset(sample_count=20, seed=42)
    sample = next((s for s in dataset if s.get("label") == target_label or s.get("scenario_type") == target_label), None)
    if not sample:
        sample = dataset[0]

    # Map to evaluation request
    curr_events = sample.get("current_session", [])
    first_ev = curr_events[0] if curr_events else {}

    amount = float(first_ev.get("amount", 100.0))
    if requested_key in ("velocity", "merchant_hopping"):
        amount = 1450.0
    elif requested_key in ("normal", "isolated_normal_user"):
        amount = 45.0
    elif requested_key in ("manual", "distributed_low_and_slow"):
        amount = 420.0

    eval_req = RiskEvaluationRequest(
        transaction_id=f"sandbox_{sample['scenario_id']}_{requested_key}",
        merchant_id=auth_merchant.merchant_id,
        amount=amount,
        currency="USD",
        device_token=first_ev.get("device_hash") or f"dev_tok_{requested_key}_91A2",
        ip_token=first_ev.get("ip_address") or f"ip_tok_{requested_key}_7F12",
        account_token=first_ev.get("account_id") or f"acct_tok_{requested_key}_8812",
        timestamp=first_ev.get("timestamp", "2026-08-27T10:00:00Z"),
    )

    return await evaluate_transaction_risk(
        request=request,
        eval_req=eval_req,
        idempotency_key=None,
        auth_merchant=auth_merchant,
    )
