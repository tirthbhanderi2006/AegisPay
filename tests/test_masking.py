from app.utils.masking import mask_record


def test_email_masked_but_domain_preserved():
    masked = mask_record({"customer_email": "jordan.mehta@example.com"})
    assert masked["customer_email"] == "j***@example.com"


def test_name_and_phone_masked():
    masked = mask_record({"customer_name": "Jordan Mehta", "phone": "+1-555-0100", "card_number": "4242424242424242"})
    assert masked["customer_name"] == "J***"
    assert masked["phone"] == "***MASKED***"
    assert masked["card_number"] == "***MASKED***"


def test_identifiers_needed_by_auditor_are_preserved():
    record = {
        "ip_address": "203.0.113.42",
        "device_hash": "dev_9f3ab77c41e2d804",
        "transaction_id": "txn_20260601_8842",
    }
    assert mask_record(record) == record


def test_recursion_into_nested_lists():
    payload = {
        "telemetry": {"customer_email": "a.b@example.com", "ip_address": "10.0.0.1"},
        "historical_transactions": [{"customer_name": "Riley Bancroft"}],
    }
    masked = mask_record(payload)
    assert masked["telemetry"]["customer_email"] == "a***@example.com"
    assert masked["telemetry"]["ip_address"] == "10.0.0.1"
    assert masked["historical_transactions"][0]["customer_name"] == "R***"


def test_none_values_left_alone():
    assert mask_record({"signature_name": None})["signature_name"] is None
