"""Deterministic behavioral feature extraction.

Given session events and optional historical context, computes 27 typed
features.  Two modes:

- ``extract_session_only(events)`` -- current session only
- ``extract_lifecycle_aware(events, history)`` -- enriched with Phase 1 data

Every feature is deterministic.  No LLM.  No ML.

Feature definitions and units are documented in
``app.models.firewall.BehavioralFeatures``.
"""

import math
import statistics
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set

from app.models.firewall import BehavioralFeatures

_PAYMENT_ATTEMPT_TYPES = {"PAYMENT_ATTEMPTED", "PAYMENT_RETRIED"}
_PAYMENT_FAIL_TYPES = {"PAYMENT_FAILED"}
_PAYMENT_SUCCESS_TYPES = {"PAYMENT_SUCCEEDED"}


def _parse_ts(ts: str) -> Optional[datetime]:
    """Tolerant ISO-8601 parse."""
    if not ts:
        return None
    try:
        cleaned = ts.replace("Z", "+00:00")
        return datetime.fromisoformat(cleaned)
    except (ValueError, TypeError):
        return None


def _seconds_between(a: str, b: str) -> Optional[float]:
    ta, tb = _parse_ts(a), _parse_ts(b)
    if ta is None or tb is None:
        return None
    return (tb - ta).total_seconds()


# ---------------------------------------------------------------------------
# Session-only extraction
# ---------------------------------------------------------------------------

def extract_session_only(events: List[Dict[str, Any]]) -> BehavioralFeatures:
    """Extract features from current-session events only."""
    if not events:
        return BehavioralFeatures()

    sorted_events = sorted(events, key=lambda e: e.get("timestamp", ""))
    timestamps = [_parse_ts(e.get("timestamp", "")) for e in sorted_events]
    valid_ts = [t for t in timestamps if t is not None]

    # --- Session duration ---
    session_duration_s = 0.0
    if len(valid_ts) >= 2:
        session_duration_s = (valid_ts[-1] - valid_ts[0]).total_seconds()

    # --- Events per second ---
    events_per_second = 0.0
    if session_duration_s > 0:
        events_per_second = len(sorted_events) / session_duration_s

    # --- Inter-event intervals ---
    intervals: List[float] = []
    for i in range(1, len(valid_ts)):
        intervals.append((valid_ts[i] - valid_ts[i - 1]).total_seconds())

    event_interval_stddev = 0.0
    if len(intervals) >= 2:
        event_interval_stddev = statistics.stdev(intervals)

    # --- Velocity windows ---
    last_ts = valid_ts[-1] if valid_ts else None
    payment_attempts_1m = 0
    payment_attempts_5m = 0
    payment_failures_1m = 0
    payment_failures_5m = 0

    for ev in sorted_events:
        etype = ev.get("event_type", "")
        evt_ts = _parse_ts(ev.get("timestamp", ""))
        if evt_ts is None or last_ts is None:
            continue
        delta = (last_ts - evt_ts).total_seconds()

        is_attempt = etype in _PAYMENT_ATTEMPT_TYPES
        is_failure = etype in _PAYMENT_FAIL_TYPES

        if is_attempt and delta <= 60:
            payment_attempts_1m += 1
        if is_attempt and delta <= 300:
            payment_attempts_5m += 1
        if is_failure and delta <= 60:
            payment_failures_1m += 1
        if is_failure and delta <= 300:
            payment_failures_5m += 1

    # --- Retry behavior ---
    retry_timestamps: List[datetime] = []
    for ev in sorted_events:
        if ev.get("event_type") == "PAYMENT_RETRIED":
            t = _parse_ts(ev.get("timestamp", ""))
            if t:
                retry_timestamps.append(t)

    retry_count = len(retry_timestamps)
    retry_intervals: List[float] = []
    for i in range(1, len(retry_timestamps)):
        retry_intervals.append((retry_timestamps[i] - retry_timestamps[i - 1]).total_seconds())

    avg_retry_interval_s = 0.0
    min_retry_interval_s = 0.0
    rapid_retry_ratio = 0.0
    if retry_intervals:
        avg_retry_interval_s = sum(retry_intervals) / len(retry_intervals)
        min_retry_interval_s = min(retry_intervals)
        rapid_retry_ratio = sum(1 for r in retry_intervals if r < 5.0) / len(retry_intervals)

    # --- Payment variation ---
    instruments: Set[str] = set()
    amounts: List[float] = []
    for ev in sorted_events:
        etype = ev.get("event_type", "")
        if etype in _PAYMENT_ATTEMPT_TYPES or etype in _PAYMENT_SUCCESS_TYPES or etype in _PAYMENT_FAIL_TYPES:
            token = ev.get("payment_instrument_token") or ev.get("metadata", {}).get("payment_instrument_token")
            if token:
                instruments.add(token)
            amt = ev.get("amount")
            if amt is not None:
                amounts.append(float(amt))

    unique_instrument_count = len(instruments)
    amount_variance = 0.0
    amount_change_ratio = 0.0
    if len(amounts) >= 2:
        amount_variance = statistics.variance(amounts)
    if amounts:
        amount_change_ratio = len(set(amounts)) / len(amounts)

    # --- Identity / infrastructure (session-level) ---
    devices: Set[str] = set()
    ips: Set[str] = set()
    accounts: Set[str] = set()
    prev_device = None
    prev_ip = None
    device_change_count = 0
    ip_change_count = 0

    for ev in sorted_events:
        dh = ev.get("device_hash")
        ip = ev.get("ip_address")
        acc = ev.get("account_id")
        if dh:
            devices.add(dh)
            if prev_device and dh != prev_device:
                device_change_count += 1
            prev_device = dh
        if ip:
            ips.add(ip)
            if prev_ip and ip != prev_ip:
                ip_change_count += 1
            prev_ip = ip
        if acc:
            accounts.add(acc)

    # --- Checkout to payment ---
    checkout_to_payment_s = 0.0
    checkout_ts = None
    first_payment_ts = None
    for ev in sorted_events:
        etype = ev.get("event_type", "")
        if etype == "CHECKOUT_VIEWED" and checkout_ts is None:
            checkout_ts = _parse_ts(ev.get("timestamp", ""))
        if etype in _PAYMENT_ATTEMPT_TYPES and first_payment_ts is None:
            first_payment_ts = _parse_ts(ev.get("timestamp", ""))
    if checkout_ts and first_payment_ts:
        checkout_to_payment_s = (first_payment_ts - checkout_ts).total_seconds()

    # --- Failed to success ratio ---
    fail_count = sum(1 for e in sorted_events if e.get("event_type") in _PAYMENT_FAIL_TYPES)
    success_count = sum(1 for e in sorted_events if e.get("event_type") in _PAYMENT_SUCCESS_TYPES)
    if success_count > 0:
        failed_to_success_ratio = fail_count / success_count
    elif fail_count > 0:
        failed_to_success_ratio = 999.0
    else:
        failed_to_success_ratio = 0.0

    return BehavioralFeatures(
        payment_attempts_last_1m=payment_attempts_1m,
        payment_attempts_last_5m=payment_attempts_5m,
        payment_failures_last_1m=payment_failures_1m,
        payment_failures_last_5m=payment_failures_5m,
        events_per_second=round(events_per_second, 4),
        retry_count=retry_count,
        avg_retry_interval_s=round(avg_retry_interval_s, 2),
        min_retry_interval_s=round(min_retry_interval_s, 2),
        rapid_retry_ratio=round(rapid_retry_ratio, 4),
        unique_instrument_count=unique_instrument_count,
        amount_variance=round(amount_variance, 2),
        amount_change_ratio=round(amount_change_ratio, 4),
        accounts_on_device=max(len(accounts), 1) if devices else 1,
        devices_on_account=max(len(devices), 1),
        accounts_on_ip=max(len(accounts), 1) if ips else 1,
        ips_on_account=max(len(ips), 1),
        device_change_count=device_change_count,
        ip_change_count=ip_change_count,
        session_duration_s=round(session_duration_s, 2),
        checkout_to_payment_s=round(checkout_to_payment_s, 2),
        failed_to_success_ratio=round(failed_to_success_ratio, 4),
        event_interval_stddev=round(event_interval_stddev, 4),
    )


# ---------------------------------------------------------------------------
# Lifecycle-aware extraction (Phase 1 history enrichment)
# ---------------------------------------------------------------------------

def extract_lifecycle_aware(
    events: List[Dict[str, Any]],
    historical_events: List[Dict[str, Any]],
) -> BehavioralFeatures:
    """Extract features from session events + Phase 1 historical context.

    Adds historical_* features on top of the session-only extraction.
    """
    features = extract_session_only(events)

    if not historical_events:
        return features

    # --- Historical transaction count ---
    hist_txn_ids: Set[str] = set()
    hist_fail_count = 0
    hist_success_count = 0
    hist_total_payment_events = 0
    hist_devices: Set[str] = set()
    hist_ips: Set[str] = set()
    hist_accounts: Set[str] = set()
    hist_timestamps: List[datetime] = []

    for ev in historical_events:
        txn_id = ev.get("transaction_id") or ev.get("session_id") or ev.get("metadata", {}).get("transaction_id") or ev.get("event_id")
        if txn_id:
            hist_txn_ids.add(txn_id)
        etype = ev.get("event_type", "")
        if etype in _PAYMENT_ATTEMPT_TYPES or etype in _PAYMENT_FAIL_TYPES or etype in _PAYMENT_SUCCESS_TYPES:
            hist_total_payment_events += 1
        if etype in _PAYMENT_FAIL_TYPES:
            hist_fail_count += 1
        elif etype in _PAYMENT_SUCCESS_TYPES:
            hist_success_count += 1
        dh = ev.get("device_hash") or ev.get("metadata", {}).get("device_hash")
        if dh:
            hist_devices.add(dh)
        ip = ev.get("ip_address") or ev.get("metadata", {}).get("ip_address")
        if ip:
            hist_ips.add(ip)
        acc = ev.get("account_id") or ev.get("metadata", {}).get("account_id")
        if acc:
            hist_accounts.add(acc)
        t = _parse_ts(ev.get("timestamp", ""))
        if t:
            hist_timestamps.append(t)

    features.historical_txn_count = len(hist_txn_ids)
    total_outcomes = hist_fail_count + hist_success_count
    features.historical_failure_rate = (
        hist_fail_count / total_outcomes if total_outcomes > 0 else (
            hist_fail_count / hist_total_payment_events if hist_total_payment_events > 0 else 0.0
        )
    )

    # Historical payment velocity (payments per day)
    if len(hist_timestamps) >= 2:
        hist_timestamps.sort()
        span_days = (hist_timestamps[-1] - hist_timestamps[0]).total_seconds() / 86400.0
        if span_days > 0:
            features.historical_payment_velocity = round(hist_total_payment_events / span_days, 4)

    features.historical_device_count = len(hist_devices)
    features.historical_ip_count = len(hist_ips)

    # Enrich cross-entity counts with history
    session_devices = set()
    session_ips = set()
    session_accounts = set()
    for ev in events:
        if ev.get("device_hash"):
            session_devices.add(ev["device_hash"])
        if ev.get("ip_address"):
            session_ips.add(ev["ip_address"])
        if ev.get("account_id"):
            session_accounts.add(ev["account_id"])

    # Accounts seen on this device across history
    if session_devices:
        device_accounts = set(session_accounts)
        for hev in historical_events:
            hdh = hev.get("device_hash") or hev.get("metadata", {}).get("device_hash")
            hacc = hev.get("account_id") or hev.get("metadata", {}).get("account_id")
            if hdh in session_devices and hacc:
                device_accounts.add(hacc)
        features.accounts_on_device = max(len(device_accounts), 1)

    # Devices seen on this account across history
    if session_accounts:
        account_devices = set(session_devices)
        for hev in historical_events:
            hacc = hev.get("account_id") or hev.get("metadata", {}).get("account_id")
            hdh = hev.get("device_hash") or hev.get("metadata", {}).get("device_hash")
            if hacc in session_accounts and hdh:
                account_devices.add(hdh)
        features.devices_on_account = max(len(account_devices), 1)

    # IPs / accounts cross-enrichment
    if session_ips:
        ip_accounts = set(session_accounts)
        for hev in historical_events:
            hip = hev.get("ip_address") or hev.get("metadata", {}).get("ip_address")
            hacc = hev.get("account_id") or hev.get("metadata", {}).get("account_id")
            if hip in session_ips and hacc:
                ip_accounts.add(hacc)
        features.accounts_on_ip = max(len(ip_accounts), 1)

    if session_accounts:
        account_ips = set(session_ips)
        for hev in historical_events:
            hacc = hev.get("account_id") or hev.get("metadata", {}).get("account_id")
            hip = hev.get("ip_address") or hev.get("metadata", {}).get("ip_address")
            if hacc in session_accounts and hip:
                account_ips.add(hip)
        features.ips_on_account = max(len(account_ips), 1)

    return features
