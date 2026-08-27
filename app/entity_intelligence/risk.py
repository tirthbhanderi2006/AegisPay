"""Phase 3 — Deterministic Cross-Merchant Risk & Propagation Engine.

Implements:
- Cross-merchant feature extraction
- Deterministic risk propagation (1.0x direct, 0.5x 1-hop, 0.25x 2-hop)
- Safe shared-infrastructure attenuation (office NAT, mobile CGNAT, family device)
- Complete mathematical explainability and exact contribution attribution
- Strict cross-merchant privacy and anonymization boundaries
"""

import math
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Tuple

from pydantic import BaseModel, Field

from app.entity_intelligence.entities import EntityNode, EntityType, mask_entity_id
from app.entity_intelligence.graph import ClusterAnalysis, EntityGraph
from app.entity_intelligence.relationships import EntityEdge, RelationshipType
from app.models.firewall import SignalSeverity
from app.utils.timeutil import parse_iso8601


class CrossMerchantRiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class CrossMerchantSignal(BaseModel):
    """Deterministic signal produced by cross-merchant graph intelligence."""
    name: str
    value: float
    contribution: float
    severity: SignalSeverity
    description: str

    def to_anonymized_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "value": round(self.value, 4),
            "contribution": round(self.contribution, 4),
            "severity": self.severity.value,
            "description": self.description,
        }


class CrossMerchantFeatureVector(BaseModel):
    """Extracted cross-merchant feature dimensions."""
    merchants_on_device: int = 0
    merchants_on_ip: int = 0
    accounts_on_device: int = 0
    accounts_on_ip: int = 0
    devices_on_account: int = 0
    ips_on_account: int = 0
    cross_merchant_failure_rate: float = 0.0
    cross_merchant_velocity: float = 0.0
    device_reuse_rate: float = 0.0
    ip_reuse_rate: float = 0.0
    propagated_risk_score: float = 0.0


class CrossMerchantRiskAssessment(BaseModel):
    """Deterministic cross-merchant risk assessment with complete explainability."""
    entity_id: str
    entity_type: EntityType
    risk_score: float
    risk_level: CrossMerchantRiskLevel
    direct_risk: float
    propagated_risk: float
    merchants_observed: int
    accounts_observed: int
    failure_rate: float
    features: CrossMerchantFeatureVector
    signals: List[CrossMerchantSignal] = Field(default_factory=list)
    explanation: List[str] = Field(default_factory=list)
    cluster_summary: Optional[Dict[str, Any]] = None
    as_of: Optional[str] = None
    privacy_notice: str = "Cross-merchant data is strictly aggregated. Counterparty merchant identities and customer PII are not disclosed."

    def to_anonymized_dict(self) -> Dict[str, Any]:
        """Return safe view for cross-merchant API responses and audit logs."""
        return {
            "entity": mask_entity_id(self.entity_id),
            "entity_type": self.entity_type.value,
            "risk_score": round(self.risk_score, 4),
            "risk_level": self.risk_level.value,
            "direct_risk": round(self.direct_risk, 4),
            "propagated_risk": round(self.propagated_risk, 4),
            "merchants_observed": self.merchants_observed,
            "accounts_observed": self.accounts_observed,
            "failure_rate": round(self.failure_rate, 4),
            "signals": [s.to_anonymized_dict() for s in self.signals],
            "explanation": self.explanation,
            "cluster_summary": self.cluster_summary,
            "as_of": self.as_of,
            "privacy_notice": self.privacy_notice,
        }


def _sigmoid(x: float, midpoint: float, steepness: float = 1.0) -> float:
    """Standard numerically stable logistic sigmoid."""
    try:
        return 1.0 / (1.0 + math.exp(-steepness * (x - midpoint)))
    except OverflowError:
        return 0.0 if (x - midpoint) < 0 else 1.0


def _severity(score: float) -> SignalSeverity:
    if score >= 0.70:
        return SignalSeverity.high
    if score >= 0.35:
        return SignalSeverity.medium
    return SignalSeverity.low


def compute_cross_merchant_risk(
    graph: EntityGraph,
    entity_id: str,
    as_of: Optional[str] = None,
) -> CrossMerchantRiskAssessment:
    """Compute deterministic cross-merchant risk and risk propagation."""
    node = graph.get_node(entity_id, as_of=as_of)
    if not node:
        return CrossMerchantRiskAssessment(
            entity_id=entity_id,
            entity_type=EntityType.DEVICE if entity_id.startswith("dev_") else (
                EntityType.IP if entity_id.startswith("ip_") else EntityType.ACCOUNT
            ),
            risk_score=0.0,
            risk_level=CrossMerchantRiskLevel.LOW,
            direct_risk=0.0,
            propagated_risk=0.0,
            merchants_observed=0,
            accounts_observed=0,
            failure_rate=0.0,
            features=CrossMerchantFeatureVector(),
            signals=[],
            explanation=["No prior cross-merchant graph history observed for this entity."],
            as_of=as_of,
        )

    # 1. Inspect direct incident edges
    incident_edges = graph.get_incident_edges(entity_id, as_of=as_of)
    merchants_seen: Set[str] = set()
    accounts_seen: Set[str] = set()
    devices_seen: Set[str] = set()
    ips_seen: Set[str] = set()

    total_success = 0
    total_failures = 0
    total_occurrences = 0

    for e in incident_edges:
        other_id = e.target_id if e.source_id == entity_id else e.source_id
        other_node = graph.get_node(other_id, as_of=as_of)
        if other_node:
            if other_node.entity_type == EntityType.MERCHANT:
                merchants_seen.add(other_id)
            elif other_node.entity_type == EntityType.ACCOUNT:
                accounts_seen.add(other_id)
            elif other_node.entity_type == EntityType.DEVICE:
                devices_seen.add(other_id)
            elif other_node.entity_type == EntityType.IP:
                ips_seen.add(other_id)

        total_occurrences += e.occurrence_count
        total_success += e.success_count
        total_failures += e.failure_count

    total_outcomes = total_success + total_failures
    fail_rate = total_failures / total_outcomes if total_outcomes > 0 else 0.0

    features = CrossMerchantFeatureVector(
        merchants_on_device=len(merchants_seen) if node.entity_type == EntityType.DEVICE else 0,
        merchants_on_ip=len(merchants_seen) if node.entity_type == EntityType.IP else 0,
        accounts_on_device=len(accounts_seen) if node.entity_type == EntityType.DEVICE else 0,
        accounts_on_ip=len(accounts_seen) if node.entity_type == EntityType.IP else 0,
        devices_on_account=len(devices_seen) if node.entity_type == EntityType.ACCOUNT else 0,
        ips_on_account=len(ips_seen) if node.entity_type == EntityType.ACCOUNT else 0,
        cross_merchant_failure_rate=fail_rate,
        cross_merchant_velocity=float(total_occurrences),
    )

    signals: List[CrossMerchantSignal] = []
    explanation: List[str] = []

    direct_score = 0.0
    t_as_of = parse_iso8601(as_of) if as_of else None
    t_last = parse_iso8601(node.last_seen) if node.last_seen else None

    if node.risk_base_score > 0 and (t_as_of is None or (t_last and t_last <= t_as_of)):
        contrib = round(node.risk_base_score, 4)
        direct_score = max(direct_score, contrib)
        signals.append(CrossMerchantSignal(
            name="prior_investigation_risk",
            value=round(node.risk_base_score, 4),
            contribution=contrib,
            severity=_severity(node.risk_base_score),
            description=f"Entity has an elevated baseline risk ({round(node.risk_base_score, 2)}) from prior investigations",
        ))
        explanation.append(f"Entity flagged with elevated base risk ({round(node.risk_base_score, 2)}) in entity intelligence graph.")

    # Rule A: Cross-merchant device reuse with failure concentration
    if node.entity_type == EntityType.DEVICE:
        m_count = len(merchants_seen)
        a_count = len(accounts_seen)
        if a_count <= 3 and fail_rate == 0.0:
            explanation.append(f"Device associated with {a_count} accounts with 0% failures (legitimate shared family device).")
        elif m_count >= 2:
            dev_reuse_score = _sigmoid(m_count + a_count, midpoint=4, steepness=1.0) * (0.6 + 0.4 * fail_rate)
            if dev_reuse_score > 0.25:
                contrib = round(dev_reuse_score * 0.50, 4)
                direct_score += contrib
                signals.append(CrossMerchantSignal(
                    name="cross_merchant_device_reuse",
                    value=float(a_count),
                    contribution=contrib,
                    severity=_severity(dev_reuse_score),
                    description=f"Device observed across {a_count} accounts at {m_count} distinct merchants",
                ))
                explanation.append(f"Device associated with {a_count} accounts across {m_count} merchants in global graph.")


    # Rule B: Cross-merchant IP reuse with failure concentration
    elif node.entity_type == EntityType.IP:
        m_count = len(merchants_seen)
        a_count = len(accounts_seen)
        # Safe shared IP check (corporate NAT / mobile CGNAT / university network):
        # If failures are 0 and distinct accounts have separate devices, IP is safe infrastructure
        if a_count >= 3 and fail_rate == 0.0:
            explanation.append(f"IP observed across {a_count} accounts with 0% failures (legitimate shared network infrastructure).")
        elif (m_count >= 2 or a_count >= 3) and fail_rate >= 0.30:
            ip_reuse_score = _sigmoid(m_count + a_count, midpoint=4, steepness=1.0) * (0.5 + 0.5 * fail_rate)
            contrib = round(ip_reuse_score * 0.45, 4)
            direct_score += contrib
            signals.append(CrossMerchantSignal(
                name="cross_merchant_ip_failure_cluster",
                value=float(a_count),
                contribution=contrib,
                severity=_severity(ip_reuse_score),
                description=f"IP associated with {a_count} accounts across {m_count} merchants with {round(fail_rate*100)}% failure rate",
            ))
            explanation.append(f"IP associated with {a_count} accounts across {m_count} merchants exhibiting elevated failure concentration ({round(fail_rate*100)}%).")

    # Rule C: Account device/merchant rotation
    elif node.entity_type == EntityType.ACCOUNT:
        d_count = len(devices_seen)
        m_count = len(merchants_seen)
        if d_count >= 3 or m_count >= 3:
            rot_score = _sigmoid(d_count + m_count, midpoint=4, steepness=1.0) * (0.6 + 0.4 * fail_rate)
            contrib = round(rot_score * 0.45, 4)
            direct_score += contrib
            signals.append(CrossMerchantSignal(
                name="cross_merchant_account_device_rotation",
                value=float(d_count),
                contribution=contrib,
                severity=_severity(rot_score),
                description=f"Account rotated through {d_count} distinct devices across {m_count} merchants",
            ))
            explanation.append(f"Account associated with {d_count} devices across {m_count} merchants.")

    # Rule D: Cross-merchant failure rate component
    if total_outcomes >= 3 and fail_rate >= 0.50:
        fail_score = _sigmoid(fail_rate, midpoint=0.5, steepness=5.0)
        contrib = round(fail_score * 0.30, 4)
        direct_score += contrib
        signals.append(CrossMerchantSignal(
            name="cross_merchant_failure_rate",
            value=round(fail_rate, 4),
            contribution=contrib,
            severity=_severity(fail_score),
            description=f"Cross-merchant payment attempt failure rate is {round(fail_rate*100)}% ({total_failures}/{total_outcomes})",
        ))
        explanation.append(f"{round(fail_rate*100)}% of historical transactions on this entity across merchants failed.")

    # 3. Deterministic Risk Propagation from 1-hop and 2-hop neighbors
    hops = graph.get_neighbors_by_hop(entity_id, as_of=as_of, max_depth=2)
    propagated_addition = 0.0

    # 1-hop propagation (weight 0.50)
    for n1_id in hops.get(1, set()):
        n1 = graph.get_node(n1_id, as_of=as_of)
        if n1 and n1.risk_base_score >= 0.40:
            prop_val = round(n1.risk_base_score * 0.50, 4)
            propagated_addition += prop_val
            signals.append(CrossMerchantSignal(
                name=f"propagated_1hop_neighbor_risk",
                value=round(n1.risk_base_score, 4),
                contribution=prop_val,
                severity=_severity(n1.risk_base_score),
                description=f"Directly connected to high-risk {n1.entity_type.value} in entity graph",
            ))
            explanation.append(f"Direct 1-hop link to high-risk {n1.entity_type.value} propagates +{prop_val:.2f} risk.")

    # 2-hop propagation (weight 0.25)
    for n2_id in hops.get(2, set()):
        n2 = graph.get_node(n2_id, as_of=as_of)
        if n2 and n2.risk_base_score >= 0.60:
            prop_val = round(n2.risk_base_score * 0.25, 4)
            propagated_addition += prop_val
            signals.append(CrossMerchantSignal(
                name=f"propagated_2hop_neighbor_risk",
                value=round(n2.risk_base_score, 4),
                contribution=prop_val,
                severity=_severity(n2.risk_base_score * 0.5),
                description=f"2-hop graph proximity to suspicious {n2.entity_type.value}",
            ))
            explanation.append(f"2-hop proximity to suspicious {n2.entity_type.value} propagates +{prop_val:.2f} risk.")

    # 4. Connected Cluster Analysis
    cluster = graph.find_connected_cluster(entity_id, as_of=as_of, max_depth=2)
    if cluster.node_count >= 5 and cluster.cluster_failure_rate >= 0.60:
        cluster_score = _sigmoid(cluster.node_count, midpoint=5, steepness=1.0) * cluster.cluster_failure_rate
        contrib = round(cluster_score * 0.20, 4)
        direct_score += contrib
        signals.append(CrossMerchantSignal(
            name="suspicious_entity_cluster",
            value=float(cluster.node_count),
            contribution=contrib,
            severity=SignalSeverity.high,
            description=f"Part of a {cluster.node_count}-node cluster across {cluster.merchants_involved} merchants with high failure rate",
        ))
        explanation.append(f"Connected to an active {cluster.node_count}-node fraud cluster spanning {cluster.merchants_involved} merchants.")

    total_risk = min(1.0, round(direct_score + propagated_addition, 4))
    features.propagated_risk_score = round(propagated_addition, 4)

    # Risk level classification
    if total_risk >= 0.70:
        risk_level = CrossMerchantRiskLevel.HIGH
    elif total_risk >= 0.30:
        risk_level = CrossMerchantRiskLevel.MEDIUM
    else:
        risk_level = CrossMerchantRiskLevel.LOW

    if not explanation:
        explanation.append("Behavior within normal cross-merchant baselines.")

    return CrossMerchantRiskAssessment(
        entity_id=entity_id,
        entity_type=node.entity_type,
        risk_score=total_risk,
        risk_level=risk_level,
        direct_risk=round(direct_score, 4),
        propagated_risk=round(propagated_addition, 4),
        merchants_observed=len(merchants_seen),
        accounts_observed=len(accounts_seen),
        failure_rate=round(fail_rate, 4),
        features=features,
        signals=signals,
        explanation=explanation,
        cluster_summary={
            "cluster_id": cluster.cluster_id,
            "node_count": cluster.node_count,
            "edge_count": cluster.edge_count,
            "merchants_involved": cluster.merchants_involved,
            "cluster_failure_rate": round(cluster.cluster_failure_rate, 4),
        },
        as_of=as_of,
    )
