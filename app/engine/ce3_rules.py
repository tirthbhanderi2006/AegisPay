from typing import List

from app.models.dispute import ClaimType, DisputeEvent
from app.models.engine import EvidenceFlags, QualifyingTransaction, RuleEngineResult
from app.utils.timeutil import parse_ts

CE3_WINDOW_MIN_DAYS = 120
CE3_WINDOW_MAX_DAYS = 365
CE3_MIN_QUALIFYING_TRANSACTIONS = 2


def _shares_identifier(disputed, historical) -> str | None:
    if disputed.ip_address and historical.ip_address and disputed.ip_address == historical.ip_address:
        return "ip_address"
    if disputed.device_hash and historical.device_hash and disputed.device_hash == historical.device_hash:
        return "device_hash"
    return None


def evaluate_rule_engine(event: DisputeEvent, claim_type: ClaimType) -> RuleEngineResult:
    reasons: List[str] = []
    qualifying: List[QualifyingTransaction] = []

    disputed_ts = parse_ts(event.telemetry.timestamp)

    three_ds_completed = (
        (event.telemetry.three_ds_status or "").strip().lower() == "completed"
        or (event.telemetry.three_ds_eci or "").strip() == "05"
    )
    three_ds_attempted_only = (
        not three_ds_completed
        and (
            (event.telemetry.three_ds_status or "").strip().lower() == "attempted"
            or (event.telemetry.three_ds_eci or "").strip() == "06"
        )
    )
    named_signature = bool((event.telemetry.signature_name or "").strip())
    physical_proof = bool(
        named_signature
        and (event.telemetry.shipping_carrier or "").strip()
        and (event.telemetry.delivered_at or "").strip()
    )

    identifier_match_with_history = False

    if disputed_ts is None:
        reasons.append(
            "Disputed transaction timestamp missing or unparseable; CE3.0 time-window evaluation cannot be performed."
        )
    disputed_date = disputed_ts.date() if disputed_ts else None

    if not event.historical_transactions:
        reasons.append("No historical transactions provided; CE3.0 requires at least two qualifying prior undisputed transactions.")

    for index, hist in enumerate(event.historical_transactions):
        label = hist.transaction_id or f"historical transaction #{index + 1}"
        matched = _shares_identifier(event.telemetry, hist)
        if matched:
            identifier_match_with_history = True
        hist_ts = parse_ts(hist.timestamp)
        if disputed_date is None or hist_ts is None:
            reasons.append(f"{label} excluded: missing or unparseable timestamp.")
            continue
        days_before = (disputed_date - hist_ts.date()).days
        if days_before < CE3_WINDOW_MIN_DAYS or days_before > CE3_WINDOW_MAX_DAYS:
            reasons.append(
                f"{label} excluded: {days_before} days before disputed transaction, outside the required 120-365 day window."
            )
            continue
        if matched is None:
            reasons.append(
                f"{label} excluded: no hard identifier match (IP address or device hash) with the disputed transaction."
            )
            continue
        qualifying.append(
            QualifyingTransaction(
                transaction_id=hist.transaction_id,
                days_before_dispute=days_before,
                matched_identifier=matched,
            )
        )

    qualified = len(qualifying) >= CE3_MIN_QUALIFYING_TRANSACTIONS
    if event.historical_transactions and not qualified and len(qualifying) < CE3_MIN_QUALIFYING_TRANSACTIONS:
        if len(qualifying) == 1:
            reasons.append(
                f"Only 1 transaction satisfied all CE3.0 criteria after exclusions; the scheme requires at least {CE3_MIN_QUALIFYING_TRANSACTIONS}."
            )

    ce3_applicable = claim_type == ClaimType.FRAUD_UNRECOGNIZED
    if not ce3_applicable:
        reasons.append(
            f"CE3.0 qualification is not applicable to claim type {claim_type.value}; evaluated for reference only."
        )

    return RuleEngineResult(
        ce3_applicable=ce3_applicable,
        ce3_qualified=qualified and ce3_applicable,
        qualifying_tx_count=len(qualifying),
        qualifying_transactions=qualifying,
        rejection_reasons=reasons,
        evidence_flags=EvidenceFlags(
            three_ds_completed=three_ds_completed,
            three_ds_attempted_only=three_ds_attempted_only,
            named_recipient_signature=named_signature,
            physical_delivery_proof=physical_proof,
            identifier_match_with_history=identifier_match_with_history,
        ),
    )
