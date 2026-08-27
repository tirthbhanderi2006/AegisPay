"""Deterministic intent classification rules.

Maps feature combinations to IntentClass.  Each intent requires MULTIPLE
conditions to fire -- never a single threshold.

These are behavioral hypotheses, NOT proof of malicious activity.
"""

from typing import List, Tuple

from app.models.firewall import BehavioralFeatures, IntentClass


def _check_card_testing(f: BehavioralFeatures) -> Tuple[bool, List[str]]:
    """CARD_TESTING: high velocity + high failure + short retries + multiple instruments (session or longitudinal)."""
    reasons: List[str] = []
    conditions_met = 0

    if f.payment_attempts_last_5m >= 5:
        conditions_met += 1
        reasons.append(f"{f.payment_attempts_last_5m} payment attempts in 5 min")
    if f.payment_failures_last_5m >= 3:
        conditions_met += 1
        reasons.append(f"{f.payment_failures_last_5m} failures in 5 min")
    if f.retry_count >= 2 and f.avg_retry_interval_s < 10:
        conditions_met += 1
        reasons.append(f"{f.retry_count} retries with avg interval {f.avg_retry_interval_s:.1f}s")
    if f.unique_instrument_count >= 3:
        conditions_met += 1
        reasons.append(f"{f.unique_instrument_count} distinct payment instruments")
    if f.failed_to_success_ratio >= 3.0:
        conditions_met += 1
        reasons.append(f"Failure-to-success ratio {f.failed_to_success_ratio:.1f}")

    # Longitudinal card testing detection (accumulated failures across multiple sessions)
    if f.historical_txn_count >= 3 and f.historical_failure_rate >= 0.70:
        conditions_met += 2
        reasons.append(f"Longitudinal failure concentration: {round(f.historical_failure_rate * 100)}% failures across {f.historical_txn_count} historical transactions")

    # Longitudinal device card cycling (device used across multiple accounts)
    if f.accounts_on_device >= 4:
        conditions_met += 2
        reasons.append(f"Device cycling: {f.accounts_on_device} accounts associated with device")

    # Need at least 3 conditions
    return conditions_met >= 3, reasons


def _check_automated_checkout(f: BehavioralFeatures) -> Tuple[bool, List[str]]:
    """AUTOMATED_CHECKOUT: bot-like consistent timing + high frequency."""
    reasons: List[str] = []
    conditions_met = 0

    if f.event_interval_stddev < 0.5 and f.events_per_second > 0.5:
        conditions_met += 1
        reasons.append(f"Event interval stddev {f.event_interval_stddev:.3f}s (bot-like consistency)")
    if f.events_per_second > 1.0:
        conditions_met += 1
        reasons.append(f"{f.events_per_second:.2f} events/sec (high frequency)")
    if 0 < f.checkout_to_payment_s < 2.0:
        conditions_met += 1
        reasons.append(f"Checkout to payment in {f.checkout_to_payment_s:.1f}s")
    if f.payment_attempts_last_5m >= 3:
        conditions_met += 1
        reasons.append(f"{f.payment_attempts_last_5m} payment attempts in 5 min")

    # Need at least 3 of 4 conditions
    return conditions_met >= 3, reasons


def _check_account_takeover(f: BehavioralFeatures) -> Tuple[bool, List[str]]:
    """ACCOUNT_TAKEOVER_LIKE: device/IP changes + velocity above baseline (session or longitudinal)."""
    reasons: List[str] = []
    conditions_met = 0

    if f.device_change_count >= 2:
        conditions_met += 1
        reasons.append(f"{f.device_change_count} device changes in session")
    if f.ip_change_count >= 2:
        conditions_met += 1
        reasons.append(f"{f.ip_change_count} IP changes in session")
    if f.devices_on_account >= 3:
        conditions_met += 1
        reasons.append(f"{f.devices_on_account} devices seen on account")
    if f.payment_attempts_last_5m >= 3:
        conditions_met += 1
        reasons.append(f"High velocity: {f.payment_attempts_last_5m} attempts in 5 min")
    if f.devices_on_account >= 4:
        conditions_met += 1
        reasons.append(f"Excessive distinct devices associated with account ({f.devices_on_account})")
    if f.historical_txn_count > 0 and f.devices_on_account > f.historical_device_count * 2:
        conditions_met += 2
        reasons.append(f"Longitudinal device anomaly: {f.devices_on_account} devices vs historical baseline {f.historical_device_count}")

    # Need at least 2 conditions (device/IP change + velocity/device indicator)
    return conditions_met >= 2, reasons



def _check_suspicious_velocity(f: BehavioralFeatures) -> Tuple[bool, List[str]]:
    """SUSPICIOUS_VELOCITY: high transaction rate without matching other patterns."""
    reasons: List[str] = []

    if f.payment_attempts_last_1m >= 5:
        reasons.append(f"{f.payment_attempts_last_1m} attempts in 1 min")
        return True, reasons
    if f.payment_attempts_last_5m >= 8:
        reasons.append(f"{f.payment_attempts_last_5m} attempts in 5 min")
        return True, reasons
    return False, reasons



def classify_intent(features: BehavioralFeatures) -> Tuple[IntentClass, List[str]]:
    """Classify intent from features using deterministic rules.

    Returns (IntentClass, list of reasons).
    Priority order: CARD_TESTING > AUTOMATED_CHECKOUT > ACCOUNT_TAKEOVER_LIKE >
    SUSPICIOUS_VELOCITY > NORMAL.
    UNKNOWN is returned only when there is insufficient telemetry.
    """
    # Check for insufficient data
    total_events = (
        features.payment_attempts_last_5m
        + features.retry_count
        + (1 if features.session_duration_s > 0 else 0)
    )
    if total_events == 0 and features.session_duration_s == 0 and features.historical_txn_count == 0:
        return IntentClass.UNKNOWN, ["Insufficient session telemetry"]

    # Priority-ordered classification
    matched, reasons = _check_card_testing(features)
    if matched:
        return IntentClass.CARD_TESTING, reasons

    matched, reasons = _check_automated_checkout(features)
    if matched:
        return IntentClass.AUTOMATED_CHECKOUT, reasons

    matched, reasons = _check_account_takeover(features)
    if matched:
        return IntentClass.ACCOUNT_TAKEOVER_LIKE, reasons

    matched, reasons = _check_suspicious_velocity(features)
    if matched:
        return IntentClass.SUSPICIOUS_VELOCITY, reasons

    return IntentClass.NORMAL, ["Behavior within expected thresholds"]

