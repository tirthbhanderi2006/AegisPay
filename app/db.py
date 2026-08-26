import json
import logging
import threading
from typing import Any, Dict, List, Optional

import psycopg
from psycopg.rows import dict_row

from app.config import settings

logger = logging.getLogger(__name__)

_SCHEMA = """
CREATE TABLE IF NOT EXISTS disputes (
    dispute_id TEXT PRIMARY KEY,
    network TEXT NOT NULL,
    reason_code TEXT NOT NULL,
    claim_type TEXT NOT NULL,
    decision TEXT NOT NULL,
    final_status TEXT NOT NULL,
    win_probability DOUBLE PRECISION,
    iterations_used INTEGER NOT NULL DEFAULT 0,
    event_payload JSONB NOT NULL,
    result JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
"""

_SAVE_SQL = """
INSERT INTO disputes (
    dispute_id, network, reason_code, claim_type, decision, final_status,
    win_probability, iterations_used, event_payload, result
) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb)
ON CONFLICT (dispute_id) DO UPDATE SET
    network = EXCLUDED.network,
    reason_code = EXCLUDED.reason_code,
    claim_type = EXCLUDED.claim_type,
    decision = EXCLUDED.decision,
    final_status = EXCLUDED.final_status,
    win_probability = EXCLUDED.win_probability,
    iterations_used = EXCLUDED.iterations_used,
    event_payload = EXCLUDED.event_payload,
    result = EXCLUDED.result,
    updated_at = now();
"""


class DisputeRepository:
    def __init__(self, dsn: Optional[str] = None):
        self._dsn = dsn or settings.database_url
        self._lock = threading.Lock()

    def _connect(self):
        return psycopg.connect(self._dsn, row_factory=dict_row)

    def init_schema(self) -> bool:
        try:
            with self._lock, self._connect() as conn:
                conn.execute(_SCHEMA)
                conn.commit()
            # Phase 1 — also initialize lifecycle tables
            try:
                from app.lifecycle_repo import lifecycle_repository
                lifecycle_repository.init_lifecycle_schema()
            except Exception as exc:
                logger.warning("Lifecycle schema init skipped: %s", exc)
            return True
        except psycopg.OperationalError as exc:
            logger.error("Database unavailable during schema init: %s", exc)
            return False

    def available(self) -> bool:
        try:
            with self._lock, self._connect() as conn:
                conn.execute("SELECT 1")
            return True
        except psycopg.Error:
            return False

    def save_dispute(
        self,
        dispute_id: str,
        network: str,
        reason_code: str,
        claim_type: str,
        decision: str,
        final_status: str,
        win_probability: float,
        iterations_used: int,
        event_payload: Dict[str, Any],
        result: Dict[str, Any],
    ) -> bool:
        try:
            with self._lock, self._connect() as conn:
                conn.execute(
                    _SAVE_SQL,
                    (
                        dispute_id,
                        network,
                        reason_code,
                        claim_type,
                        decision,
                        final_status,
                        win_probability,
                        iterations_used,
                        json.dumps(event_payload),
                        json.dumps(result),
                    ),
                )
                conn.commit()
            return True
        except psycopg.Error as exc:
            logger.error("Failed to persist dispute %s: %s", dispute_id, exc)
            return False

    def get_dispute(self, dispute_id: str) -> Optional[Dict[str, Any]]:
        try:
            with self._lock, self._connect() as conn:
                row = conn.execute(
                    "SELECT * FROM disputes WHERE dispute_id = %s", (dispute_id,)
                ).fetchone()
            return dict(row) if row else None
        except psycopg.Error as exc:
            logger.error("Failed to fetch dispute %s: %s", dispute_id, exc)
            return None

    def list_disputes(self, limit: int = 50) -> List[Dict[str, Any]]:
        try:
            with self._lock, self._connect() as conn:
                rows = conn.execute(
                    """
                    SELECT dispute_id, network, reason_code, claim_type, decision,
                           final_status, win_probability, iterations_used, created_at
                    FROM disputes
                    ORDER BY created_at DESC
                    LIMIT %s
                    """,
                    (limit,),
                ).fetchall()
            return [dict(row) for row in rows]
        except psycopg.Error as exc:
            logger.error("Failed to list disputes: %s", exc)
            return []


repository = DisputeRepository()
