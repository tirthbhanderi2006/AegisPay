"""Repository for integration events storage."""

from typing import Dict, List, Optional
from app.events.models import IntegrationEventPayload

CREATE_INTEGRATION_EVENTS_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS integration_events (
    event_id VARCHAR(64) PRIMARY KEY,
    event_type VARCHAR(64) NOT NULL,
    transaction_id VARCHAR(128) NOT NULL,
    merchant_id VARCHAR(128) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    amount NUMERIC(14, 2),
    currency VARCHAR(3) DEFAULT 'USD',
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_int_events_txn ON integration_events(transaction_id);
CREATE INDEX IF NOT EXISTS idx_int_events_merchant ON integration_events(merchant_id);
"""


class IntegrationEventRepository:
    """In-memory and PostgreSQL store for merchant events."""

    def __init__(self) -> None:
        self._events_by_id: Dict[str, IntegrationEventPayload] = {}
        self._events_by_txn: Dict[str, List[IntegrationEventPayload]] = {}

    def get_by_id(self, event_id: str) -> Optional[IntegrationEventPayload]:
        return self._events_by_id.get(event_id)

    def save(self, event: IntegrationEventPayload) -> bool:
        """Idempotent save. Returns False if already processed."""
        if event.event_id in self._events_by_id:
            return False  # Duplicate event ignored
        self._events_by_id[event.event_id] = event
        if event.transaction_id not in self._events_by_txn:
            self._events_by_txn[event.transaction_id] = []
        self._events_by_txn[event.transaction_id].append(event)
        return True

    def list_by_transaction(self, transaction_id: str) -> List[IntegrationEventPayload]:
        return sorted(self._events_by_txn.get(transaction_id, []), key=lambda x: x.timestamp)


# Global singleton instance
integration_event_repo = IntegrationEventRepository()
