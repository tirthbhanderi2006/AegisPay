"""Evaluation framework for the Behavioral Intent Firewall.

Runs the engine against synthetic ground-truth data and computes:
  - per-scenario precision, recall, F1
  - confusion matrix (predicted vs actual)
  - overall detection rate, false-positive rate
  - ablation: session-only vs lifecycle-aware
  - latency P50 / P95 / P99
"""

import statistics
import time
from collections import Counter, defaultdict
from typing import Any, Dict, List, Optional, Tuple

from app.firewall.engine import evaluate_session_from_dicts
from app.models.firewall import IntentClass, RecommendedAction
from app.synthetic.generator import (
    ACTION_ALLOW,
    ACTION_CHALLENGE,
    ACTION_BLOCK,
    LABEL_AUTOMATED_CHECKOUT,
    LABEL_CARD_TESTING,
    LABEL_DISTRIBUTED,
    LABEL_LEGIT_RETRY,
    LABEL_LOW_AND_SLOW,
    LABEL_ACCOUNT_TAKEOVER,
    LABEL_NORMAL,
    LABEL_SHARED_DEVICE,
    LABEL_SHARED_IP,
    LABEL_LONGITUDINAL_DEVICE_CYCLING,
    LABEL_LONGITUDINAL_IP_CYCLING,
    LABEL_LONGITUDINAL_LOW_AND_SLOW,
    LABEL_LONGITUDINAL_DEVICE_ROTATION,
    LABEL_LONGITUDINAL_FAILURE_PATTERN,
    generate_dataset,
)

# Map ground-truth labels to expected IntentClass
_LABEL_TO_INTENT = {
    LABEL_NORMAL: IntentClass.NORMAL,
    LABEL_CARD_TESTING: IntentClass.CARD_TESTING,
    LABEL_LOW_AND_SLOW: IntentClass.SUSPICIOUS_VELOCITY,
    LABEL_ACCOUNT_TAKEOVER: IntentClass.ACCOUNT_TAKEOVER_LIKE,
    LABEL_AUTOMATED_CHECKOUT: IntentClass.AUTOMATED_CHECKOUT,
    LABEL_SHARED_DEVICE: IntentClass.NORMAL,
    LABEL_SHARED_IP: IntentClass.NORMAL,
    LABEL_LEGIT_RETRY: IntentClass.NORMAL,
    LABEL_DISTRIBUTED: IntentClass.CARD_TESTING,
    # Phase 2.1 — Longitudinal scenarios
    LABEL_LONGITUDINAL_DEVICE_CYCLING: IntentClass.CARD_TESTING,
    LABEL_LONGITUDINAL_IP_CYCLING: IntentClass.SUSPICIOUS_VELOCITY,
    LABEL_LONGITUDINAL_LOW_AND_SLOW: IntentClass.CARD_TESTING,
    LABEL_LONGITUDINAL_DEVICE_ROTATION: IntentClass.ACCOUNT_TAKEOVER_LIKE,
    LABEL_LONGITUDINAL_FAILURE_PATTERN: IntentClass.CARD_TESTING,
}

# Is this label "malicious" for binary detection metric?
_MALICIOUS = {
    LABEL_CARD_TESTING, LABEL_LOW_AND_SLOW, LABEL_ACCOUNT_TAKEOVER,
    LABEL_AUTOMATED_CHECKOUT, LABEL_DISTRIBUTED,
    LABEL_LONGITUDINAL_DEVICE_CYCLING, LABEL_LONGITUDINAL_IP_CYCLING,
    LABEL_LONGITUDINAL_LOW_AND_SLOW, LABEL_LONGITUDINAL_DEVICE_ROTATION,
    LABEL_LONGITUDINAL_FAILURE_PATTERN,
}



def _is_malicious_intent(intent: IntentClass) -> bool:
    return intent not in (IntentClass.NORMAL, IntentClass.UNKNOWN)


def _precision_recall_f1(tp: int, fp: int, fn: int) -> Tuple[float, float, float]:
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0
    return round(precision, 4), round(recall, 4), round(f1, 4)


def run_evaluation(
    sessions: int = 100,
    seed: int = 42,
    lifecycle_aware: bool = True,
) -> Dict[str, Any]:
    """Run evaluation on synthetic data.

    Returns structured results with per-scenario metrics,
    confusion matrix, latency, and overall metrics.
    """
    dataset = generate_dataset(sessions=sessions, seed=seed)

    results: List[Dict[str, Any]] = []
    latencies: List[float] = []

    for sample in dataset:
        history = sample["historical_events"] if lifecycle_aware else None
        start = time.perf_counter()
        assessment = evaluate_session_from_dicts(
            session_events=sample["events"],
            session_id=sample["session_id"],
            historical_events=history,
        )
        elapsed_ms = (time.perf_counter() - start) * 1000.0
        latencies.append(elapsed_ms)

        results.append({
            "scenario": sample["scenario"],
            "label": sample["label"],
            "expected_action": sample["expected_action"],
            "predicted_intent": assessment.intent.value,
            "predicted_action": assessment.action.value,
            "risk_score": assessment.risk_score,
            "signals_count": len(assessment.signals),
        })

    # --- Confusion matrix ---
    all_intents = sorted(set(r["predicted_intent"] for r in results) | set(i.value for i in IntentClass))
    confusion: Dict[str, Dict[str, int]] = defaultdict(lambda: defaultdict(int))
    for r in results:
        expected_intent = _LABEL_TO_INTENT.get(r["label"], IntentClass.NORMAL).value
        confusion[expected_intent][r["predicted_intent"]] += 1

    # --- Per-scenario metrics ---
    scenario_metrics: Dict[str, Dict[str, Any]] = {}
    labels_seen = sorted(set(r["label"] for r in results))

    for label in labels_seen:
        label_results = [r for r in results if r["label"] == label]
        is_malicious_label = label in _MALICIOUS
        expected_intent = _LABEL_TO_INTENT.get(label, IntentClass.NORMAL).value

        tp = fp = fn = tn = 0
        for r in results:
            predicted_malicious = _is_malicious_intent(IntentClass(r["predicted_intent"]))
            actual_is_this = r["label"] == label

            if actual_is_this and r["label"] in _MALICIOUS:
                if predicted_malicious:
                    tp += 1
                else:
                    fn += 1
            elif not actual_is_this and r["label"] not in _MALICIOUS:
                if not predicted_malicious:
                    tn += 1
                else:
                    fp += 1

        # Intent-level accuracy for this scenario
        intent_correct = sum(
            1 for r in label_results
            if r["predicted_intent"] == expected_intent
        )
        intent_accuracy = intent_correct / len(label_results) if label_results else 0.0

        # Action accuracy
        action_correct = sum(
            1 for r in label_results
            if r["predicted_action"] == r["expected_action"]
        )
        action_accuracy = action_correct / len(label_results) if label_results else 0.0

        scenario_metrics[label] = {
            "count": len(label_results),
            "intent_accuracy": round(intent_accuracy, 4),
            "action_accuracy": round(action_accuracy, 4),
            "avg_risk_score": round(sum(r["risk_score"] for r in label_results) / len(label_results), 4) if label_results else 0,
        }

    # --- Overall binary detection metrics ---
    total_tp = total_fp = total_fn = total_tn = 0
    for r in results:
        actual_malicious = r["label"] in _MALICIOUS
        predicted_malicious = _is_malicious_intent(IntentClass(r["predicted_intent"]))
        if actual_malicious and predicted_malicious:
            total_tp += 1
        elif actual_malicious and not predicted_malicious:
            total_fn += 1
        elif not actual_malicious and predicted_malicious:
            total_fp += 1
        else:
            total_tn += 1

    precision, recall, f1 = _precision_recall_f1(total_tp, total_fp, total_fn)
    detection_rate = recall
    false_positive_rate = total_fp / (total_fp + total_tn) if (total_fp + total_tn) > 0 else 0.0

    # --- Latency ---
    sorted_latencies = sorted(latencies)
    p50 = sorted_latencies[len(sorted_latencies) // 2] if sorted_latencies else 0
    p95_idx = int(len(sorted_latencies) * 0.95)
    p99_idx = int(len(sorted_latencies) * 0.99)
    p95 = sorted_latencies[min(p95_idx, len(sorted_latencies) - 1)] if sorted_latencies else 0
    p99 = sorted_latencies[min(p99_idx, len(sorted_latencies) - 1)] if sorted_latencies else 0

    return {
        "mode": "lifecycle_aware" if lifecycle_aware else "session_only",
        "sessions": len(results),
        "seed": seed,
        "overall": {
            "precision": precision,
            "recall": recall,
            "f1": f1,
            "detection_rate": round(detection_rate, 4),
            "false_positive_rate": round(false_positive_rate, 4),
            "true_positives": total_tp,
            "false_positives": total_fp,
            "true_negatives": total_tn,
            "false_negatives": total_fn,
        },
        "per_scenario": scenario_metrics,
        "confusion_matrix": {k: dict(v) for k, v in confusion.items()},
        "latency": {
            "p50_ms": round(p50, 3),
            "p95_ms": round(p95, 3),
            "p99_ms": round(p99, 3),
            "mean_ms": round(statistics.mean(latencies), 3) if latencies else 0,
        },
    }


def run_ablation(sessions: int = 100, seed: int = 42) -> Dict[str, Any]:
    """Run session-only vs lifecycle-aware comparison."""
    session_only = run_evaluation(sessions=sessions, seed=seed, lifecycle_aware=False)
    lifecycle_aware = run_evaluation(sessions=sessions, seed=seed, lifecycle_aware=True)

    # Per-scenario delta comparison
    scenario_comparison: Dict[str, Dict[str, Any]] = {}
    all_scenarios = sorted(set(session_only["per_scenario"].keys()) | set(lifecycle_aware["per_scenario"].keys()))
    for sc in all_scenarios:
        s_res = session_only["per_scenario"].get(sc, {})
        l_res = lifecycle_aware["per_scenario"].get(sc, {})
        scenario_comparison[sc] = {
            "session_only_risk": s_res.get("avg_risk_score", 0.0),
            "lifecycle_aware_risk": l_res.get("avg_risk_score", 0.0),
            "risk_delta": round(l_res.get("avg_risk_score", 0.0) - s_res.get("avg_risk_score", 0.0), 4),
            "session_only_action_acc": s_res.get("action_accuracy", 0.0),
            "lifecycle_aware_action_acc": l_res.get("action_accuracy", 0.0),
            "action_acc_delta": round(l_res.get("action_accuracy", 0.0) - s_res.get("action_accuracy", 0.0), 4),
        }

    return {
        "session_only": session_only,
        "lifecycle_aware": lifecycle_aware,
        "comparison": {
            "precision_delta": round(
                lifecycle_aware["overall"]["precision"] - session_only["overall"]["precision"], 4
            ),
            "recall_delta": round(
                lifecycle_aware["overall"]["recall"] - session_only["overall"]["recall"], 4
            ),
            "f1_delta": round(
                lifecycle_aware["overall"]["f1"] - session_only["overall"]["f1"], 4
            ),
            "fpr_delta": round(
                lifecycle_aware["overall"]["false_positive_rate"] - session_only["overall"]["false_positive_rate"], 4
            ),
        },
        "scenario_comparison": scenario_comparison,
    }


def run_card_testing_breakdown(sessions: int = 180, seed: int = 42) -> Dict[str, Any]:
    """Breakdown of CARD_TESTING A-E variants for in-depth investigation."""
    dataset = generate_dataset(sessions=sessions, seed=seed)
    ct_variants = ["CARD_TESTING_A", "CARD_TESTING_B", "CARD_TESTING_C", "CARD_TESTING_D", "CARD_TESTING_E"]
    breakdown: Dict[str, Dict[str, Any]] = {}

    for var in ct_variants:
        samples = [s for s in dataset if s["scenario"] == var]
        if not samples:
            continue
        risks: List[float] = []
        actions: Counter = Counter()

        for s in samples:
            assessment = evaluate_session_from_dicts(
                session_events=s["events"],
                session_id=s["session_id"],
                historical_events=s["historical_events"],
            )
            risks.append(assessment.risk_score)
            actions[assessment.action.value] += 1

        n = len(samples)
        breakdown[var] = {
            "samples": n,
            "avg_risk": round(statistics.mean(risks), 4) if risks else 0.0,
            "min_risk": round(min(risks), 4) if risks else 0.0,
            "max_risk": round(max(risks), 4) if risks else 0.0,
            "allow_pct": round((actions.get("ALLOW", 0) / n) * 100, 1),
            "challenge_pct": round((actions.get("CHALLENGE", 0) / n) * 100, 1),
            "block_pct": round((actions.get("BLOCK", 0) / n) * 100, 1),
        }

    return breakdown


def run_threshold_sensitivity(
    sessions: int = 180,
    seed: int = 42,
    low_thresholds: Optional[List[float]] = None,
    high_thresholds: Optional[List[float]] = None,
) -> Dict[str, Any]:
    """Run a grid sensitivity analysis across multiple (LOW, HIGH) threshold pairs."""
    dataset = generate_dataset(sessions=sessions, seed=seed)
    low_grid = low_thresholds or [0.20, 0.25, 0.30, 0.35, 0.40]
    high_grid = high_thresholds or [0.60, 0.65, 0.70, 0.75, 0.80]

    # Pre-evaluate all samples to get raw risk scores
    evaluations: List[Tuple[float, str, bool]] = []
    for s in dataset:
        assessment = evaluate_session_from_dicts(
            session_events=s["events"],
            session_id=s["session_id"],
            historical_events=s["historical_events"],
        )
        is_mal = s["label"] in _MALICIOUS
        evaluations.append((assessment.risk_score, s["label"], is_mal))

    grid_results: List[Dict[str, Any]] = []

    for low in low_grid:
        for high in high_grid:
            if low >= high:
                continue

            allow_cnt = 0
            challenge_cnt = 0
            block_cnt = 0
            tp = fp = fn = tn = 0

            for score, label, is_mal in evaluations:
                if score >= high:
                    act = "BLOCK"
                    block_cnt += 1
                elif score >= low:
                    act = "CHALLENGE"
                    challenge_cnt += 1
                else:
                    act = "ALLOW"
                    allow_cnt += 1

                pred_mal = act in ("CHALLENGE", "BLOCK")
                if is_mal and pred_mal:
                    tp += 1
                elif is_mal and not pred_mal:
                    fn += 1
                elif not is_mal and pred_mal:
                    fp += 1
                else:
                    tn += 1

            p, r, f1 = _precision_recall_f1(tp, fp, fn)
            fpr = fp / (fp + tn) if (fp + tn) > 0 else 0.0
            n = len(evaluations)

            grid_results.append({
                "low_threshold": low,
                "high_threshold": high,
                "precision": p,
                "recall": r,
                "f1": f1,
                "fpr": round(fpr, 4),
                "block_pct": round((block_cnt / n) * 100, 1),
                "challenge_pct": round((challenge_cnt / n) * 100, 1),
                "allow_pct": round((allow_cnt / n) * 100, 1),
            })

    return {"grid": grid_results, "total_samples": len(evaluations)}

