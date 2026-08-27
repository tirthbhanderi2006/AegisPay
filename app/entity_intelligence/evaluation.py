"""Phase 3 — Evaluation and Headline Ablation Framework.

Runs the central experiment:
  Merchant-Local Engine vs Cross-Merchant Engine
Demonstrating how cross-merchant entity links expose multi-merchant attack
patterns while keeping false positives at 0% on shared infrastructure.
"""

import statistics
import time
from collections import defaultdict
from typing import Any, Dict, List, Optional, Tuple

from app.entity_intelligence.entities import EntityNode, EntityType, make_entity_id
from app.entity_intelligence.graph import EntityGraph
from app.entity_intelligence.relationships import EntityEdge, RelationshipType, make_edge_id
from app.entity_intelligence.risk import CrossMerchantRiskAssessment, compute_cross_merchant_risk
from app.entity_intelligence.synthetic import _evt, generate_cross_merchant_dataset
from app.models.firewall import RecommendedAction


def _build_graph_from_events(events: List[Dict[str, Any]]) -> EntityGraph:
    """Build an in-memory graph from a list of raw event dictionaries."""
    graph = EntityGraph()
    for ev in events:
        ts = ev.get("timestamp", "2026-07-20T10:00:00Z")
        etype = ev.get("event_type", "")
        merch_raw = ev.get("merchant_id") or ev.get("metadata", {}).get("merchant_id")
        acc_raw = ev.get("account_id") or ev.get("metadata", {}).get("account_id")
        dev_raw = ev.get("device_hash") or ev.get("metadata", {}).get("device_hash")
        ip_raw = ev.get("ip_address") or ev.get("metadata", {}).get("ip_address")

        is_success = "SUCCESS" in etype or etype == "PAYMENT_SUCCEEDED"
        is_failure = "FAIL" in etype or etype == "PAYMENT_FAILED" or "DECLINE" in etype
        succ = 1 if is_success else 0
        fail = 1 if is_failure else 0

        m_id = make_entity_id(EntityType.MERCHANT, merch_raw) if merch_raw else None
        a_id = make_entity_id(EntityType.ACCOUNT, acc_raw) if acc_raw else None
        d_id = make_entity_id(EntityType.DEVICE, dev_raw) if dev_raw else None
        i_id = make_entity_id(EntityType.IP, ip_raw) if ip_raw else None

        if m_id:
            graph.add_node(EntityNode(entity_id=m_id, entity_type=EntityType.MERCHANT, first_seen=ts, last_seen=ts))
        if a_id:
            graph.add_node(EntityNode(entity_id=a_id, entity_type=EntityType.ACCOUNT, first_seen=ts, last_seen=ts))
        if d_id:
            graph.add_node(EntityNode(entity_id=d_id, entity_type=EntityType.DEVICE, first_seen=ts, last_seen=ts, risk_base_score=0.8 if is_failure else 0.0))
        if i_id:
            graph.add_node(EntityNode(entity_id=i_id, entity_type=EntityType.IP, first_seen=ts, last_seen=ts, risk_base_score=0.7 if is_failure else 0.0))

        if a_id and d_id:
            e_id = make_edge_id(a_id, d_id, RelationshipType.USES_DEVICE)
            graph.add_edge(EntityEdge(edge_id=e_id, source_id=a_id, target_id=d_id, relationship_type=RelationshipType.USES_DEVICE, first_seen=ts, last_seen=ts, success_count=succ, failure_count=fail))

        if a_id and i_id:
            e_id = make_edge_id(a_id, i_id, RelationshipType.USES_IP)
            graph.add_edge(EntityEdge(edge_id=e_id, source_id=a_id, target_id=i_id, relationship_type=RelationshipType.USES_IP, first_seen=ts, last_seen=ts, success_count=succ, failure_count=fail))

        if d_id and m_id:
            e_id = make_edge_id(d_id, m_id, RelationshipType.SEEN_ON_MERCHANT)
            graph.add_edge(EntityEdge(edge_id=e_id, source_id=d_id, target_id=m_id, relationship_type=RelationshipType.SEEN_ON_MERCHANT, first_seen=ts, last_seen=ts, success_count=succ, failure_count=fail))

        if i_id and m_id:
            e_id = make_edge_id(i_id, m_id, RelationshipType.SEEN_ON_MERCHANT)
            graph.add_edge(EntityEdge(edge_id=e_id, source_id=i_id, target_id=m_id, relationship_type=RelationshipType.SEEN_ON_MERCHANT, first_seen=ts, last_seen=ts, success_count=succ, failure_count=fail))

        if a_id and m_id:
            e_id = make_edge_id(a_id, m_id, RelationshipType.TRANSACTED_WITH_MERCHANT)
            graph.add_edge(EntityEdge(edge_id=e_id, source_id=a_id, target_id=m_id, relationship_type=RelationshipType.TRANSACTED_WITH_MERCHANT, first_seen=ts, last_seen=ts, success_count=succ, failure_count=fail))

    return graph


def run_cross_merchant_ablation(
    samples: int = 500,
    seed: int = 42,
) -> Dict[str, Any]:
    """Execute the Headline Local vs Cross-Merchant Ablation Experiment."""
    dataset = generate_cross_merchant_dataset(total_samples=samples, seed=seed)

    modes = ["merchant_local", "cross_merchant"]
    results: Dict[str, Any] = {}
    scenario_stats: Dict[str, Dict[str, Any]] = defaultdict(lambda: {
        "local_risks": [],
        "cross_risks": [],
        "local_actions": [],
        "cross_actions": [],
        "expected_cross_action": None,
    })

    for mode in modes:
        tp = fp = tn = fn = 0
        latencies: List[float] = []

        for item in dataset:
            target_entity = item["target_entity_id"]
            curr_events = item["current_session"]
            hist_events = item["cross_merchant_history"]
            exp_action = item["expected_cross_action"]
            label = item["label"]

            # In merchant_local mode, only the target merchant's session is known
            # In cross_merchant mode, global historical events are available in the graph
            all_events = curr_events if mode == "merchant_local" else (hist_events + curr_events)

            t0 = time.perf_counter()
            graph = _build_graph_from_events(all_events)
            assessment = compute_cross_merchant_risk(graph, target_entity)
            t1 = time.perf_counter()
            latencies.append((t1 - t0) * 1000)

            is_attack = exp_action in (RecommendedAction.CHALLENGE, RecommendedAction.BLOCK)
            flagged = assessment.risk_score >= 0.30

            if is_attack and flagged:
                tp += 1
            elif not is_attack and flagged:
                fp += 1
            elif not is_attack and not flagged:
                tn += 1
            else:
                fn += 1

            if mode == "merchant_local":
                scenario_stats[label]["local_risks"].append(assessment.risk_score)
                scenario_stats[label]["local_actions"].append(assessment.risk_level.value)
            else:
                scenario_stats[label]["cross_risks"].append(assessment.risk_score)
                scenario_stats[label]["cross_actions"].append(assessment.risk_level.value)
                scenario_stats[label]["expected_cross_action"] = exp_action.value

        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
        fpr = fp / (fp + tn) if (fp + tn) > 0 else 0.0

        latencies.sort()
        p50 = statistics.median(latencies)
        p95 = latencies[int(len(latencies) * 0.95)]
        p99 = latencies[int(len(latencies) * 0.99)]

        results[mode] = {
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1": round(f1, 4),
            "detection_rate": round(recall, 4),
            "fpr": round(fpr, 4),
            "tp": tp,
            "fp": fp,
            "tn": tn,
            "fn": fn,
            "latency_p50_ms": round(p50, 3),
            "latency_p95_ms": round(p95, 3),
            "latency_p99_ms": round(p99, 3),
        }

    # Per-scenario deltas
    scenario_comparisons: Dict[str, Any] = {}
    for sc, data in scenario_stats.items():
        avg_local = statistics.mean(data["local_risks"]) if data["local_risks"] else 0.0
        avg_cross = statistics.mean(data["cross_risks"]) if data["cross_risks"] else 0.0
        scenario_comparisons[sc] = {
            "local_avg_risk": round(avg_local, 4),
            "cross_avg_risk": round(avg_cross, 4),
            "risk_delta": round(avg_cross - avg_local, 4),
            "expected_cross_action": data["expected_cross_action"],
        }

    results["scenario_comparison"] = scenario_comparisons
    results["delta"] = {
        "precision": round(results["cross_merchant"]["precision"] - results["merchant_local"]["precision"], 4),
        "recall": round(results["cross_merchant"]["recall"] - results["merchant_local"]["recall"], 4),
        "f1": round(results["cross_merchant"]["f1"] - results["merchant_local"]["f1"], 4),
        "fpr": round(results["cross_merchant"]["fpr"] - results["merchant_local"]["fpr"], 4),
    }

    return results


def run_temporal_integrity_validation() -> Dict[str, Any]:
    """Prove that events timestamped T > as_of produce zero hindsight leakage."""
    graph = EntityGraph()
    dev_id = "dev_temporal_test_001"
    merch_1 = "merch_alpha"
    merch_2 = "merch_beta"
    acc_1 = "acc_victim_001"
    acc_2 = "acc_victim_002"

    t0_str = "2026-07-01T10:00:00Z"
    t1_future_str = "2026-07-10T10:00:00Z"

    # Event 1 at T0: benign transaction
    ev_t0 = _evt("e_t0_1", "PAYMENT_SUCCEEDED", t0_str, merch_1, dev_id, "1.1.1.1", acc_1)
    # Event 2 at T1 (FUTURE): massive fraud attack
    ev_t1_future = _evt("e_t1_2", "PAYMENT_FAILED", t1_future_str, merch_2, dev_id, "2.2.2.2", acc_2)

    # Ingest both events into the persistent graph
    full_graph = _build_graph_from_events([ev_t0, ev_t1_future])

    # Evaluate risk at T0 (as_of = t0_str)
    risk_at_t0 = compute_cross_merchant_risk(full_graph, dev_id, as_of=t0_str)
    # Evaluate risk at T1 (as_of = None or t1_future_str)
    risk_at_t1 = compute_cross_merchant_risk(full_graph, dev_id, as_of=t1_future_str)

    leakage_detected = (risk_at_t0.risk_score != 0.0) or (risk_at_t0.merchants_observed > 1)

    return {
        "as_of_t0": t0_str,
        "as_of_t1": t1_future_str,
        "risk_score_at_t0": risk_at_t0.risk_score,
        "merchants_observed_at_t0": risk_at_t0.merchants_observed,
        "risk_score_at_t1": risk_at_t1.risk_score,
        "merchants_observed_at_t1": risk_at_t1.merchants_observed,
        "hindsight_leakage_detected": leakage_detected,
        "is_temporal_integrity_preserved": not leakage_detected,
    }
