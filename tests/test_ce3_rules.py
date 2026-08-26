from datetime import datetime, timedelta, timezone

from app.engine.ce3_rules import evaluate_rule_engine
from app.models.dispute import ClaimType, DisputeEvent, TransactionTelemetry

DISPUTED_TS = datetime(2026, 6, 1, tzinfo=timezone.utc)


def _iso(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def make_event(
    hist_specs,
    disputed_ts="2026-06-01T00:00:00Z",
    ip="203.0.113.10",
    device="dev_disputed",
    eci=None,
    status=None,
    signature_name=None,
    carrier=None,
    delivered_at=None,
):
    telemetry = TransactionTelemetry(
        transaction_id="txn_d",
        timestamp=disputed_ts,
        amount=100.0,
        ip_address=ip,
        device_hash=device,
        three_ds_eci=eci,
        three_ds_status=status,
        signature_name=signature_name,
        shipping_carrier=carrier,
        delivered_at=delivered_at,
        fulfillment_type="physical" if carrier else "digital",
    )
    historicals = [
        TransactionTelemetry(
            transaction_id=txid,
            timestamp=_iso(DISPUTED_TS - timedelta(days=days)),
            amount=90.0,
            ip_address=hip,
            device_hash=hdevice,
        )
        for (txid, days, hip, hdevice) in hist_specs
    ]
    return DisputeEvent(
        dispute_id="dsp_test",
        network="VISA",
        reason_code="10.4",
        amount=100.0,
        disputed_transaction_id="txn_d",
        telemetry=telemetry,
        historical_transactions=historicals,
    )


def test_two_qualifying_transactions_within_window_and_matching_device():
    event = make_event(
        [
            ("h1", 200, "198.51.100.1", "dev_disputed"),
            ("h2", 250, "198.51.100.2", "dev_disputed"),
        ]
    )
    result = evaluate_rule_engine(event, ClaimType.FRAUD_UNRECOGNIZED)
    assert result.ce3_qualified is True
    assert result.ce3_applicable is True
    assert result.qualifying_tx_count == 2
    assert result.rejection_reasons == []


def test_boundary_119_days_excluded_120_and_365_included():
    event = make_event(
        [
            ("edge_low", 119, None, "dev_disputed"),
            ("edge_in_min", 120, None, "dev_disputed"),
            ("edge_in_max", 365, None, "dev_disputed"),
            ("edge_high", 366, None, "dev_disputed"),
        ]
    )
    result = evaluate_rule_engine(event, ClaimType.FRAUD_UNRECOGNIZED)
    ids = {q.transaction_id for q in result.qualifying_transactions}
    assert ids == {"edge_in_min", "edge_in_max"}
    assert result.qualifying_tx_count == 2
    joined = " ".join(result.rejection_reasons)
    assert "119 days" in joined and "366 days" in joined


def test_identifier_mismatch_excludes_even_in_window():
    event = make_event(
        [
            ("h1", 200, "203.0.113.10", "dev_other"),
            ("h2", 250, "other.ip", "dev_disputed"),
        ]
    )
    result = evaluate_rule_engine(event, ClaimType.FRAUD_UNRECOGNIZED)
    assert result.qualifying_tx_count == 2
    matched = {q.matched_identifier for q in result.qualifying_transactions}
    assert matched == {"ip_address", "device_hash"}


def test_only_one_qualifying_fails_ce3_minimum():
    event = make_event(
        [
            ("good", 200, "203.0.113.10", "dev_disputed"),
            ("nomatch", 250, "x.ip", "dev_x"),
            ("outside", 400, "203.0.113.10", "dev_disputed"),
        ]
    )
    result = evaluate_rule_engine(event, ClaimType.FRAUD_UNRECOGNIZED)
    assert result.ce3_qualified is False
    assert result.qualifying_tx_count == 1
    assert any("at least 2" in reason for reason in result.rejection_reasons)


def test_missing_disputed_timestamp_blocks_evaluation():
    event = make_event([("h1", 200, "203.0.113.10", "dev_disputed")], disputed_ts=None)
    result = evaluate_rule_engine(event, ClaimType.FRAUD_UNRECOGNIZED)
    assert result.ce3_qualified is False
    assert any("timestamp missing or unparseable" in r.lower() for r in result.rejection_reasons)


def test_evidence_flags_three_ds_and_signature():
    completed = make_event([], eci="05")
    flags = evaluate_rule_engine(completed, ClaimType.FRAUD_UNRECOGNIZED).evidence_flags
    assert flags.three_ds_completed is True
    assert flags.three_ds_attempted_only is False

    attempted = make_event([], eci="06", status="attempted")
    flags = evaluate_rule_engine(attempted, ClaimType.FRAUD_UNRECOGNIZED).evidence_flags
    assert flags.three_ds_completed is False
    assert flags.three_ds_attempted_only is True


def test_physical_delivery_proof_requires_named_signature_carrier_and_delivery_date():
    full = evaluate_rule_engine(
        make_event(
            [],
            signature_name="Jordan Mehta",
            carrier="BlueDart",
            delivered_at="2026-06-05T11:20:00Z",
        ),
        ClaimType.PRODUCT_NOT_RECEIVED,
    ).evidence_flags
    assert full.named_recipient_signature is True
    assert full.physical_delivery_proof is True

    partial = evaluate_rule_engine(
        make_event([], carrier="BlueDart", delivered_at="2026-06-05T11:20:00Z"),
        ClaimType.PRODUCT_NOT_RECEIVED,
    ).evidence_flags
    assert partial.named_recipient_signature is False
    assert partial.physical_delivery_proof is False


def test_non_fraud_claim_marks_ce3_not_applicable_but_still_evaluated_for_reference():
    event = make_event(
        [
            ("h1", 200, "203.0.113.10", "dev_disputed"),
            ("h2", 250, "203.0.113.10", "dev_disputed"),
        ]
    )
    result = evaluate_rule_engine(event, ClaimType.DUPLICATE_CHARGE)
    assert result.ce3_applicable is False
    assert any("not applicable" in reason for reason in result.rejection_reasons)


def test_identifier_match_flag_true_even_when_outside_window():
    event = make_event([("h1", 30, "203.0.113.10", "dev_disputed")])
    result = evaluate_rule_engine(event, ClaimType.FRAUD_UNRECOGNIZED)
    assert result.evidence_flags.identifier_match_with_history is True
    assert result.ce3_qualified is False
