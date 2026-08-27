"""Statistical drift detection using Population Stability Index (PSI) and Kolmogorov-Smirnov (KS).

Monitors feature distributions, graph behavior, and decision distributions offline without runtime ML inference.
"""

import math
from typing import Any, Dict, List, Optional, Tuple


def compute_psi(
    baseline: List[float],
    current: List[float],
    num_bins: int = 10,
    epsilon: float = 1e-4,
) -> float:
    """Calculate Population Stability Index (PSI) between baseline and current distributions."""
    if not baseline or not current:
        return 0.0

    # Determine bin edges from combined data
    combined = baseline + current
    min_val = min(combined)
    max_val = max(combined)
    if min_val == max_val:
        return 0.0

    bin_width = (max_val - min_val) / num_bins
    bin_edges = [min_val + i * bin_width for i in range(num_bins + 1)]

    def _get_counts(data: List[float]) -> List[float]:
        counts = [0] * num_bins
        for val in data:
            for b in range(num_bins):
                if (b == num_bins - 1 and bin_edges[b] <= val <= bin_edges[b + 1]) or (bin_edges[b] <= val < bin_edges[b + 1]):
                    counts[b] += 1
                    break
        total = len(data)
        # Normalize with epsilon smoothing
        return [(c / total) + epsilon for c in counts]

    b_probs = _get_counts(baseline)
    c_probs = _get_counts(current)

    psi = 0.0
    for b_p, c_p in zip(b_probs, c_probs):
        psi += (c_p - b_p) * math.log(c_p / b_p)

    return round(max(0.0, psi), 4)


def compute_ks_statistic(sample1: List[float], sample2: List[float]) -> float:
    """Compute 2-sample Kolmogorov-Smirnov (KS) statistic measuring maximum divergence."""
    if not sample1 or not sample2:
        return 0.0

    s1 = sorted(sample1)
    s2 = sorted(sample2)
    n1 = len(s1)
    n2 = len(s2)

    all_values = sorted(set(s1 + s2))
    max_d = 0.0

    i1 = 0
    i2 = 0
    for v in all_values:
        while i1 < n1 and s1[i1] <= v:
            i1 += 1
        while i2 < n2 and s2[i2] <= v:
            i2 += 1
        cdf1 = i1 / n1
        cdf2 = i2 / n2
        d = abs(cdf1 - cdf2)
        if d > max_d:
            max_d = d

    return round(max_d, 4)


def analyze_drift(
    baseline_records: List[Dict[str, Any]],
    current_records: List[Dict[str, Any]],
    feature_keys: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """Perform multi-dimensional statistical drift analysis on features and decisions."""
    if feature_keys is None:
        feature_keys = [
            "velocity_score",
            "retry_frequency_score",
            "infrastructure_risk_score",
            "variation_anomaly_score",
            "historical_failure_rate",
        ]

    feature_drifts: Dict[str, Dict[str, float]] = {}
    for k in feature_keys:
        b_vals = [float(r.get(k, 0.0)) for r in baseline_records if k in r]
        c_vals = [float(r.get(k, 0.0)) for r in current_records if k in r]
        if b_vals and c_vals:
            psi = compute_psi(b_vals, c_vals)
            ks = compute_ks_statistic(b_vals, c_vals)
            feature_drifts[k] = {"psi": psi, "ks_statistic": ks}

    # Decision distribution drift
    b_scores = [float(r.get("risk_score", r.get("final_score", 0.0))) for r in baseline_records]
    c_scores = [float(r.get("risk_score", r.get("final_score", 0.0))) for r in current_records]
    score_psi = compute_psi(b_scores, c_scores) if b_scores and c_scores else 0.0

    return {
        "feature_drift": feature_drifts,
        "score_drift_psi": score_psi,
        "baseline_sample_size": len(baseline_records),
        "current_sample_size": len(current_records),
    }
