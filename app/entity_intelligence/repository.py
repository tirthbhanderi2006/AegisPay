"""Phase 3 — Entity Intelligence Persistence Layer.

PostgreSQL persistence layer with automatic schema table creation and
thread-safe in-memory fallback.
"""

import json
import logging
import threading
from typing import Any, Dict, List, Optional

import psycopg
from psycopg.rows import dict_row

from app.config import settings
from app.entity_intelligence.entities import EntityNode, EntityType, make_entity_id
from app.entity_intelligence.graph import EntityGraph
from app.entity_intelligence.relationships import EntityEdge, RelationshipType, make_edge_id

logger = logging.getLogger(__name__)

_ENTITY_NODES_DDL = """
CREATE TABLE IF NOT EXISTS entity_nodes (
    entity_id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    first_seen TIMESTAMPTZ NOT NULL,
    last_seen TIMESTAMPTZ NOT NULL,
    risk_base_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    occurrence_count INTEGER NOT NULL DEFAULT 1,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
"""

_ENTITY_NODES_IDX = """
CREATE INDEX IF NOT EXISTS idx_entity_nodes_type ON entity_nodes(entity_type);
"""

_ENTITY_EDGES_DDL = """
CREATE TABLE IF NOT EXISTS entity_edges (
    edge_id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL,
    target_id TEXT NOT NULL,
    relationship_type TEXT NOT NULL,
    first_seen TIMESTAMPTZ NOT NULL,
    last_seen TIMESTAMPTZ NOT NULL,
    occurrence_count INTEGER NOT NULL DEFAULT 1,
    success_count INTEGER NOT NULL DEFAULT 0,
    failure_count INTEGER NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
"""

_ENTITY_EDGES_IDX = """
CREATE INDEX IF NOT EXISTS idx_entity_edges_source ON entity_edges(source_id);
CREATE INDEX IF NOT EXISTS idx_entity_edges_target ON entity_edges(target_id);
CREATE INDEX IF NOT EXISTS idx_entity_edges_rel ON entity_edges(relationship_type);
"""


class EntityIntelligenceRepository:
    """PostgreSQL repository + in-memory graph cache."""

    def __init__(self, dsn: Optional[str] = None) -> None:
        self._dsn = dsn if dsn is not None else settings.database_url
        self._graph = EntityGraph()
        self._lock = threading.Lock()
        self._pg_available: Optional[bool] = None
        self._init_db()

    def _init_db(self) -> None:
        try:
            with psycopg.connect(self._dsn, autocommit=True) as conn:
                with conn.cursor() as cur:
                    cur.execute(_ENTITY_NODES_DDL)
                    cur.execute(_ENTITY_NODES_IDX)
                    cur.execute(_ENTITY_EDGES_DDL)
                    cur.execute(_ENTITY_EDGES_IDX)
            self._pg_available = True
            logger.info("EntityIntelligenceRepository: connected to PostgreSQL, schema initialized.")
        except Exception as e:
            self._pg_available = False
            logger.warning(f"EntityIntelligenceRepository: PostgreSQL not reachable ({e}). Using in-memory graph.")

    def get_graph(self) -> EntityGraph:
        """Return the in-memory graph instance."""
        return self._graph

    def save_node(self, node: EntityNode) -> None:
        """Save or update node in both in-memory graph and PostgreSQL."""
        with self._lock:
            self._graph.add_node(node)

        if self._pg_available:
            try:
                with psycopg.connect(self._dsn, autocommit=True) as conn:
                    with conn.cursor() as cur:
                        cur.execute(
                            """
                            INSERT INTO entity_nodes (entity_id, entity_type, first_seen, last_seen, risk_base_score, occurrence_count, metadata)
                            VALUES (%s, %s, %s, %s, %s, %s, %s)
                            ON CONFLICT (entity_id) DO UPDATE SET
                                last_seen = EXCLUDED.last_seen,
                                occurrence_count = entity_nodes.occurrence_count + EXCLUDED.occurrence_count,
                                risk_base_score = GREATEST(entity_nodes.risk_base_score, EXCLUDED.risk_base_score),
                                updated_at = now()
                            """,
                            (
                                node.entity_id,
                                node.entity_type.value,
                                node.first_seen,
                                node.last_seen,
                                node.risk_base_score,
                                node.occurrence_count,
                                json.dumps(node.metadata),
                            ),
                        )
            except Exception as e:
                logger.error(f"EntityIntelligenceRepository: failed to save node to PostgreSQL: {e}")

    def save_edge(self, edge: EntityEdge) -> None:
        """Save or update edge in both in-memory graph and PostgreSQL."""
        with self._lock:
            self._graph.add_edge(edge)

        if self._pg_available:
            try:
                with psycopg.connect(self._dsn, autocommit=True) as conn:
                    with conn.cursor() as cur:
                        cur.execute(
                            """
                            INSERT INTO entity_edges (edge_id, source_id, target_id, relationship_type, first_seen, last_seen, occurrence_count, success_count, failure_count, metadata)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                            ON CONFLICT (edge_id) DO UPDATE SET
                                last_seen = EXCLUDED.last_seen,
                                occurrence_count = entity_edges.occurrence_count + EXCLUDED.occurrence_count,
                                success_count = entity_edges.success_count + EXCLUDED.success_count,
                                failure_count = entity_edges.failure_count + EXCLUDED.failure_count,
                                updated_at = now()
                            """,
                            (
                                edge.edge_id,
                                edge.source_id,
                                edge.target_id,
                                edge.relationship_type.value,
                                edge.first_seen,
                                edge.last_seen,
                                edge.occurrence_count,
                                edge.success_count,
                                edge.failure_count,
                                json.dumps(edge.metadata),
                            ),
                        )
            except Exception as e:
                logger.error(f"EntityIntelligenceRepository: failed to save edge to PostgreSQL: {e}")

    def ingest_event_into_graph(self, event: Dict[str, Any]) -> None:
        """Extract entities and relationships from a payment event into the graph."""
        ts = event.get("timestamp", "2026-01-01T00:00:00Z")
        etype = event.get("event_type", "")
        merch_raw = event.get("merchant_id") or event.get("metadata", {}).get("merchant_id")
        acc_raw = event.get("account_id") or event.get("metadata", {}).get("account_id")
        dev_raw = event.get("device_hash") or event.get("metadata", {}).get("device_hash")
        ip_raw = event.get("ip_address") or event.get("metadata", {}).get("ip_address")
        tok_raw = event.get("payment_method_token") or event.get("metadata", {}).get("payment_method_token")
        txn_raw = event.get("transaction_id") or event.get("metadata", {}).get("transaction_id")

        is_success = "SUCCESS" in etype or etype == "PAYMENT_SUCCEEDED"
        is_failure = "FAIL" in etype or etype == "PAYMENT_FAILED" or "DECLINE" in etype

        succ = 1 if is_success else 0
        fail = 1 if is_failure else 0

        # Create/update entities
        if merch_raw:
            m_id = make_entity_id(EntityType.MERCHANT, merch_raw)
            self.save_node(EntityNode(entity_id=m_id, entity_type=EntityType.MERCHANT, first_seen=ts, last_seen=ts))

        if acc_raw:
            a_id = make_entity_id(EntityType.ACCOUNT, acc_raw)
            self.save_node(EntityNode(entity_id=a_id, entity_type=EntityType.ACCOUNT, first_seen=ts, last_seen=ts))

        if dev_raw:
            d_id = make_entity_id(EntityType.DEVICE, dev_raw)
            self.save_node(EntityNode(entity_id=d_id, entity_type=EntityType.DEVICE, first_seen=ts, last_seen=ts))

        if ip_raw:
            i_id = make_entity_id(EntityType.IP, ip_raw)
            self.save_node(EntityNode(entity_id=i_id, entity_type=EntityType.IP, first_seen=ts, last_seen=ts))

        # Create/update edges
        if acc_raw and dev_raw:
            e_id = make_edge_id(a_id, d_id, RelationshipType.USES_DEVICE)
            self.save_edge(EntityEdge(edge_id=e_id, source_id=a_id, target_id=d_id, relationship_type=RelationshipType.USES_DEVICE, first_seen=ts, last_seen=ts, success_count=succ, failure_count=fail))

        if acc_raw and ip_raw:
            e_id = make_edge_id(a_id, i_id, RelationshipType.USES_IP)
            self.save_edge(EntityEdge(edge_id=e_id, source_id=a_id, target_id=i_id, relationship_type=RelationshipType.USES_IP, first_seen=ts, last_seen=ts, success_count=succ, failure_count=fail))

        if dev_raw and merch_raw:
            e_id = make_edge_id(d_id, m_id, RelationshipType.SEEN_ON_MERCHANT)
            self.save_edge(EntityEdge(edge_id=e_id, source_id=d_id, target_id=m_id, relationship_type=RelationshipType.SEEN_ON_MERCHANT, first_seen=ts, last_seen=ts, success_count=succ, failure_count=fail))

        if ip_raw and merch_raw:
            e_id = make_edge_id(i_id, m_id, RelationshipType.SEEN_ON_MERCHANT)
            self.save_edge(EntityEdge(edge_id=e_id, source_id=i_id, target_id=m_id, relationship_type=RelationshipType.SEEN_ON_MERCHANT, first_seen=ts, last_seen=ts, success_count=succ, failure_count=fail))

        if acc_raw and merch_raw:
            e_id = make_edge_id(a_id, m_id, RelationshipType.TRANSACTED_WITH_MERCHANT)
            self.save_edge(EntityEdge(edge_id=e_id, source_id=a_id, target_id=m_id, relationship_type=RelationshipType.TRANSACTED_WITH_MERCHANT, first_seen=ts, last_seen=ts, success_count=succ, failure_count=fail))


# Global singleton instance
entity_repo = EntityIntelligenceRepository()
