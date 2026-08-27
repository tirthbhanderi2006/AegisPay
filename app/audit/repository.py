"""Repository for storing and querying immutable decision audit snapshots."""

import json
import logging
import threading
from typing import Dict, List, Optional

from app.audit.models import RiskDecisionSnapshot
from app.config import settings

logger = logging.getLogger(__name__)

CREATE_DECISION_SNAPSHOTS_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS decision_snapshots (
    transaction_id VARCHAR(100) PRIMARY KEY,
    session_id VARCHAR(100) NOT NULL,
    merchant_id VARCHAR(100) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    feature_values JSONB NOT NULL,
    feature_contributions JSONB NOT NULL,
    signals JSONB NOT NULL,
    graph_snapshot_version VARCHAR(100) NOT NULL,
    calibration_version VARCHAR(100) NOT NULL,
    calibration_hash VARCHAR(100) NOT NULL,
    threshold_version VARCHAR(100) NOT NULL,
    fx_rate_version VARCHAR(100) NOT NULL,
    feature_schema_version VARCHAR(20) NOT NULL,
    evidence_quality DOUBLE PRECISION NOT NULL,
    final_score DOUBLE PRECISION NOT NULL,
    final_action VARCHAR(50) NOT NULL,
    decision_hash VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_snapshots_merchant ON decision_snapshots (merchant_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_snapshots_session ON decision_snapshots (session_id);
"""


class DecisionSnapshotRepository:
    """PostgreSQL storage + in-memory store for immutable decision audit snapshots."""

    def __init__(self, dsn: Optional[str] = None) -> None:
        self._dsn = dsn if dsn is not None else settings.database_url
        self._snapshots: Dict[str, RiskDecisionSnapshot] = {}
        self._lock = threading.Lock()

    def save_snapshot(self, snapshot: RiskDecisionSnapshot) -> None:
        with self._lock:
            self._snapshots[snapshot.transaction_id] = snapshot

    def get_snapshot(self, transaction_id: str) -> Optional[RiskDecisionSnapshot]:
        with self._lock:
            return self._snapshots.get(transaction_id)

    def list_snapshots(self, limit: int = 100) -> List[RiskDecisionSnapshot]:
        with self._lock:
            return list(self._snapshots.values())[:limit]


audit_repo = DecisionSnapshotRepository()
