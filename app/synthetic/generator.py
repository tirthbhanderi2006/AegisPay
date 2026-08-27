"""Deterministic synthetic payment-event generator.

THIS DATASET IS SYNTHETIC AND IS USED ONLY TO VALIDATE THE BEHAVIORAL
INTELLIGENCE METHODOLOGY. IT DOES NOT REPRESENT RAZORPAY PROPRIETARY DATA.

Scenarios:
  1. NORMAL_USER
  2. CARD_TESTING (5 sub-variants: A-E)
  3. LOW_AND_SLOW_AUTOMATION
  4. ACCOUNT_TAKEOVER_LIKE
  5. AUTOMATED_CHECKOUT
  6. LEGITIMATE_SHARED_DEVICE
  7. LEGITIMATE_SHARED_IP
  8. LEGITIMATE_RETRY_BEHAVIOR
  9. DISTRIBUTED_SUSPICIOUS_BEHAVIOR

Each generator returns:
  (events, ground_truth_label, ground_truth_action, historical_events)

Reproducible via random.Random(seed).
"""

import random
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

# Ground-truth labels for evaluation
LABEL_NORMAL = "NORMAL"
LABEL_CARD_TESTING = "CARD_TESTING"
LABEL_LOW_AND_SLOW = "LOW_AND_SLOW_AUTOMATION"
LABEL_ACCOUNT_TAKEOVER = "ACCOUNT_TAKEOVER_LIKE"
LABEL_AUTOMATED_CHECKOUT = "AUTOMATED_CHECKOUT"
LABEL_SHARED_DEVICE = "LEGITIMATE_SHARED_DEVICE"
LABEL_SHARED_IP = "LEGITIMATE_SHARED_IP"
LABEL_LEGIT_RETRY = "LEGITIMATE_RETRY_BEHAVIOR"
LABEL_DISTRIBUTED = "DISTRIBUTED_SUSPICIOUS_BEHAVIOR"

ACTION_ALLOW = "ALLOW"
ACTION_CHALLENGE = "CHALLENGE"
ACTION_BLOCK = "BLOCK"

_BASE_TIME = datetime(2026, 7, 20, 10, 0, 0, tzinfo=timezone.utc)


def _ts(base: datetime, offset_s: float) -> str:
    return (base + timedelta(seconds=offset_s)).isoformat()


def _evt(
    eid: str, etype: str, ts: str,
    device: str = "dev_001", ip: str = "10.0.0.1",
    account: str = "acc_001", amount: Optional[float] = None,
    token: Optional[str] = None, session: str = "sess_001",
    merchant: str = "merch_001",
) -> Dict[str, Any]:
    ev: Dict[str, Any] = {
        "event_id": eid,
        "event_type": etype,
        "timestamp": ts,
        "device_hash": device,
        "ip_address": ip,
        "account_id": account,
        "session_id": session,
        "merchant_id": merchant,
        "metadata": {},
    }
    if amount is not None:
        ev["amount"] = amount
    if token:
        ev["payment_instrument_token"] = token
    return ev


def _generate_history(
    rng: random.Random, account: str, device: str, ip: str,
    num_txns: int = 5, days_back: int = 90,
) -> List[Dict[str, Any]]:
    """Generate plausible historical events for an account."""
    history: List[Dict[str, Any]] = []
    for i in range(num_txns):
        offset_days = rng.uniform(1, days_back)
        base = _BASE_TIME - timedelta(days=offset_days)
        sess = f"hist_sess_{i:04d}"
        history.append(_evt(
            f"hist_e_{i}_1", "SESSION_STARTED", _ts(base, 0),
            device, ip, account, session=sess,
        ))
        history.append(_evt(
            f"hist_e_{i}_2", "CHECKOUT_VIEWED", _ts(base, rng.uniform(10, 60)),
            device, ip, account, session=sess,
        ))
        history.append(_evt(
            f"hist_e_{i}_3", "PAYMENT_ATTEMPTED", _ts(base, rng.uniform(70, 120)),
            device, ip, account, amount=rng.uniform(20, 200),
            token="tok_hist_main", session=sess,
        ))
        if rng.random() < 0.85:  # 85% success
            history.append(_evt(
                f"hist_e_{i}_4", "PAYMENT_SUCCEEDED", _ts(base, rng.uniform(121, 125)),
                device, ip, account, amount=rng.uniform(20, 200),
                token="tok_hist_main", session=sess,
            ))
        else:
            history.append(_evt(
                f"hist_e_{i}_4", "PAYMENT_FAILED", _ts(base, rng.uniform(121, 125)),
                device, ip, account, session=sess,
            ))
    return history


# ---------------------------------------------------------------------------
# Scenario generators
# ---------------------------------------------------------------------------

def gen_normal_user(
    rng: random.Random, idx: int,
) -> Tuple[List[Dict], str, str, List[Dict]]:
    """Normal user: browse, checkout, pay once, succeed."""
    sess = f"sess_normal_{idx:04d}"
    acc = f"acc_normal_{idx:04d}"
    dev = f"dev_normal_{idx:04d}"
    ip = f"10.0.{rng.randint(1,254)}.{rng.randint(1,254)}"
    amt = round(rng.uniform(15, 300), 2)

    events = [
        _evt(f"n{idx}_e1", "SESSION_STARTED", _ts(_BASE_TIME, 0), dev, ip, acc, session=sess),
        _evt(f"n{idx}_e2", "CHECKOUT_VIEWED", _ts(_BASE_TIME, rng.uniform(15, 60)), dev, ip, acc, session=sess),
        _evt(f"n{idx}_e3", "PAYMENT_METHOD_SELECTED", _ts(_BASE_TIME, rng.uniform(65, 90)), dev, ip, acc, session=sess),
        _evt(f"n{idx}_e4", "PAYMENT_ATTEMPTED", _ts(_BASE_TIME, rng.uniform(95, 120)), dev, ip, acc, amount=amt, token="tok_main", session=sess),
        _evt(f"n{idx}_e5", "PAYMENT_SUCCEEDED", _ts(_BASE_TIME, rng.uniform(121, 125)), dev, ip, acc, amount=amt, token="tok_main", session=sess),
        _evt(f"n{idx}_e6", "SESSION_ENDED", _ts(_BASE_TIME, rng.uniform(130, 200)), dev, ip, acc, session=sess),
    ]
    history = _generate_history(rng, acc, dev, ip)
    return events, LABEL_NORMAL, ACTION_ALLOW, history


def gen_card_testing_a(
    rng: random.Random, idx: int,
) -> Tuple[List[Dict], str, str, List[Dict]]:
    """CARD_TESTING_A: rapid attempts, many failures, many instruments."""
    sess = f"sess_ct_a_{idx:04d}"
    acc = f"acc_ct_{idx:04d}"
    dev = f"dev_ct_{idx:04d}"
    ip = f"192.168.{rng.randint(1,254)}.{rng.randint(1,254)}"

    events = [_evt(f"cta{idx}_e0", "SESSION_STARTED", _ts(_BASE_TIME, 0), dev, ip, acc, session=sess)]
    t = 2.0
    for i in range(12):
        tok = f"tok_stolen_{i:02d}"
        amt = round(rng.uniform(1, 5), 2)
        events.append(_evt(f"cta{idx}_e{i*2+1}", "PAYMENT_ATTEMPTED", _ts(_BASE_TIME, t), dev, ip, acc, amount=amt, token=tok, session=sess))
        t += rng.uniform(1, 3)
        events.append(_evt(f"cta{idx}_e{i*2+2}", "PAYMENT_FAILED", _ts(_BASE_TIME, t), dev, ip, acc, session=sess))
        t += rng.uniform(0.5, 2)
        if i > 0 and i % 4 == 0:
            events.append(_evt(f"cta{idx}_er{i}", "PAYMENT_RETRIED", _ts(_BASE_TIME, t), dev, ip, acc, amount=amt, token=tok, session=sess))
            t += rng.uniform(0.5, 1.5)

    return events, LABEL_CARD_TESTING, ACTION_BLOCK, []


def gen_card_testing_b(
    rng: random.Random, idx: int,
) -> Tuple[List[Dict], str, str, List[Dict]]:
    """CARD_TESTING_B: slower but still suspicious with failures."""
    sess = f"sess_ct_b_{idx:04d}"
    acc = f"acc_ctb_{idx:04d}"
    dev = f"dev_ctb_{idx:04d}"
    ip = f"172.16.{rng.randint(1,254)}.{rng.randint(1,254)}"

    events = [_evt(f"ctb{idx}_e0", "SESSION_STARTED", _ts(_BASE_TIME, 0), dev, ip, acc, session=sess)]
    t = 5.0
    for i in range(8):
        tok = f"tok_card_{i:02d}"
        amt = round(rng.uniform(1, 10), 2)
        events.append(_evt(f"ctb{idx}_e{i*2+1}", "PAYMENT_ATTEMPTED", _ts(_BASE_TIME, t), dev, ip, acc, amount=amt, token=tok, session=sess))
        t += rng.uniform(8, 20)
        events.append(_evt(f"ctb{idx}_e{i*2+2}", "PAYMENT_FAILED", _ts(_BASE_TIME, t), dev, ip, acc, session=sess))
        t += rng.uniform(5, 15)
        events.append(_evt(f"ctb{idx}_er{i}", "PAYMENT_RETRIED", _ts(_BASE_TIME, t), dev, ip, acc, amount=amt, token=tok, session=sess))
        t += rng.uniform(3, 8)

    return events, LABEL_CARD_TESTING, ACTION_BLOCK, []


def gen_card_testing_c(
    rng: random.Random, idx: int,
) -> Tuple[List[Dict], str, str, List[Dict]]:
    """CARD_TESTING_C: varying amounts, same instrument rotations."""
    sess = f"sess_ct_c_{idx:04d}"
    acc = f"acc_ctc_{idx:04d}"
    dev = f"dev_ctc_{idx:04d}"
    ip = f"10.1.{rng.randint(1,254)}.{rng.randint(1,254)}"

    events = [_evt(f"ctc{idx}_e0", "SESSION_STARTED", _ts(_BASE_TIME, 0), dev, ip, acc, session=sess)]
    t = 3.0
    tokens = [f"tok_v_{j}" for j in range(6)]
    for i in range(10):
        tok = tokens[i % len(tokens)]
        amt = round(rng.uniform(0.50, 500), 2)
        events.append(_evt(f"ctc{idx}_e{i*2+1}", "PAYMENT_ATTEMPTED", _ts(_BASE_TIME, t), dev, ip, acc, amount=amt, token=tok, session=sess))
        t += rng.uniform(2, 6)
        if rng.random() < 0.8:
            events.append(_evt(f"ctc{idx}_e{i*2+2}", "PAYMENT_FAILED", _ts(_BASE_TIME, t), dev, ip, acc, session=sess))
        else:
            events.append(_evt(f"ctc{idx}_e{i*2+2}", "PAYMENT_SUCCEEDED", _ts(_BASE_TIME, t), dev, ip, acc, amount=amt, session=sess))
        t += rng.uniform(1, 4)

    return events, LABEL_CARD_TESTING, ACTION_BLOCK, []


def gen_card_testing_d(
    rng: random.Random, idx: int,
) -> Tuple[List[Dict], str, str, List[Dict]]:
    """CARD_TESTING_D: rotating devices."""
    sess = f"sess_ct_d_{idx:04d}"
    acc = f"acc_ctd_{idx:04d}"
    ip = f"10.2.{rng.randint(1,254)}.{rng.randint(1,254)}"

    events = []
    t = 0.0
    for i in range(10):
        dev = f"dev_rot_{i:02d}"
        tok = f"tok_d_{i:02d}"
        amt = round(rng.uniform(1, 5), 2)
        events.append(_evt(f"ctd{idx}_e{i*2}", "PAYMENT_ATTEMPTED", _ts(_BASE_TIME, t), dev, ip, acc, amount=amt, token=tok, session=sess))
        t += rng.uniform(2, 5)
        events.append(_evt(f"ctd{idx}_e{i*2+1}", "PAYMENT_FAILED", _ts(_BASE_TIME, t), dev, ip, acc, session=sess))
        t += rng.uniform(1, 3)

    return events, LABEL_CARD_TESTING, ACTION_BLOCK, []


def gen_card_testing_e(
    rng: random.Random, idx: int,
) -> Tuple[List[Dict], str, str, List[Dict]]:
    """CARD_TESTING_E: rotating IPs."""
    sess = f"sess_ct_e_{idx:04d}"
    acc = f"acc_cte_{idx:04d}"
    dev = f"dev_cte_{idx:04d}"

    events = []
    t = 0.0
    for i in range(10):
        ip = f"10.{rng.randint(1,254)}.{rng.randint(1,254)}.{rng.randint(1,254)}"
        tok = f"tok_e_{i:02d}"
        amt = round(rng.uniform(1, 5), 2)
        events.append(_evt(f"cte{idx}_e{i*2}", "PAYMENT_ATTEMPTED", _ts(_BASE_TIME, t), dev, ip, acc, amount=amt, token=tok, session=sess))
        t += rng.uniform(2, 5)
        events.append(_evt(f"cte{idx}_e{i*2+1}", "PAYMENT_FAILED", _ts(_BASE_TIME, t), dev, ip, acc, session=sess))
        t += rng.uniform(1, 3)

    return events, LABEL_CARD_TESTING, ACTION_BLOCK, []


def gen_low_and_slow(
    rng: random.Random, idx: int,
) -> Tuple[List[Dict], str, str, List[Dict]]:
    """LOW_AND_SLOW: spread attempts over 30+ minutes."""
    sess = f"sess_las_{idx:04d}"
    acc = f"acc_las_{idx:04d}"
    dev = f"dev_las_{idx:04d}"
    ip = f"10.3.{rng.randint(1,254)}.{rng.randint(1,254)}"

    events = [_evt(f"las{idx}_e0", "SESSION_STARTED", _ts(_BASE_TIME, 0), dev, ip, acc, session=sess)]
    t = 60.0
    for i in range(8):
        tok = f"tok_slow_{i:02d}"
        amt = round(rng.uniform(1, 10), 2)
        events.append(_evt(f"las{idx}_e{i*2+1}", "PAYMENT_ATTEMPTED", _ts(_BASE_TIME, t), dev, ip, acc, amount=amt, token=tok, session=sess))
        t += rng.uniform(3, 8)
        events.append(_evt(f"las{idx}_e{i*2+2}", "PAYMENT_FAILED", _ts(_BASE_TIME, t), dev, ip, acc, session=sess))
        t += rng.uniform(180, 400)  # 3-7 minutes between attempts

    return events, LABEL_LOW_AND_SLOW, ACTION_CHALLENGE, []


def gen_account_takeover(
    rng: random.Random, idx: int,
) -> Tuple[List[Dict], str, str, List[Dict]]:
    """ACCOUNT_TAKEOVER_LIKE: device/IP cycling + velocity."""
    sess = f"sess_ato_{idx:04d}"
    acc = f"acc_ato_{idx:04d}"

    events = []
    t = 0.0
    for i in range(8):
        dev = f"dev_ato_{rng.randint(0,4)}"
        ip = f"10.{rng.randint(1,254)}.{rng.randint(1,254)}.{rng.randint(1,254)}"
        amt = round(rng.uniform(50, 500), 2)
        events.append(_evt(f"ato{idx}_e{i*2}", "PAYMENT_ATTEMPTED", _ts(_BASE_TIME, t), dev, ip, acc, amount=amt, token="tok_ato_main", session=sess))
        t += rng.uniform(5, 15)
        if rng.random() < 0.5:
            events.append(_evt(f"ato{idx}_e{i*2+1}", "PAYMENT_SUCCEEDED", _ts(_BASE_TIME, t), dev, ip, acc, amount=amt, session=sess))
        else:
            events.append(_evt(f"ato{idx}_e{i*2+1}", "PAYMENT_FAILED", _ts(_BASE_TIME, t), dev, ip, acc, session=sess))
        t += rng.uniform(3, 10)

    history = _generate_history(rng, acc, "dev_ato_original", "10.0.0.1")
    return events, LABEL_ACCOUNT_TAKEOVER, ACTION_BLOCK, history


def gen_automated_checkout(
    rng: random.Random, idx: int,
) -> Tuple[List[Dict], str, str, List[Dict]]:
    """AUTOMATED_CHECKOUT: bot-like consistent timing."""
    sess = f"sess_bot_{idx:04d}"
    acc = f"acc_bot_{idx:04d}"
    dev = f"dev_bot_{idx:04d}"
    ip = f"10.4.{rng.randint(1,254)}.{rng.randint(1,254)}"
    amt = round(rng.uniform(20, 100), 2)

    events = [_evt(f"bot{idx}_e0", "SESSION_STARTED", _ts(_BASE_TIME, 0), dev, ip, acc, session=sess)]
    # Bot-like: very consistent 0.5s intervals
    t = 0.5
    events.append(_evt(f"bot{idx}_e1", "CHECKOUT_VIEWED", _ts(_BASE_TIME, t), dev, ip, acc, session=sess))
    t += 0.5
    events.append(_evt(f"bot{idx}_e2", "PAYMENT_METHOD_SELECTED", _ts(_BASE_TIME, t), dev, ip, acc, session=sess))
    t += 0.5
    for i in range(6):
        events.append(_evt(f"bot{idx}_e{i+3}", "PAYMENT_ATTEMPTED", _ts(_BASE_TIME, t), dev, ip, acc, amount=amt, token="tok_bot", session=sess))
        t += 0.5
        events.append(_evt(f"bot{idx}_ef{i}", "PAYMENT_SUCCEEDED" if i == 5 else "PAYMENT_FAILED", _ts(_BASE_TIME, t), dev, ip, acc, amount=amt, session=sess))
        t += 0.5

    return events, LABEL_AUTOMATED_CHECKOUT, ACTION_BLOCK, []


def gen_legitimate_shared_device(
    rng: random.Random, idx: int,
) -> Tuple[List[Dict], str, str, List[Dict]]:
    """LEGITIMATE_SHARED_DEVICE: family members sharing a tablet."""
    dev = f"dev_shared_{idx:04d}"
    ip = f"10.5.0.{rng.randint(1,254)}"

    events = []
    for member_idx in range(3):
        acc = f"acc_family_{idx}_{member_idx}"
        sess = f"sess_fam_{idx}_{member_idx}"
        t_offset = member_idx * 3600  # 1 hour apart
        base = _BASE_TIME + timedelta(seconds=t_offset)
        amt = round(rng.uniform(20, 150), 2)
        events.extend([
            _evt(f"fam{idx}_{member_idx}_e1", "SESSION_STARTED", _ts(base, 0), dev, ip, acc, session=sess),
            _evt(f"fam{idx}_{member_idx}_e2", "CHECKOUT_VIEWED", _ts(base, rng.uniform(20, 60)), dev, ip, acc, session=sess),
            _evt(f"fam{idx}_{member_idx}_e3", "PAYMENT_ATTEMPTED", _ts(base, rng.uniform(80, 120)), dev, ip, acc, amount=amt, token=f"tok_fam_{member_idx}", session=sess),
            _evt(f"fam{idx}_{member_idx}_e4", "PAYMENT_SUCCEEDED", _ts(base, rng.uniform(121, 130)), dev, ip, acc, amount=amt, session=sess),
            _evt(f"fam{idx}_{member_idx}_e5", "SESSION_ENDED", _ts(base, rng.uniform(140, 200)), dev, ip, acc, session=sess),
        ])

    return events, LABEL_SHARED_DEVICE, ACTION_ALLOW, []


def gen_legitimate_shared_ip(
    rng: random.Random, idx: int,
) -> Tuple[List[Dict], str, str, List[Dict]]:
    """LEGITIMATE_SHARED_IP: office workers on same network."""
    ip = f"203.0.113.{rng.randint(1,254)}"

    events = []
    for user_idx in range(4):
        acc = f"acc_office_{idx}_{user_idx}"
        dev = f"dev_office_{idx}_{user_idx}"
        sess = f"sess_office_{idx}_{user_idx}"
        t_offset = user_idx * 1800  # 30 min apart
        base = _BASE_TIME + timedelta(seconds=t_offset)
        amt = round(rng.uniform(10, 200), 2)
        events.extend([
            _evt(f"off{idx}_{user_idx}_e1", "SESSION_STARTED", _ts(base, 0), dev, ip, acc, session=sess),
            _evt(f"off{idx}_{user_idx}_e2", "CHECKOUT_VIEWED", _ts(base, rng.uniform(10, 40)), dev, ip, acc, session=sess),
            _evt(f"off{idx}_{user_idx}_e3", "PAYMENT_ATTEMPTED", _ts(base, rng.uniform(50, 90)), dev, ip, acc, amount=amt, token=f"tok_off_{user_idx}", session=sess),
            _evt(f"off{idx}_{user_idx}_e4", "PAYMENT_SUCCEEDED", _ts(base, rng.uniform(91, 100)), dev, ip, acc, amount=amt, session=sess),
        ])

    return events, LABEL_SHARED_IP, ACTION_ALLOW, []


def gen_legitimate_retry(
    rng: random.Random, idx: int,
) -> Tuple[List[Dict], str, str, List[Dict]]:
    """LEGITIMATE_RETRY: unstable network causing retries."""
    sess = f"sess_retry_{idx:04d}"
    acc = f"acc_retry_{idx:04d}"
    dev = f"dev_retry_{idx:04d}"
    ip = f"10.6.{rng.randint(1,254)}.{rng.randint(1,254)}"
    amt = round(rng.uniform(30, 200), 2)

    events = [
        _evt(f"ret{idx}_e0", "SESSION_STARTED", _ts(_BASE_TIME, 0), dev, ip, acc, session=sess),
        _evt(f"ret{idx}_e1", "CHECKOUT_VIEWED", _ts(_BASE_TIME, 30), dev, ip, acc, session=sess),
        _evt(f"ret{idx}_e2", "PAYMENT_ATTEMPTED", _ts(_BASE_TIME, 90), dev, ip, acc, amount=amt, token="tok_legit", session=sess),
        _evt(f"ret{idx}_e3", "PAYMENT_FAILED", _ts(_BASE_TIME, 95), dev, ip, acc, session=sess),
        _evt(f"ret{idx}_e4", "PAYMENT_RETRIED", _ts(_BASE_TIME, 120), dev, ip, acc, amount=amt, token="tok_legit", session=sess),
        _evt(f"ret{idx}_e5", "PAYMENT_FAILED", _ts(_BASE_TIME, 125), dev, ip, acc, session=sess),
        _evt(f"ret{idx}_e6", "PAYMENT_RETRIED", _ts(_BASE_TIME, 180), dev, ip, acc, amount=amt, token="tok_legit", session=sess),
        _evt(f"ret{idx}_e7", "PAYMENT_SUCCEEDED", _ts(_BASE_TIME, 185), dev, ip, acc, amount=amt, token="tok_legit", session=sess),
        _evt(f"ret{idx}_e8", "SESSION_ENDED", _ts(_BASE_TIME, 200), dev, ip, acc, session=sess),
    ]
    history = _generate_history(rng, acc, dev, ip)
    return events, LABEL_LEGIT_RETRY, ACTION_ALLOW, history


def gen_distributed_suspicious(
    rng: random.Random, idx: int,
) -> Tuple[List[Dict], str, str, List[Dict]]:
    """DISTRIBUTED_SUSPICIOUS: coordinated across multiple accounts on one device."""
    dev = f"dev_dist_{idx:04d}"
    sess = f"sess_dist_{idx:04d}"

    events = []
    t = 0.0
    for acc_idx in range(5):
        acc = f"acc_dist_{idx}_{acc_idx}"
        ip = f"10.{rng.randint(1,254)}.{rng.randint(1,254)}.{rng.randint(1,254)}"
        for attempt in range(3):
            tok = f"tok_dist_{acc_idx}_{attempt}"
            amt = round(rng.uniform(1, 5), 2)
            events.append(_evt(f"dist{idx}_{acc_idx}_{attempt}_a", "PAYMENT_ATTEMPTED", _ts(_BASE_TIME, t), dev, ip, acc, amount=amt, token=tok, session=sess))
            t += rng.uniform(1, 3)
            events.append(_evt(f"dist{idx}_{acc_idx}_{attempt}_f", "PAYMENT_FAILED", _ts(_BASE_TIME, t), dev, ip, acc, session=sess))
            t += rng.uniform(0.5, 2)

    return events, LABEL_DISTRIBUTED, ACTION_BLOCK, []


# ---------------------------------------------------------------------------
# Master generator
# ---------------------------------------------------------------------------

_SCENARIO_GENERATORS = {
    LABEL_NORMAL: gen_normal_user,
    "CARD_TESTING_A": gen_card_testing_a,
    "CARD_TESTING_B": gen_card_testing_b,
    "CARD_TESTING_C": gen_card_testing_c,
    "CARD_TESTING_D": gen_card_testing_d,
    "CARD_TESTING_E": gen_card_testing_e,
    LABEL_LOW_AND_SLOW: gen_low_and_slow,
    LABEL_ACCOUNT_TAKEOVER: gen_account_takeover,
    LABEL_AUTOMATED_CHECKOUT: gen_automated_checkout,
    LABEL_SHARED_DEVICE: gen_legitimate_shared_device,
    LABEL_SHARED_IP: gen_legitimate_shared_ip,
    LABEL_LEGIT_RETRY: gen_legitimate_retry,
    LABEL_DISTRIBUTED: gen_distributed_suspicious,
}

# Map sub-labels to canonical labels for evaluation
CANONICAL_LABELS = {
    "CARD_TESTING_A": LABEL_CARD_TESTING,
    "CARD_TESTING_B": LABEL_CARD_TESTING,
    "CARD_TESTING_C": LABEL_CARD_TESTING,
    "CARD_TESTING_D": LABEL_CARD_TESTING,
    "CARD_TESTING_E": LABEL_CARD_TESTING,
}


def generate_dataset(
    sessions: int = 100,
    seed: int = 42,
) -> List[Dict[str, Any]]:
    """Generate a balanced synthetic dataset.

    Returns a list of session dicts, each with:
      events, label, expected_action, historical_events, scenario
    """
    rng = random.Random(seed)
    scenarios = list(_SCENARIO_GENERATORS.keys())
    dataset: List[Dict[str, Any]] = []

    per_scenario = max(1, sessions // len(scenarios))

    for scenario_name in scenarios:
        gen_fn = _SCENARIO_GENERATORS[scenario_name]
        for i in range(per_scenario):
            events, label, expected_action, history = gen_fn(rng, i + len(dataset))
            canonical = CANONICAL_LABELS.get(scenario_name, label)
            dataset.append({
                "scenario": scenario_name,
                "label": canonical,
                "expected_action": expected_action,
                "events": events,
                "historical_events": history,
                "session_id": events[0].get("session_id", f"sess_{len(dataset)}") if events else f"sess_{len(dataset)}",
            })

    rng.shuffle(dataset)
    return dataset
