"""Lifecycle persistence layer — transactions, payment events, evidence records.

Same pattern as ``app.db.DisputeRepository``: psycopg3, thread-safe, graceful
degradation.  Schema tables are created alongside the existing ``disputes``
table (backward compatible).
"""

import json
import logging
import threading
from typing import Any, Dict, List, Optional

import psycopg
from psycopg.rows import dict_row

from app.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# DDL — new normalized tables
# ---------------------------------------------------------------------------

_TRANSACTIONS_DDL = """
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id TEXT PRIMARY KEY,
    merchant_id TEXT NOT NULL,
    amount DOUBLE PRECISION,
    currency TEXT NOT NULL DEFAULT 'USD',
    ip_address TEXT,
    device_hash TEXT,
    card_last4 TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
"""

_PAYMENT_EVENTS_DDL = """
CREATE TABLE IF NOT EXISTS payment_events (
    event_id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL REFERENCES transactions(transaction_id),
    merchant_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    source TEXT NOT NULL DEFAULT 'merchant_api',
    metadata JSONB NOT NULL DEFAULT '{}',
    integrity_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
"""

_PAYMENT_EVENTS_IDX = """
CREATE INDEX IF NOT EXISTS idx_payment_events_txn ON payment_events(transaction_id);
"""

_EVIDENCE_RECORDS_DDL = """
CREATE TABLE IF NOT EXISTS evidence_records (
    evidence_id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL REFERENCES transactions(transaction_id),
    merchant_id TEXT NOT NULL,
    event_id TEXT REFERENCES payment_events(event_id),
    evidence_type TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    source TEXT NOT NULL DEFAULT 'merchant_api',
    data JSONB NOT NULL DEFAULT '{}',
    integrity_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
"""

_EVIDENCE_RECORDS_IDX = """
CREATE INDEX IF NOT EXISTS idx_evidence_records_txn ON evidence_records(transaction_id);
"""

# ---------------------------------------------------------------------------
# DML
# ---------------------------------------------------------------------------

_UPSERT_TRANSACTION = """
INSERT INTO transactions (
    transaction_id, merchant_id, amount, currency, ip_address, device_hash, card_last4
) VALUES (%s, %s, %s, %s, %s, %s, %s)
ON CONFLICT (transaction_id) DO UPDATE SET
    merchant_id = EXCLUDED.merchant_id,
    amount = COALESCE(EXCLUDED.amount, transactions.amount),
    currency = EXCLUDED.currency,
    ip_address = COALESCE(EXCLUDED.ip_address, transactions.ip_address),
    device_hash = COALESCE(EXCLUDED.device_hash, transactions.device_hash),
    card_last4 = COALESCE(EXCLUDED.card_last4, transactions.card_last4),
    updated_at = now();
"""

_INSERT_EVENT = """
INSERT INTO payment_events (
    event_id, transaction_id, merchant_id, event_type, timestamp,
    source, metadata, integrity_hash
) VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb, %s);
"""

_INSERT_EVIDENCE = """
INSERT INTO evidence_records (
    evidence_id, transaction_id, merchant_id, event_id,
    evidence_type, timestamp, source, data, integrity_hash
) VALUES (%s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s);
"""


class LifecycleRepository:
    """Persistence layer for the transaction/event lifecycle."""

    def __init__(self, dsn: Optional[str] = None):
        self._dsn = dsn or settings.database_url
        self._lock = threading.Lock()

    def _connect(self):
        return psycopg.connect(self._dsn, row_factory=dict_row)

    # ---- schema ----

    def init_lifecycle_schema(self) -> bool:
        """Create lifecycle tables (idempotent).  Returns True on success."""
        try:
            with self._lock, self._connect() as conn:
                conn.execute(_TRANSACTIONS_DDL)
                conn.execute(_PAYMENT_EVENTS_DDL)
                conn.execute(_PAYMENT_EVENTS_IDX)
                conn.execute(_EVIDENCE_RECORDS_DDL)
                conn.execute(_EVIDENCE_RECORDS_IDX)
                conn.commit()
            return True
        except psycopg.OperationalError as exc:
            logger.error("Database unavailable during lifecycle schema init: %s", exc)
            return False

    # ---- transactions ----

    def save_transaction(
        self,
        transaction_id: str,
        merchant_id: str,
        amount: Optional[float] = None,
        currency: str = "USD",
        ip_address: Optional[str] = None,
        device_hash: Optional[str] = None,
        card_last4: Optional[str] = None,
    ) -> bool:
        try:
            with self._lock, self._connect() as conn:
                conn.execute(
                    _UPSERT_TRANSACTION,
                    (transaction_id, merchant_id, amount, currency, ip_address, device_hash, card_last4),
                )
                conn.commit()
            return True
        except psycopg.Error as exc:
            logger.error("Failed to save transaction %s: %s", transaction_id, exc)
            return False

    def get_transaction(self, transaction_id: str) -> Optional[Dict[str, Any]]:
        try:
            with self._lock, self._connect() as conn:
                row = conn.execute(
                    "SELECT * FROM transactions WHERE transaction_id = %s",
                    (transaction_id,),
                ).fetchone()
            return dict(row) if row else None
        except psycopg.Error as exc:
            logger.error("Failed to fetch transaction %s: %s", transaction_id, exc)
            return None

    def transaction_exists(self, transaction_id: str) -> bool:
        try:
            with self._lock, self._connect() as conn:
                row = conn.execute(
                    "SELECT 1 FROM transactions WHERE transaction_id = %s",
                    (transaction_id,),
                ).fetchone()
            return row is not None
        except psycopg.Error:
            return False

    # ---- payment events ----

    def save_event(
        self,
        event_id: str,
        transaction_id: str,
        merchant_id: str,
        event_type: str,
        timestamp: str,
        source: str = "merchant_api",
        metadata: Optional[Dict[str, Any]] = None,
        integrity_hash: str = "",
    ) -> bool:
        """Insert a new event.  Returns False on duplicate event_id (idempotent)."""
        try:
            with self._lock, self._connect() as conn:
                conn.execute(
                    _INSERT_EVENT,
                    (
                        event_id, transaction_id, merchant_id, event_type,
                        timestamp, source, json.dumps(metadata or {}), integrity_hash,
                    ),
                )
                conn.commit()
            return True
        except psycopg.errors.UniqueViolation:
            logger.info("Duplicate event_id %s ignored (idempotent).", event_id)
            return False
        except psycopg.Error as exc:
            logger.error("Failed to save event %s: %s", event_id, exc)
            return False

    def get_events_for_transaction(self, transaction_id: str) -> List[Dict[str, Any]]:
        try:
            with self._lock, self._connect() as conn:
                rows = conn.execute(
                    "SELECT * FROM payment_events WHERE transaction_id = %s ORDER BY timestamp ASC",
                    (transaction_id,),
                ).fetchall()
            return [dict(r) for r in rows]
        except psycopg.Error as exc:
            logger.error("Failed to list events for txn %s: %s", transaction_id, exc)
            return []

    def event_exists(self, event_id: str) -> bool:
        try:
            with self._lock, self._connect() as conn:
                row = conn.execute(
                    "SELECT 1 FROM payment_events WHERE event_id = %s",
                    (event_id,),
                ).fetchone()
            return row is not None
        except psycopg.Error:
            return False

    # ---- evidence records ----

    def save_evidence(
        self,
        evidence_id: str,
        transaction_id: str,
        merchant_id: str,
        event_id: Optional[str],
        evidence_type: str,
        timestamp: str,
        source: str = "merchant_api",
        data: Optional[Dict[str, Any]] = None,
        integrity_hash: str = "",
    ) -> bool:
        try:
            with self._lock, self._connect() as conn:
                conn.execute(
                    _INSERT_EVIDENCE,
                    (
                        evidence_id, transaction_id, merchant_id, event_id,
                        evidence_type, timestamp, source,
                        json.dumps(data or {}), integrity_hash,
                    ),
                )
                conn.commit()
            return True
        except psycopg.errors.UniqueViolation:
            logger.info("Duplicate evidence_id %s ignored.", evidence_id)
            return False
        except psycopg.Error as exc:
            logger.error("Failed to save evidence %s: %s", evidence_id, exc)
            return False

    def get_evidence_for_transaction(self, transaction_id: str) -> List[Dict[str, Any]]:
        try:
            with self._lock, self._connect() as conn:
                rows = conn.execute(
                    "SELECT * FROM evidence_records WHERE transaction_id = %s ORDER BY timestamp ASC",
                    (transaction_id,),
                ).fetchall()
            return [dict(r) for r in rows]
        except psycopg.Error as exc:
            logger.error("Failed to list evidence for txn %s: %s", transaction_id, exc)
            return []


lifecycle_repository = LifecycleRepository()
