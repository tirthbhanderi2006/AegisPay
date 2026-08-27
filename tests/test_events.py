"""Tests for integration events, ordering preservation, and idempotency."""

from app.events.models import IntegrationEventPayload, IntegrationEventType
from app.events.processor import process_integration_event
from app.events.repository import integration_event_repo


class TestMerchantIntegrationEvents:
    """Test suite for payment lifecycle event ingestion."""

    def test_process_event_adds_to_repository(self) -> None:
        ev = IntegrationEventPayload(
            event_id="evt_test_001",
            event_type=IntegrationEventType.TRANSACTION_CREATED,
            transaction_id="txn_test_001",
            merchant_id="m_sandbox",
            amount=150.0,
            currency="USD",
            device_token="dev_tok_abc",
            ip_token="ip_tok_123",
        )
        is_new = process_integration_event(ev)
        assert is_new is True

        retrieved = integration_event_repo.get_by_id("evt_test_001")
        assert retrieved is not None
        assert retrieved.transaction_id == "txn_test_001"

    def test_duplicate_event_is_ignored_idempotently(self) -> None:
        ev = IntegrationEventPayload(
            event_id="evt_test_002",
            event_type=IntegrationEventType.TRANSACTION_AUTHORIZED,
            transaction_id="txn_test_002",
            merchant_id="m_sandbox",
            amount=200.0,
        )
        first_attempt = process_integration_event(ev)
        second_attempt = process_integration_event(ev)
        assert first_attempt is True
        assert second_attempt is False

    def test_events_listed_in_chronological_order(self) -> None:
        ev1 = IntegrationEventPayload(
            event_id="evt_seq_1",
            event_type=IntegrationEventType.TRANSACTION_CREATED,
            transaction_id="txn_seq_1",
            merchant_id="m_sandbox",
            timestamp="2026-08-27T10:00:00Z",
        )
        ev2 = IntegrationEventPayload(
            event_id="evt_seq_2",
            event_type=IntegrationEventType.TRANSACTION_AUTHORIZED,
            transaction_id="txn_seq_1",
            merchant_id="m_sandbox",
            timestamp="2026-08-27T10:05:00Z",
        )
        process_integration_event(ev1)
        process_integration_event(ev2)

        events = integration_event_repo.list_by_transaction("txn_seq_1")
        assert len(events) == 2
        assert events[0].timestamp < events[1].timestamp
