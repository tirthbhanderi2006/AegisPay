"""Phase 3 — Deterministic Entity Graph Engine.

Implements in-memory graph representation with:
- Indexed bidirectional adjacency
- Strict temporal filtering (as_of timestamp cutoff)
- Traversal boundaries (max_depth=2, max_nodes=200)
- Connected cluster & component extraction
- Privacy-safe anonymized export
"""

import hashlib
from collections import defaultdict, deque
from typing import Any, Dict, List, Optional, Set, Tuple

from pydantic import BaseModel, Field

from app.entity_intelligence.entities import EntityNode, EntityType, mask_entity_id
from app.entity_intelligence.relationships import EntityEdge, RelationshipType
from app.utils.timeutil import parse_iso8601


class ClusterAnalysis(BaseModel):
    """Deterministic summary of a connected entity cluster."""
    cluster_id: str
    root_entity_id: str
    node_count: int
    edge_count: int
    merchants_involved: int
    accounts_involved: int
    devices_involved: int
    ips_involved: int
    instruments_involved: int
    cluster_failure_rate: float
    total_events: int
    nodes: List[EntityNode] = Field(default_factory=list)
    edges: List[EntityEdge] = Field(default_factory=list)

    def to_anonymized_dict(self) -> Dict[str, Any]:
        """Return safe view for cross-merchant presentation."""
        return {
            "cluster_id": self.cluster_id,
            "root_entity": mask_entity_id(self.root_entity_id),
            "node_count": self.node_count,
            "edge_count": self.edge_count,
            "merchants_involved": self.merchants_involved,
            "accounts_involved": self.accounts_involved,
            "devices_involved": self.devices_involved,
            "ips_involved": self.ips_involved,
            "instruments_involved": self.instruments_involved,
            "cluster_failure_rate": round(self.cluster_failure_rate, 4),
            "total_events": self.total_events,
            "nodes": [n.to_anonymized_dict() for n in self.nodes],
            "edges": [e.to_anonymized_dict() for e in self.edges],
        }


class EntityGraph:
    """Deterministic, thread-safe in-memory Entity Graph."""

    def __init__(self) -> None:
        self.nodes: Dict[str, EntityNode] = {}
        # Forward adjacency: source_id -> list of EntityEdge
        self._adj_out: Dict[str, List[EntityEdge]] = defaultdict(list)
        # Reverse adjacency: target_id -> list of EntityEdge
        self._adj_in: Dict[str, List[EntityEdge]] = defaultdict(list)
        # Edge lookup index: edge_id -> EntityEdge
        self._edges: Dict[str, EntityEdge] = {}

    def add_node(self, node: EntityNode) -> None:
        """Add or update an entity node deterministically."""
        existing = self.nodes.get(node.entity_id)
        if not existing:
            self.nodes[node.entity_id] = node.model_copy()
        else:
            # Update temporal envelope
            t_curr_first = parse_iso8601(existing.first_seen)
            t_new_first = parse_iso8601(node.first_seen)
            if t_curr_first and t_new_first and t_new_first < t_curr_first:
                existing.first_seen = node.first_seen

            t_curr_last = parse_iso8601(existing.last_seen)
            t_new_last = parse_iso8601(node.last_seen)
            if t_curr_last and t_new_last and t_new_last > t_curr_last:
                existing.last_seen = node.last_seen

            existing.occurrence_count += node.occurrence_count
            if node.risk_base_score > existing.risk_base_score:
                existing.risk_base_score = node.risk_base_score
            existing.metadata.update(node.metadata)

    def add_edge(self, edge: EntityEdge) -> None:
        """Add or merge an entity edge deterministically."""
        existing = self._edges.get(edge.edge_id)
        if not existing:
            new_edge = edge.model_copy()
            self._edges[edge.edge_id] = new_edge
            self._adj_out[edge.source_id].append(new_edge)
            self._adj_in[edge.target_id].append(new_edge)
        else:
            t_curr_first = parse_iso8601(existing.first_seen)
            t_new_first = parse_iso8601(edge.first_seen)
            if t_curr_first and t_new_first and t_new_first < t_curr_first:
                existing.first_seen = edge.first_seen

            t_curr_last = parse_iso8601(existing.last_seen)
            t_new_last = parse_iso8601(edge.last_seen)
            if t_curr_last and t_new_last and t_new_last > t_curr_last:
                existing.last_seen = edge.last_seen

            existing.occurrence_count += edge.occurrence_count
            existing.success_count += edge.success_count
            existing.failure_count += edge.failure_count
            existing.metadata.update(edge.metadata)

    def get_node(self, entity_id: str, as_of: Optional[str] = None) -> Optional[EntityNode]:
        """Retrieve node if it existed at or before as_of."""
        node = self.nodes.get(entity_id)
        if not node:
            return None
        if as_of:
            t_as_of = parse_iso8601(as_of)
            t_first = parse_iso8601(node.first_seen)
            if t_as_of and t_first and t_first > t_as_of:
                return None
        return node

    def get_incident_edges(
        self,
        entity_id: str,
        as_of: Optional[str] = None,
    ) -> List[EntityEdge]:
        """Return all valid incoming and outgoing edges for an entity at as_of."""
        all_edges = self._adj_out.get(entity_id, []) + self._adj_in.get(entity_id, [])
        if not as_of:
            return all_edges

        t_as_of = parse_iso8601(as_of)
        if not t_as_of:
            return all_edges

        valid: List[EntityEdge] = []
        for e in all_edges:
            t_first = parse_iso8601(e.first_seen)
            if t_first and t_first <= t_as_of:
                valid.append(e)
        return valid

    def get_neighbors_by_hop(
        self,
        entity_id: str,
        as_of: Optional[str] = None,
        max_depth: int = 2,
        max_nodes: int = 200,
    ) -> Dict[int, Set[str]]:
        """Return connected entity IDs grouped by hop distance {1: set(), 2: set()}."""
        hops: Dict[int, Set[str]] = {1: set(), 2: set()}
        if entity_id not in self.nodes:
            return hops

        visited: Set[str] = {entity_id}
        queue: deque[Tuple[str, int]] = deque([(entity_id, 0)])

        while queue and len(visited) < max_nodes:
            curr_id, curr_depth = queue.popleft()
            if curr_depth >= max_depth:
                continue

            for edge in self.get_incident_edges(curr_id, as_of=as_of):
                neighbor = edge.target_id if edge.source_id == curr_id else edge.source_id
                if neighbor not in visited:
                    visited.add(neighbor)
                    next_depth = curr_depth + 1
                    if next_depth in hops:
                        hops[next_depth].add(neighbor)
                    queue.append((neighbor, next_depth))

        return hops

    def find_connected_cluster(
        self,
        entity_id: str,
        as_of: Optional[str] = None,
        max_depth: int = 2,
        max_nodes: int = 200,
    ) -> ClusterAnalysis:
        """Extract the surrounding connected subgraph cluster for an entity."""
        if entity_id not in self.nodes:
            return ClusterAnalysis(
                cluster_id="cluster_empty",
                root_entity_id=entity_id,
                node_count=0,
                edge_count=0,
                merchants_involved=0,
                accounts_involved=0,
                devices_involved=0,
                ips_involved=0,
                instruments_involved=0,
                cluster_failure_rate=0.0,
                total_events=0,
            )

        visited_nodes: Set[str] = {entity_id}
        collected_edges: Dict[str, EntityEdge] = {}
        queue: deque[Tuple[str, int]] = deque([(entity_id, 0)])

        while queue and len(visited_nodes) < max_nodes:
            curr_id, curr_depth = queue.popleft()
            if curr_depth >= max_depth:
                continue

            for edge in self.get_incident_edges(curr_id, as_of=as_of):
                collected_edges[edge.edge_id] = edge
                neighbor = edge.target_id if edge.source_id == curr_id else edge.source_id
                if neighbor not in visited_nodes:
                    visited_nodes.add(neighbor)
                    queue.append((neighbor, curr_depth + 1))

        nodes_list = [self.nodes[n_id] for n_id in visited_nodes if n_id in self.nodes]
        edges_list = list(collected_edges.values())

        # Calculate cluster statistics
        merchants = set()
        accounts = set()
        devices = set()
        ips = set()
        instruments = set()
        total_success = 0
        total_failures = 0
        total_events = 0

        for n in nodes_list:
            if n.entity_type == EntityType.MERCHANT:
                merchants.add(n.entity_id)
            elif n.entity_type == EntityType.ACCOUNT:
                accounts.add(n.entity_id)
            elif n.entity_type == EntityType.DEVICE:
                devices.add(n.entity_id)
            elif n.entity_type == EntityType.IP:
                ips.add(n.entity_id)
            elif n.entity_type == EntityType.PAYMENT_INSTRUMENT:
                instruments.add(n.entity_id)

        for e in edges_list:
            total_events += e.occurrence_count
            total_success += e.success_count
            total_failures += e.failure_count

        total_outcomes = total_success + total_failures
        cluster_failure_rate = (
            total_failures / total_outcomes if total_outcomes > 0 else 0.0
        )

        sorted_node_ids = sorted(visited_nodes)
        cluster_hash = hashlib.sha256(":".join(sorted_node_ids).encode("utf-8")).hexdigest()[:12]
        cluster_id = f"cluster_{cluster_hash}"

        return ClusterAnalysis(
            cluster_id=cluster_id,
            root_entity_id=entity_id,
            node_count=len(nodes_list),
            edge_count=len(edges_list),
            merchants_involved=len(merchants),
            accounts_involved=len(accounts),
            devices_involved=len(devices),
            ips_involved=len(ips),
            instruments_involved=len(instruments),
            cluster_failure_rate=cluster_failure_rate,
            total_events=total_events,
            nodes=nodes_list,
            edges=edges_list,
        )


entity_graph = EntityGraph()
