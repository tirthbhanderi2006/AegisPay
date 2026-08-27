"""Deterministic risk scoring engine.

Computes a risk score in [0.0, 1.0] from behavioral features using
weighted component scoring.  Each component function maps features to
a sub-score in [0.0, 1.0].

Weight rationale (documented per ADR-015):
- velocity  0.25 -- Payment velocity is the strongest card-testing signal
- retry     0.20 -- Rapid retries with failures strongly indicate automation
- variation 0.15 -- Multiple payment instruments suggest card enumeration
- infra     0.20 -- Device/IP cycling is strong ATO/bot indicator
- historical 0.10 -- Deviation from baseline amplifies other signals
- sequence  0.10 -- Consistent event timing indicates bots

Same input -> same score.  No randomness.  No LLM.  No ML.
"""

import math
from typing import Dict, List, Tuple

from app.models.firewall import BehavioralFeatures, RiskSignal, SignalSeverity

ENGINE_VERSION = "2.0.0"

# Configurable weights (sum = 1.0)
W_VELOCITY = 0.25
W_RETRY = 0.20
W_VARIATION = 0.15
W_INFRASTRUCTURE = 0.20
W_HISTORICAL = 0.10
W_SEQUENCE = 0.10


def _sigmoid(x: float, midpoint: float, steepness: float = 1.0) -> float:
    """Sigmoid mapping: 0 at low x, 1 at high x, 0.5 at midpoint."""
    try:
        return 1.0 / (1.0 + math.exp(-steepness * (x - midpoint)))
    except OverflowError:
        return 0.0 if x < midpoint else 1.0


def _severity(score: float) -> SignalSeverity:
    if score >= 0.7:
        return SignalSeverity.high
    if score >= 0.4:
        return SignalSeverity.medium
    return SignalSeverity.low


# ---------------------------------------------------------------------------
# Component functions: features -> (score 0-1, signals)
# ---------------------------------------------------------------------------

def velocity_component(f: BehavioralFeatures) -> Tuple[float, List[RiskSignal]]:
    """Score based on payment attempt frequency."""
    signals: List[RiskSignal] = []
    # 5+ attempts in 1 min is suspicious, 10+ is very suspicious
    v1m = _sigmoid(f.payment_attempts_last_1m, midpoint=5, steepness=0.8)
    # 10+ in 5 min
    v5m = _sigmoid(f.payment_attempts_last_5m, midpoint=10, steepness=0.5)
    # High failure rate in recent window
    if f.payment_attempts_last_1m > 0:
        fail_ratio_1m = f.payment_failures_last_1m / f.payment_attempts_last_1m
    else:
        fail_ratio_1m = 0.0
    vfail = _sigmoid(fail_ratio_1m, midpoint=0.5, steepness=6.0)

    score = max(v1m, v5m) * 0.6 + vfail * 0.4
    score = min(score, 1.0)

    if v1m > 0.3:
        signals.append(RiskSignal(
            name="rapid_payment_attempts",
            value=f.payment_attempts_last_1m,
            severity=_severity(v1m),
            description=f"{f.payment_attempts_last_1m} payment attempts in the last 60 seconds",
        ))
    if vfail > 0.3 and f.payment_failures_last_1m > 0:
        signals.append(RiskSignal(
            name="high_failure_ratio",
            value=round(fail_ratio_1m, 2),
            severity=_severity(vfail),
            description=f"{f.payment_failures_last_1m}/{f.payment_attempts_last_1m} failures in 1 min",
        ))
    return round(score, 4), signals


def retry_component(f: BehavioralFeatures) -> Tuple[float, List[RiskSignal]]:
    """Score based on retry behavior."""
    signals: List[RiskSignal] = []
    # Many retries
    retry_score = _sigmoid(f.retry_count, midpoint=3, steepness=1.0)
    # Very short intervals
    interval_score = 0.0
    if f.min_retry_interval_s > 0:
        interval_score = _sigmoid(3.0 / f.min_retry_interval_s, midpoint=1.0, steepness=3.0)
    elif f.retry_count > 0:
        interval_score = 1.0  # zero interval = instant retries
    # Rapid ratio
    rapid_score = _sigmoid(f.rapid_retry_ratio, midpoint=0.5, steepness=6.0)

    score = retry_score * 0.4 + interval_score * 0.3 + rapid_score * 0.3
    score = min(score, 1.0)

    if retry_score > 0.3:
        signals.append(RiskSignal(
            name="excessive_retries",
            value=f.retry_count,
            severity=_severity(retry_score),
            description=f"{f.retry_count} payment retries in session",
        ))
    if f.rapid_retry_ratio > 0.3:
        signals.append(RiskSignal(
            name="rapid_retry_pattern",
            value=round(f.rapid_retry_ratio, 2),
            severity=_severity(rapid_score),
            description=f"{round(f.rapid_retry_ratio * 100)}% of retries under 5 seconds apart",
        ))
    return round(score, 4), signals


def variation_component(f: BehavioralFeatures) -> Tuple[float, List[RiskSignal]]:
    """Score based on payment instrument / amount variation."""
    signals: List[RiskSignal] = []
    # Multiple instruments (3+ is suspicious)
    instr_score = _sigmoid(f.unique_instrument_count, midpoint=3, steepness=1.5)
    # High amount variance
    var_score = _sigmoid(f.amount_variance, midpoint=500, steepness=0.005)
    # Many distinct amounts relative to attempts
    change_score = _sigmoid(f.amount_change_ratio, midpoint=0.7, steepness=6.0)

    score = instr_score * 0.5 + var_score * 0.2 + change_score * 0.3
    score = min(score, 1.0)

    if instr_score > 0.3:
        signals.append(RiskSignal(
            name="multiple_payment_instruments",
            value=f.unique_instrument_count,
            severity=_severity(instr_score),
            description=f"{f.unique_instrument_count} distinct payment instruments used",
        ))
    return round(score, 4), signals


def infrastructure_component(f: BehavioralFeatures) -> Tuple[float, List[RiskSignal]]:
    """Score based on device/IP/account relationships."""
    signals: List[RiskSignal] = []
    # Many accounts on one device (3+ suspicious, device farm/cycling)
    multi_acc = _sigmoid(f.accounts_on_device, midpoint=3, steepness=1.5)
    # Device cycling in session
    dev_change = _sigmoid(f.device_change_count, midpoint=2, steepness=1.5)
    # IP cycling in session
    ip_change = _sigmoid(f.ip_change_count, midpoint=2, steepness=1.5)
    # Many devices on one account
    multi_dev = _sigmoid(f.devices_on_account, midpoint=3, steepness=1.0)

    # Legitimate Shared IP attenuation:
    # If accounts_on_ip >= 3 but payments succeed (0 failure) and devices are distinct per account,
    # it is a corporate/office network or NAT -> zero IP risk.
    # Otherwise, if accounts_on_ip >= 3 with failures/anomalies -> score multiple_accounts_on_ip.
    multi_ip_score = 0.0
    if f.accounts_on_ip >= 3:
        if f.payment_failures_last_5m == 0 and f.failed_to_success_ratio == 0 and f.accounts_on_device <= 1:
            multi_ip_score = 0.0
        else:
            multi_ip_score = _sigmoid(f.accounts_on_ip, midpoint=3, steepness=1.2)

    score = max(multi_acc, dev_change, ip_change, multi_dev, multi_ip_score)
    score = min(score, 1.0)

    if multi_acc > 0.3:
        signals.append(RiskSignal(
            name="multiple_accounts_on_device",
            value=f.accounts_on_device,
            severity=_severity(multi_acc),
            description=f"{f.accounts_on_device} accounts seen on this device",
        ))
    if dev_change > 0.3:
        signals.append(RiskSignal(
            name="device_cycling",
            value=f.device_change_count,
            severity=_severity(dev_change),
            description=f"{f.device_change_count} device changes within session",
        ))
    if ip_change > 0.3:
        signals.append(RiskSignal(
            name="ip_cycling",
            value=f.ip_change_count,
            severity=_severity(ip_change),
            description=f"{f.ip_change_count} IP address changes within session",
        ))
    if multi_ip_score > 0.3:
        signals.append(RiskSignal(
            name="multiple_accounts_on_ip",
            value=f.accounts_on_ip,
            severity=_severity(multi_ip_score),
            description=f"{f.accounts_on_ip} accounts seen on this IP with failure concentration",
        ))
    return round(score, 4), signals


def historical_deviation_component(f: BehavioralFeatures) -> Tuple[float, List[RiskSignal]]:
    """Score based on deviation from historical baseline or longitudinal risk patterns."""
    signals: List[RiskSignal] = []

    if f.historical_txn_count == 0:
        # No history -- cannot compute deviation, return neutral
        return 0.0, signals

    # Current velocity vs historical
    vel_deviation = 0.0
    if f.historical_payment_velocity > 0:
        current_velocity = f.payment_attempts_last_5m / 5.0  # per minute
        current_per_day = current_velocity * 1440
        ratio = current_per_day / f.historical_payment_velocity if f.historical_payment_velocity > 0 else 0
        vel_deviation = _sigmoid(ratio, midpoint=5, steepness=0.5)

    # Failure rate deviation (current vs historical)
    fail_deviation = 0.0
    if f.historical_failure_rate < 0.3 and f.failed_to_success_ratio > 2.0:
        fail_deviation = _sigmoid(f.failed_to_success_ratio, midpoint=3, steepness=1.0)

    # High historical failure pattern (longitudinal card testing / bad actor)
    hist_fail_score = 0.0
    if f.historical_txn_count >= 3 and f.historical_failure_rate >= 0.50:
        hist_fail_score = _sigmoid(f.historical_failure_rate, midpoint=0.5, steepness=6.0)

    # Device count deviation / rotation across history
    dev_deviation = 0.0
    if f.historical_device_count > 0 and f.devices_on_account > f.historical_device_count * 2:
        dev_deviation = _sigmoid(f.devices_on_account / f.historical_device_count, midpoint=2, steepness=1.5)
    elif f.devices_on_account >= 3:
        dev_deviation = _sigmoid(f.devices_on_account, midpoint=3, steepness=1.5)

    score = max(vel_deviation, fail_deviation, hist_fail_score, dev_deviation)
    score = min(score, 1.0)

    if vel_deviation > 0.3:
        signals.append(RiskSignal(
            name="velocity_above_baseline",
            value=round(vel_deviation, 2),
            severity=_severity(vel_deviation),
            description="Current payment velocity significantly exceeds historical baseline",
        ))
    if fail_deviation > 0.3:
        signals.append(RiskSignal(
            name="failure_rate_anomaly",
            value=round(f.failed_to_success_ratio, 2),
            severity=_severity(fail_deviation),
            description=f"Current failure ratio {f.failed_to_success_ratio:.1f}x vs historical {f.historical_failure_rate:.2f}",
        ))
    if hist_fail_score > 0.3:
        signals.append(RiskSignal(
            name="historical_failure_concentration",
            value=round(f.historical_failure_rate, 2),
            severity=_severity(hist_fail_score),
            description=f"Historical failure rate {round(f.historical_failure_rate * 100)}% across {f.historical_txn_count} transactions",
        ))
    if dev_deviation > 0.3:
        signals.append(RiskSignal(
            name="historical_device_rotation",
            value=f.devices_on_account,
            severity=_severity(dev_deviation),
            description=f"{f.devices_on_account} devices associated with account across history",
        ))
    return round(score, 4), signals



def sequence_component(f: BehavioralFeatures) -> Tuple[float, List[RiskSignal]]:
    """Score based on event sequence regularity (bot-like timing)."""
    signals: List[RiskSignal] = []

    # Very low stddev = very consistent timing = bot-like
    # Normal humans have stddev > 2s; bots have < 0.5s
    timing_score = 0.0
    if f.events_per_second > 0.5 and f.session_duration_s > 0:
        if f.event_interval_stddev < 0.1 and f.events_per_second > 1.0:
            timing_score = 0.9
        elif f.event_interval_stddev < 0.5:
            timing_score = _sigmoid(1.0 / max(f.event_interval_stddev, 0.01), midpoint=2, steepness=1.0)

    # Very fast checkout to payment (< 2s is suspicious)
    speed_score = 0.0
    if 0 < f.checkout_to_payment_s < 2.0:
        speed_score = _sigmoid(2.0 / f.checkout_to_payment_s, midpoint=1, steepness=2.0)
    elif f.checkout_to_payment_s == 0 and f.events_per_second > 1:
        speed_score = 0.7

    score = timing_score * 0.6 + speed_score * 0.4
    score = min(score, 1.0)

    if timing_score > 0.3:
        signals.append(RiskSignal(
            name="bot_like_timing",
            value=round(f.event_interval_stddev, 3),
            severity=_severity(timing_score),
            description=f"Event interval stddev {f.event_interval_stddev:.3f}s suggests automated behavior",
        ))
    if speed_score > 0.3:
        signals.append(RiskSignal(
            name="instant_checkout",
            value=round(f.checkout_to_payment_s, 2),
            severity=_severity(speed_score),
            description=f"Checkout to payment in {f.checkout_to_payment_s:.1f}s",
        ))
    return round(score, 4), signals


# ---------------------------------------------------------------------------
# Top-level scorer
# ---------------------------------------------------------------------------

def compute_risk_score(features: BehavioralFeatures) -> Tuple[float, List[RiskSignal], Dict[str, float]]:
    """Compute overall risk score from behavioral features.

    Returns (risk_score, signals, feature_contributions) where risk_score is
    clamped to [0.0, 1.0], and feature_contributions exposes the exact
    mathematical risk contribution of each component.
    """
    v_score, v_signals = velocity_component(features)
    r_score, r_signals = retry_component(features)
    var_score, var_signals = variation_component(features)
    i_score, i_signals = infrastructure_component(features)
    h_score, h_signals = historical_deviation_component(features)
    s_score, s_signals = sequence_component(features)

    raw = (
        W_VELOCITY * v_score
        + W_RETRY * r_score
        + W_VARIATION * var_score
        + W_INFRASTRUCTURE * i_score
        + W_HISTORICAL * h_score
        + W_SEQUENCE * s_score
    )

    # Combination boost: count how many components fire above threshold
    component_scores = [v_score, r_score, var_score, i_score, h_score, s_score]
    firing = sum(1 for c in component_scores if c > 0.4)

    multiplier = 1.0
    if firing >= 4:
        multiplier = 2.5
    elif firing >= 3:
        multiplier = 2.0
    elif firing >= 2:
        multiplier = 1.5

    boosted = raw * multiplier
    risk_score = max(0.0, min(1.0, boosted))

    # Feature contribution breakdown (exact mathematical contribution per component)
    contributions = {
        "velocity": round(min(1.0, W_VELOCITY * v_score * multiplier), 4),
        "retry": round(min(1.0, W_RETRY * r_score * multiplier), 4),
        "variation": round(min(1.0, W_VARIATION * var_score * multiplier), 4),
        "infrastructure": round(min(1.0, W_INFRASTRUCTURE * i_score * multiplier), 4),
        "historical_deviation": round(min(1.0, W_HISTORICAL * h_score * multiplier), 4),
        "sequence": round(min(1.0, W_SEQUENCE * s_score * multiplier), 4),
    }

    # Assign individual contributions to signals
    for s in v_signals:
        s.contribution = round(contributions["velocity"] / max(len(v_signals), 1), 4)
    for s in r_signals:
        s.contribution = round(contributions["retry"] / max(len(r_signals), 1), 4)
    for s in var_signals:
        s.contribution = round(contributions["variation"] / max(len(var_signals), 1), 4)
    for s in i_signals:
        s.contribution = round(contributions["infrastructure"] / max(len(i_signals), 1), 4)
    for s in h_signals:
        s.contribution = round(contributions["historical_deviation"] / max(len(h_signals), 1), 4)
    for s in s_signals:
        s.contribution = round(contributions["sequence"] / max(len(s_signals), 1), 4)

    all_signals = v_signals + r_signals + var_signals + i_signals + h_signals + s_signals

    return round(risk_score, 4), all_signals, contributions


