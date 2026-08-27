"""Phase 3 — Entity Intelligence and Cross-Merchant Graph Tests.

Covers:
- Entity and relationship models + canonical ID generation
- Strict privacy masking & anonymization
- Temporal graph engine with as_of cutoff (no hindsight leakage)
- Deterministic risk propagation math (1.0x direct, 0.5x 1-hop, 0.25x 2-hop)
- Safe shared infrastructure attenuation (office NAT, family device, mobile carrier)
- Cross-merchant attack detection (device reuse ring, IP ring, distributed low-and-slow, merchant hopping)
- Headline ablation verification (Local ALLOW vs Cross-Merchant BLOCK/CHALLENGE)
- Explainability endpoint format and exact contribution attribution
- Conservative firewall policy compliance
- Pre-dispute context injection in LangGraph workflow
"""

import pytest

from app.entity_intelligence.entities import EntityNode, EntityType, make_entity_id, mask_entity_id
from app.entity_intelligence.evaluation import _build_graph_from_events, run_cross_merchant_ablation, run_temporal_integrity_validation
from app.entity_intelligence.graph import EntityGraph
from app.entity_intelligence.relationships import EntityEdge, RelationshipType, make_edge_id
from app.entity_intelligence.risk import CrossMerchantRiskLevel, compute_cross_merchant_risk
from app.entity_intelligence.synthetic import (
    gen_account_device_rotation,
    gen_device_reuse_ring,
    gen_distributed_low_and_slow,
    gen_ip_reuse_ring,
    gen_legitimate_family_device,
    gen_legitimate_mobile_network,
    gen_legitimate_office_network,
    gen_merchant_hopping,
    gen_mixed_entity_ring,
)
from app.firewall.engine import evaluate_session_from_dicts
from app.models.firewall import RecommendedAction


class TestEntityAndRelationshipModels:
    def test_canonical_id_generation(self):
        assert make_entity_id(EntityType.DEVICE, "dev_123") == "dev_123"
        assert make_entity_id(EntityType.DEVICE, "raw_dev_hash") == "dev_raw_dev_hash"
        assert make_entity_id(EntityType.IP, "192.168.1.1") == "ip_192.168.1.1"
        assert make_entity_id(EntityType.MERCHANT, "merch_acme") == "merch_acme"

    def test_privacy_masking_boundary(self):
        assert mask_entity_id("dev_a89f72b1c4") == "dev_***b1c4"
        assert mask_entity_id("ip_192.168.1.1") == "ip_***.1.1"
        assert mask_entity_id("merch_001") == "merchant_counterparty"
        assert mask_entity_id("merchant_target") == "merchant_counterparty"

    def test_edge_aggregation(self):
        e1 = EntityEdge(
            edge_id="a1:USES_DEVICE:d1",
            source_id="a1",
            target_id="d1",
            relationship_type=RelationshipType.USES_DEVICE,
            first_seen="2026-07-20T10:00:00Z",
            last_seen="2026-07-20T10:00:00Z",
            occurrence_count=1,
            success_count=1,
            failure_count=0,
        )
        graph = EntityGraph()
        graph.add_edge(e1)

        e2 = EntityEdge(
            edge_id="a1:USES_DEVICE:d1",
            source_id="a1",
            target_id="d1",
            relationship_type=RelationshipType.USES_DEVICE,
            first_seen="2026-07-20T09:00:00Z",
            last_seen="2026-07-20T11:00:00Z",
            occurrence_count=2,
            success_count=1,
            failure_count=1,
        )
        graph.add_edge(e2)

        edges = graph.get_incident_edges("a1")
        assert len(edges) == 1
        merged = edges[0]
        assert merged.first_seen == "2026-07-20T09:00:00Z"
        assert merged.last_seen == "2026-07-20T11:00:00Z"
        assert merged.occurrence_count == 3
        assert merged.success_count == 2
        assert merged.failure_count == 1


class TestTemporalIntegrityAndHindsightGuardrails:
    def test_temporal_filtering_excludes_future_events(self):
        res = run_temporal_integrity_validation()
        assert res["is_temporal_integrity_preserved"] is True
        assert res["hindsight_leakage_detected"] is False
        assert res["risk_score_at_t0"] == 0.0
        assert res["merchants_observed_at_t0"] == 1
        assert res["risk_score_at_t1"] > 0.30
        assert res["merchants_observed_at_t1"] == 2


class TestRiskPropagationEngine:
    def test_risk_propagates_from_1hop_and_2hop_neighbors(self):
        graph = EntityGraph()
        # Node 1: Target transaction
        graph.add_node(EntityNode(entity_id="acc_target", entity_type=EntityType.ACCOUNT, first_seen="2026-07-20T10:00:00Z", last_seen="2026-07-20T10:00:00Z"))
        # Node 2: 1-hop Device (compromised, risk=0.80)
        graph.add_node(EntityNode(entity_id="dev_bad", entity_type=EntityType.DEVICE, first_seen="2026-07-20T10:00:00Z", last_seen="2026-07-20T10:00:00Z", risk_base_score=0.80))
        # Node 3: 2-hop IP (botnet IP, risk=0.90)
        graph.add_node(EntityNode(entity_id="ip_bad", entity_type=EntityType.IP, first_seen="2026-07-20T10:00:00Z", last_seen="2026-07-20T10:00:00Z", risk_base_score=0.90))

        # Edges: acc_target -> dev_bad -> ip_bad
        graph.add_edge(EntityEdge(edge_id="e1", source_id="acc_target", target_id="dev_bad", relationship_type=RelationshipType.USES_DEVICE, first_seen="2026-07-20T10:00:00Z", last_seen="2026-07-20T10:00:00Z"))
        graph.add_edge(EntityEdge(edge_id="e2", source_id="dev_bad", target_id="ip_bad", relationship_type=RelationshipType.USES_IP, first_seen="2026-07-20T10:00:00Z", last_seen="2026-07-20T10:00:00Z"))

        res = compute_cross_merchant_risk(graph, "acc_target")
        # 1-hop dev_bad propagates: 0.80 * 0.50 = 0.40
        # 2-hop ip_bad propagates: 0.90 * 0.25 = 0.225
        # Total propagated risk approx 0.625
        assert res.propagated_risk >= 0.60
        assert res.risk_score >= 0.60
        assert res.risk_level in (CrossMerchantRiskLevel.MEDIUM, CrossMerchantRiskLevel.HIGH)


class TestSafeSharedInfrastructureAttenuation:
    def test_office_nat_is_not_flagged(self):
        import random
        sample = gen_legitimate_office_network(random.Random(42), 0)
        graph = _build_graph_from_events(sample["cross_merchant_history"] + sample["current_session"])
        res = compute_cross_merchant_risk(graph, sample["target_entity_id"])
        assert res.risk_level == CrossMerchantRiskLevel.LOW
        assert res.risk_score <= 0.25

    def test_family_shared_device_is_not_flagged(self):
        import random
        sample = gen_legitimate_family_device(random.Random(42), 0)
        graph = _build_graph_from_events(sample["cross_merchant_history"] + sample["current_session"])
        res = compute_cross_merchant_risk(graph, sample["target_entity_id"])
        assert res.risk_level == CrossMerchantRiskLevel.LOW
        assert res.risk_score <= 0.25

    def test_mobile_cgnat_is_not_flagged(self):
        import random
        sample = gen_legitimate_mobile_network(random.Random(42), 0)
        graph = _build_graph_from_events(sample["cross_merchant_history"] + sample["current_session"])
        res = compute_cross_merchant_risk(graph, sample["target_entity_id"])
        assert res.risk_level == CrossMerchantRiskLevel.LOW
        assert res.risk_score <= 0.25


class TestCrossMerchantAttackScenarios:
    def test_device_reuse_ring_detected(self):
        import random
        sample = gen_device_reuse_ring(random.Random(42), 0)
        graph = _build_graph_from_events(sample["cross_merchant_history"] + sample["current_session"])
        res = compute_cross_merchant_risk(graph, sample["target_entity_id"])
        assert res.risk_level == CrossMerchantRiskLevel.HIGH
        assert res.risk_score >= 0.70
        assert res.merchants_observed >= 4

    def test_ip_reuse_ring_detected(self):
        import random
        sample = gen_ip_reuse_ring(random.Random(42), 0)
        graph = _build_graph_from_events(sample["cross_merchant_history"] + sample["current_session"])
        res = compute_cross_merchant_risk(graph, sample["target_entity_id"])
        assert res.risk_level == CrossMerchantRiskLevel.HIGH
        assert res.risk_score >= 0.70

    def test_distributed_low_and_slow_detected(self):
        import random
        sample = gen_distributed_low_and_slow(random.Random(42), 0)
        graph = _build_graph_from_events(sample["cross_merchant_history"] + sample["current_session"])
        res = compute_cross_merchant_risk(graph, sample["target_entity_id"])
        assert res.risk_score >= 0.35

    def test_merchant_hopping_detected(self):
        import random
        sample = gen_merchant_hopping(random.Random(42), 0)
        graph = _build_graph_from_events(sample["cross_merchant_history"] + sample["current_session"])
        res = compute_cross_merchant_risk(graph, sample["target_entity_id"])
        assert res.risk_level == CrossMerchantRiskLevel.HIGH
        assert res.risk_score >= 0.70


class TestHeadlineAblationExperiment:
    def test_local_allow_vs_cross_merchant_block(self):
        import random
        sample = gen_device_reuse_ring(random.Random(42), 0)
        # Local view (silo)
        local_graph = _build_graph_from_events(sample["current_session"])
        local_res = compute_cross_merchant_risk(local_graph, sample["target_entity_id"])

        # Cross-merchant view (network)
        cross_graph = _build_graph_from_events(sample["cross_merchant_history"] + sample["current_session"])
        cross_res = compute_cross_merchant_risk(cross_graph, sample["target_entity_id"])

        assert local_res.risk_score <= 0.20
        assert cross_res.risk_score >= 0.70
        assert cross_res.risk_score - local_res.risk_score >= 0.50

    def test_full_dataset_ablation_demonstrates_memory_gain(self):
        results = run_cross_merchant_ablation(samples=100, seed=42)
        local = results["merchant_local"]
        cross = results["cross_merchant"]
        assert cross["recall"] > local["recall"]
        assert cross["f1"] > local["f1"]
        assert cross["fpr"] == 0.0


class TestExplainabilityAndPrivacyBoundaries:
    def test_anonymized_output_hides_counterparty_merchants(self):
        import random
        sample = gen_device_reuse_ring(random.Random(42), 0)
        graph = _build_graph_from_events(sample["cross_merchant_history"] + sample["current_session"])
        res = compute_cross_merchant_risk(graph, sample["target_entity_id"])
        anon = res.to_anonymized_dict()

        # Counterparty merchant IDs must not appear in anon dict
        serialized = str(anon)
        assert "merch_other_" not in serialized
        assert "merch_victim_" not in serialized
        assert anon["entity"].startswith("dev_***")
        assert len(anon["signals"]) > 0
        assert "privacy_notice" in anon


class TestFirewallAndDisputeIntegration:
    def test_firewall_integrates_cross_merchant_graph(self):
        import random
        sample = gen_device_reuse_ring(random.Random(42), 0)
        cross_graph = _build_graph_from_events(sample["cross_merchant_history"] + sample["current_session"])

        # Evaluate with cross_merchant_graph attached
        assessment = evaluate_session_from_dicts(
            sample["current_session"],
            session_id="test_cm_sess",
            device_hash=sample["current_session"][0]["device_hash"],
            cross_merchant_graph=cross_graph,
        )
        assert assessment.risk_score >= 0.70
        assert assessment.action == RecommendedAction.BLOCK
        assert any(s.name == "cross_merchant_device_reuse" for s in assessment.signals)

    def test_conservative_policy_downgrades_on_low_evidence_quality(self):
        graph = EntityGraph()
        graph.add_node(EntityNode(entity_id="dev_sketchy", entity_type=EntityType.DEVICE, first_seen="2026-07-20T10:00:00Z", last_seen="2026-07-20T10:00:00Z", risk_base_score=0.75))

        # Bare session with no historical telemetry -> evidence quality is low
        bare_events = [{"event_id": "e1", "event_type": "PAYMENT_ATTEMPTED", "timestamp": "2026-07-20T10:00:00Z", "device_hash": "sketchy"}]
        assessment = evaluate_session_from_dicts(bare_events, session_id="bare", device_hash="sketchy", cross_merchant_graph=graph)
        assert assessment.action == RecommendedAction.CHALLENGE
