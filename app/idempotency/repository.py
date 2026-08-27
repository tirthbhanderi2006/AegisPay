"""Idempotency repository for storing request outcomes."""

from typing import Dict, Optional, Tuple
from app.idempotency.models import IdempotencyRecord

CREATE_IDEMPOTENCY_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS idempotency_records (
    merchant_id VARCHAR(128) NOT NULL,
    idempotency_key VARCHAR(128) NOT NULL,
    request_hash VARCHAR(64) NOT NULL,
    status_code INTEGER NOT NULL DEFAULT 200,
    response_payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (merchant_id, idempotency_key)
);
"""


class IdempotencyRepository:
    """In-memory and PostgreSQL idempotency cache."""

    def __init__(self) -> None:
        self._records: Dict[Tuple[str, str], IdempotencyRecord] = {}

    def get(self, merchant_id: str, idempotency_key: str) -> Optional[IdempotencyRecord]:
        return self._records.get((merchant_id, idempotency_key))

    def save(self, record: IdempotencyRecord) -> None:
        self._records[(record.merchant_id, record.idempotency_key)] = record

    def clear(self) -> None:
        self._records.clear()


# Global singleton instance
idempotency_repo = IdempotencyRepository()
