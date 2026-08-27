"""Statistical evaluation metrics for Phase 4 risk calibration.

Computes Brier Score, Expected Calibration Error (ECE), ROC-AUC, PR-AUC,
Precision, Recall, F1, and confusion matrix deterministically without external heavy ML dependencies.
"""

import math
from typing import Any, Dict, List, Tuple
from app.calibration.models import CalibrationMetrics, ThresholdConfig
from app.models.firewall import RecommendedAction


def compute_brier_score(probabilities: List[float], labels: List[int]) -> float:
    """Mean squared difference between predicted probability and actual binary label."""
    if not probabilities or len(probabilities) != len(labels):
        return 0.0
    n = len(probabilities)
    return round(sum((p - y) ** 2 for p, y in zip(probabilities, labels)) / n, 6)


def compute_expected_calibration_error(
    probabilities: List[float],
    labels: List[int],
    num_bins: int = 10,
) -> float:
    """Compute Expected Calibration Error (ECE) across M equally spaced probability bins."""
    if not probabilities or len(probabilities) != len(labels):
        return 0.0
    n = len(probabilities)
    bin_size = 1.0 / num_bins
    ece = 0.0

    for b in range(num_bins):
        bin_lower = b * bin_size
        bin_upper = (b + 1) * bin_size
        indices = [
            i for i, p in enumerate(probabilities)
            if (bin_lower <= p < bin_upper) or (b == num_bins - 1 and p == 1.0)
        ]
        if not indices:
            continue
        bin_count = len(indices)
        avg_confidence = sum(probabilities[i] for i in indices) / bin_count
        avg_accuracy = sum(labels[i] for i in indices) / bin_count
        ece += (bin_count / n) * abs(avg_accuracy - avg_confidence)

    return round(ece, 6)


def compute_roc_auc(probabilities: List[float], labels: List[int]) -> float:
    """Compute Area Under ROC Curve via deterministic rank-sum integration."""
    if not probabilities or len(probabilities) != len(labels):
        return 0.5
    pos_count = sum(labels)
    neg_count = len(labels) - pos_count
    if pos_count == 0 or neg_count == 0:
        return 1.0 if pos_count == 0 else 0.5

    paired = sorted(zip(probabilities, labels), key=lambda x: x[0], reverse=True)
    tp = 0
    auc = 0.0

    for _, y in paired:
        if y == 1:
            tp += 1
        else:
            auc += tp

    return round(auc / (pos_count * neg_count), 4)



def compute_pr_auc(probabilities: List[float], labels: List[int]) -> float:
    """Compute Area Under Precision-Recall Curve."""
    if not probabilities or sum(labels) == 0:
        return 0.0
    paired = sorted(zip(probabilities, labels), key=lambda x: x[0], reverse=True)
    pos_count = sum(labels)

    tp = 0
    fp = 0
    recalls = [0.0]
    precisions = [1.0]

    for _, y in paired:
        if y == 1:
            tp += 1
        else:
            fp += 1
        r = tp / pos_count
        p = tp / (tp + fp) if (tp + fp) > 0 else 1.0
        recalls.append(r)
        precisions.append(p)

    # Trapezoid integration
    auc = 0.0
    for i in range(1, len(recalls)):
        auc += (recalls[i] - recalls[i - 1]) * (precisions[i] + precisions[i - 1]) / 2.0

    return round(min(1.0, max(0.0, auc)), 4)


def evaluate_predictions(
    probabilities: List[float],
    labels: List[int],
    thresholds: ThresholdConfig,
) -> CalibrationMetrics:
    """Evaluate predictions against ground-truth labels and compute all metrics."""
    if not probabilities:
        return CalibrationMetrics(
            sample_count=0, precision=0.0, recall=0.0, f1=0.0,
            fpr=0.0, fnr=0.0, roc_auc=0.5, pr_auc=0.0,
            brier_score=0.0, expected_calibration_error=0.0,
        )

    tp = fp = tn = fn = 0
    decisions = {"ALLOW": 0, "CHALLENGE": 0, "BLOCK": 0}

    for p, y in zip(probabilities, labels):
        # Decision mapping using thresholds
        if p < thresholds.low_threshold:
            action = "ALLOW"
            pred_positive = 0
        elif p < thresholds.high_threshold:
            action = "CHALLENGE"
            pred_positive = 1
        else:
            action = "BLOCK"
            pred_positive = 1

        decisions[action] += 1

        if pred_positive == 1 and y == 1:
            tp += 1
        elif pred_positive == 1 and y == 0:
            fp += 1
        elif pred_positive == 0 and y == 0:
            tn += 1
        elif pred_positive == 0 and y == 1:
            fn += 1

    precision = round(tp / (tp + fp), 4) if (tp + fp) > 0 else (1.0 if fp == 0 else 0.0)
    recall = round(tp / (tp + fn), 4) if (tp + fn) > 0 else (1.0 if fn == 0 else 0.0)
    f1 = round(2 * precision * recall / (precision + recall), 4) if (precision + recall) > 0 else 0.0
    fpr = round(fp / (fp + tn), 4) if (fp + tn) > 0 else 0.0
    fnr = round(fn / (fn + tp), 4) if (fn + tp) > 0 else 0.0

    roc_auc = compute_roc_auc(probabilities, labels)
    pr_auc = compute_pr_auc(probabilities, labels)
    brier = compute_brier_score(probabilities, labels)
    ece = compute_expected_calibration_error(probabilities, labels)

    return CalibrationMetrics(
        sample_count=len(probabilities),
        precision=precision,
        recall=recall,
        f1=f1,
        fpr=fpr,
        fnr=fnr,
        roc_auc=roc_auc,
        pr_auc=pr_auc,
        brier_score=brier,
        expected_calibration_error=ece,
        confusion_matrix={"tp": tp, "fp": fp, "tn": tn, "fn": fn},
        decision_distribution=decisions,
    )
