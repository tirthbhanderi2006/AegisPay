from app.engine.reason_codes import lookup
from app.models.dispute import ClaimType, Network


def test_visa_fraud_card_absent():
    assert lookup(Network.VISA, "10.4") == ClaimType.FRAUD_UNRECOGNIZED


def test_visa_product_not_received():
    assert lookup(Network.VISA, "13.1") == ClaimType.PRODUCT_NOT_RECEIVED


def test_visa_duplicate_processing():
    assert lookup(Network.VISA, "12.6") == ClaimType.DUPLICATE_CHARGE


def test_mastercard_goods_not_provided():
    assert lookup(Network.MASTERCARD, "4853") == ClaimType.PRODUCT_NOT_RECEIVED


def test_mastercard_fraud_card_absent():
    assert lookup(Network.MASTERCARD, "4837") == ClaimType.FRAUD_UNRECOGNIZED


def test_npci_duplicate_is_illustrative_but_mapped():
    assert lookup(Network.NPCI, "FRM-DUP") == ClaimType.DUPLICATE_CHARGE


def test_unknown_code_returns_none_triggers_llm_fallback_path():
    assert lookup(Network.MASTERCARD, "99.99") is None
    assert lookup(Network.UNKNOWN, "10.4") is None


def test_lookup_strips_whitespace():
    assert lookup(Network.VISA, " 13.3 ") == ClaimType.SERVICE_NOT_AS_DESCRIBED
