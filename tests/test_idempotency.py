"""Tests for request idempotency, conflict detection, and concurrent retry safety."""

import pytest
from app.errors.models import AegisAPIException, ErrorCode
from app.idempotency.models import compute_request_hash
from app.idempotency.repository import idempotency_repo
from app.idempotency.service import check_idempotency, record_idempotent_response


class TestRequestIdempotency:
    """Test suite for Idempotency-Key guarantees."""

    def setup_method(self) -> None:
        idempotency_repo.clear()

    def test_canonical_hash_is_deterministic(self) -> None:
        p1 = {"b": 2, "a": 1, "nested": {"d": 4, "c": 3}}
        p2 = {"a": 1, "nested": {"c": 3, "d": 4}, "b": 2}
        assert compute_request_hash(p1) == compute_request_hash(p2)

    def test_new_idempotency_key_returns_no_cache(self) -> None:
        payload = {"transaction_id": "txn_100", "amount": 50.0}
        cached, req_hash = check_idempotency("m_alpha", "key_unique_1", payload)
        assert cached is None
        assert req_hash is not None

    def test_reused_idempotency_key_returns_cached_response(self) -> None:
        payload = {"transaction_id": "txn_100", "amount": 50.0}
        cached, req_hash = check_idempotency("m_alpha", "key_reused_1", payload)
        assert cached is None

        # Record response
        expected_resp = {"decision": "ALLOW", "decision_id": "dec_100"}
        record_idempotent_response("m_alpha", "key_reused_1", req_hash, expected_resp)

        # Query again with identical payload
        cached_2, req_hash_2 = check_idempotency("m_alpha", "key_reused_1", payload)
        assert cached_2 == expected_resp
        assert req_hash_2 == req_hash

    def test_reused_idempotency_key_with_different_payload_raises_conflict(self) -> None:
        payload_1 = {"transaction_id": "txn_100", "amount": 50.0}
        cached, req_hash_1 = check_idempotency("m_alpha", "key_conflict_1", payload_1)
        record_idempotent_response("m_alpha", "key_conflict_1", req_hash_1, {"decision": "ALLOW"})

        payload_modified = {"transaction_id": "txn_100", "amount": 500.0}  # altered amount
        with pytest.raises(AegisAPIException) as exc_info:
            check_idempotency("m_alpha", "key_conflict_1", payload_modified)
        assert exc_info.value.code == ErrorCode.IDEMPOTENCY_CONFLICT
        assert exc_info.value.status_code == 409
