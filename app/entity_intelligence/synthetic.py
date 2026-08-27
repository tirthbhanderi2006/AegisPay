"""Phase 3 — Synthetic Cross-Merchant Payment Scenarios.

Generates 10 deterministic cross-merchant scenarios:
  1. DEVICE_REUSE_RING: 1 device attacking across 5 distinct merchants
  2. IP_REUSE_RING: 1 IP executing fraud across multiple merchants
  3. DISTRIBUTED_LOW_AND_SLOW: Cross-merchant low-velocity card testing ring
  4. ACCOUNT_DEVICE_ROTATION: 1 account hopping devices across merchants
  5. MERCHANT_HOPPING: Rapid cross-merchant attempts within short windows
  6. MIXED_ENTITY_RING: Coordinated multi-device / multi-IP / multi-merchant cluster
  7. LEGITIMATE_OFFICE_NETWORK: 10 legitimate accounts sharing an office IP (0% failures)
  8. LEGITIMATE_FAMILY_DEVICE: 3 family members sharing 1 tablet on distinct merchants
  9. LEGITIMATE_MOBILE_NETWORK: Many users sharing mobile carrier CGNAT IP
 10. ISOLATED_NORMAL_USER: Standard single-merchant benign user
"""

import random
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Dict, List, Optional, Tuple

from app.models.firewall import RecommendedAction

_BASE_TIME = datetime(2026, 7, 20, 10, 0, 0, tzinfo=timezone.utc)

LABEL_DEVICE_REUSE_RING = "DEVICE_REUSE_RING"
LABEL_IP_REUSE_RING = "IP_REUSE_RING"
LABEL_DISTRIBUTED_LOW_AND_SLOW = "DISTRIBUTED_LOW_AND_SLOW"
LABEL_ACCOUNT_DEVICE_ROTATION = "ACCOUNT_DEVICE_ROTATION"
LABEL_MERCHANT_HOPPING = "MERCHANT_HOPPING"
LABEL_MIXED_ENTITY_RING = "MIXED_ENTITY_RING"
LABEL_LEGITIMATE_OFFICE_NETWORK = "LEGITIMATE_OFFICE_NETWORK"
LABEL_LEGITIMATE_FAMILY_DEVICE = "LEGITIMATE_FAMILY_DEVICE"
LABEL_LEGITIMATE_MOBILE_NETWORK = "LEGITIMATE_MOBILE_NETWORK"
LABEL_ISOLATED_NORMAL_USER = "ISOLATED_NORMAL_USER"


def _iso(dt: datetime) -> str:
    return dt.isoformat()


def _ts(base: datetime, offset_s: float) -> str:
    return _iso(base + timedelta(seconds=offset_s))


def _evt(
    event_id: str,
    event_type: str,
    ts: str,
    merchant: str,
    dev: str,
    ip: str,
    acc: str,
    amount: float = 100.0,
    session: str = "sess_0",
) -> Dict[str, Any]:
    return {
        "event_id": event_id,
        "event_type": event_type,
        "timestamp": ts,
        "merchant_id": merchant,
        "device_hash": dev,
        "ip_address": ip,
        "account_id": acc,
        "amount": amount,
        "session_id": session,
        "metadata": {
            "merchant_id": merchant,
            "device_hash": dev,
            "ip_address": ip,
            "account_id": acc,
            "amount": amount,
        },
    }


def gen_device_reuse_ring(rng: random.Random, idx: int) -> Dict[str, Any]:
    """1 device attacking across 5 distinct merchants. Current merchant sees 1 normal attempt."""
    dev = f"dev_ring_{idx:04d}"
    ip = f"198.51.100.{(idx * 7) % 250 + 1}"
    target_merch = f"merch_target_{idx:04d}"
    target_acc = f"acc_target_{idx:04d}"
    target_sess = f"sess_drr_target_{idx}"

    # Target merchant sees 1 payment attempt
    current_session = [
        _evt(f"drr_{idx}_e0", "SESSION_STARTED", _ts(_BASE_TIME, 0), target_merch, dev, ip, target_acc, session=target_sess),
        _evt(f"drr_{idx}_e1", "CHECKOUT_VIEWED", _ts(_BASE_TIME, 25), target_merch, dev, ip, target_acc, session=target_sess),
        _evt(f"drr_{idx}_e2", "PAYMENT_ATTEMPTED", _ts(_BASE_TIME, 50), target_merch, dev, ip, target_acc, amount=120.0, session=target_sess),
        _evt(f"drr_{idx}_e3", "PAYMENT_SUCCEEDED", _ts(_BASE_TIME, 55), target_merch, dev, ip, target_acc, amount=120.0, session=target_sess),
    ]

    # Global cross-merchant history on other merchants (4 other merchants with failed attacks)
    history = []
    for m_i in range(1, 5):
        h_merch = f"merch_other_{m_i}_{idx:04d}"
        h_acc = f"acc_victim_{m_i}_{idx:04d}"
        h_sess = f"sess_drr_hist_{m_i}_{idx}"
        h_time = _BASE_TIME - timedelta(hours=m_i * 3)
        history.extend([
            _evt(f"hdrr_{idx}_{m_i}_1", "PAYMENT_ATTEMPTED", _ts(h_time, 0), h_merch, dev, ip, h_acc, amount=round(rng.uniform(50, 200), 2), session=h_sess),
            _evt(f"hdrr_{idx}_{m_i}_2", "PAYMENT_FAILED", _ts(h_time, 5), h_merch, dev, ip, h_acc, session=h_sess),
        ])

    return {
        "scenario_id": f"device_reuse_ring_{idx}",
        "label": LABEL_DEVICE_REUSE_RING,
        "target_merchant_id": target_merch,
        "target_entity_id": dev,
        "current_session": current_session,
        "cross_merchant_history": history,
        "expected_local_action": RecommendedAction.ALLOW,
        "expected_cross_action": RecommendedAction.BLOCK,
    }


def gen_ip_reuse_ring(rng: random.Random, idx: int) -> Dict[str, Any]:
    """1 IP driving card fraud across multiple accounts & merchants."""
    ip = f"203.0.113.{(idx * 11) % 250 + 1}"
    target_merch = f"merch_target_{idx:04d}"
    target_dev = f"dev_target_{idx:04d}"
    target_acc = f"acc_target_{idx:04d}"
    target_sess = f"sess_irr_target_{idx}"

    current_session = [
        _evt(f"irr_{idx}_e0", "SESSION_STARTED", _ts(_BASE_TIME, 0), target_merch, target_dev, ip, target_acc, session=target_sess),
        _evt(f"irr_{idx}_e1", "CHECKOUT_VIEWED", _ts(_BASE_TIME, 30), target_merch, target_dev, ip, target_acc, session=target_sess),
        _evt(f"irr_{idx}_e2", "PAYMENT_ATTEMPTED", _ts(_BASE_TIME, 60), target_merch, target_dev, ip, target_acc, amount=85.0, session=target_sess),
        _evt(f"irr_{idx}_e3", "PAYMENT_SUCCEEDED", _ts(_BASE_TIME, 65), target_merch, target_dev, ip, target_acc, amount=85.0, session=target_sess),
    ]

    history = []
    for m_i in range(1, 6):
        h_merch = f"merch_irr_{m_i}_{idx:04d}"
        h_dev = f"dev_irr_{m_i}_{idx:04d}"
        h_acc = f"acc_irr_{m_i}_{idx:04d}"
        h_sess = f"sess_irr_hist_{m_i}_{idx}"
        h_time = _BASE_TIME - timedelta(hours=m_i * 4)
        history.extend([
            _evt(f"hirr_{idx}_{m_i}_1", "PAYMENT_ATTEMPTED", _ts(h_time, 0), h_merch, h_dev, ip, h_acc, amount=50.0, session=h_sess),
            _evt(f"hirr_{idx}_{m_i}_2", "PAYMENT_FAILED", _ts(h_time, 6), h_merch, h_dev, ip, h_acc, session=h_sess),
        ])

    return {
        "scenario_id": f"ip_reuse_ring_{idx}",
        "label": LABEL_IP_REUSE_RING,
        "target_merchant_id": target_merch,
        "target_entity_id": f"ip_{ip}",
        "current_session": current_session,
        "cross_merchant_history": history,
        "expected_local_action": RecommendedAction.ALLOW,
        "expected_cross_action": RecommendedAction.BLOCK,
    }


def gen_distributed_low_and_slow(rng: random.Random, idx: int) -> Dict[str, Any]:
    """Cross-merchant low-velocity card testing ring."""
    dev = f"dev_dist_{idx:04d}"
    ip = f"198.51.100.{(idx * 13) % 250 + 1}"
    target_merch = f"merch_target_{idx:04d}"
    target_acc = f"acc_dist_{idx:04d}"
    target_sess = f"sess_dist_target_{idx}"

    current_session = [
        _evt(f"dist_{idx}_e0", "SESSION_STARTED", _ts(_BASE_TIME, 0), target_merch, dev, ip, target_acc, session=target_sess),
        _evt(f"dist_{idx}_e1", "CHECKOUT_VIEWED", _ts(_BASE_TIME, 40), target_merch, dev, ip, target_acc, session=target_sess),
        _evt(f"dist_{idx}_e2", "PAYMENT_ATTEMPTED", _ts(_BASE_TIME, 80), target_merch, dev, ip, target_acc, amount=2.50, session=target_sess),
        _evt(f"dist_{idx}_e3", "PAYMENT_FAILED", _ts(_BASE_TIME, 85), target_merch, dev, ip, target_acc, session=target_sess),
    ]

    history = []
    for m_i in range(1, 8):
        h_merch = f"merch_dist_{m_i}_{idx:04d}"
        h_acc = f"acc_dist_{m_i}_{idx:04d}"
        h_sess = f"sess_dist_h_{m_i}_{idx}"
        h_time = _BASE_TIME - timedelta(days=m_i)
        history.extend([
            _evt(f"hdist_{idx}_{m_i}_1", "PAYMENT_ATTEMPTED", _ts(h_time, 0), h_merch, dev, ip, h_acc, amount=round(rng.uniform(1.0, 5.0), 2), session=h_sess),
            _evt(f"hdist_{idx}_{m_i}_2", "PAYMENT_FAILED", _ts(h_time, 5), h_merch, dev, ip, h_acc, session=h_sess),
        ])

    return {
        "scenario_id": f"distributed_low_slow_{idx}",
        "label": LABEL_DISTRIBUTED_LOW_AND_SLOW,
        "target_merchant_id": target_merch,
        "target_entity_id": dev,
        "current_session": current_session,
        "cross_merchant_history": history,
        "expected_local_action": RecommendedAction.ALLOW,
        "expected_cross_action": RecommendedAction.CHALLENGE,
    }


def gen_account_device_rotation(rng: random.Random, idx: int) -> Dict[str, Any]:
    """1 account hopping devices across merchants."""
    acc = f"acc_hop_{idx:04d}"
    curr_dev = f"dev_hop_{idx}_5"
    ip = f"198.51.100.{(idx * 3) % 250 + 1}"
    target_merch = f"merch_target_{idx:04d}"
    target_sess = f"sess_hop_target_{idx}"

    current_session = [
        _evt(f"hop_{idx}_e0", "SESSION_STARTED", _ts(_BASE_TIME, 0), target_merch, curr_dev, ip, acc, session=target_sess),
        _evt(f"hop_{idx}_e1", "CHECKOUT_VIEWED", _ts(_BASE_TIME, 30), target_merch, curr_dev, ip, acc, session=target_sess),
        _evt(f"hop_{idx}_e2", "PAYMENT_ATTEMPTED", _ts(_BASE_TIME, 60), target_merch, curr_dev, ip, acc, amount=200.0, session=target_sess),
        _evt(f"hop_{idx}_e3", "PAYMENT_SUCCEEDED", _ts(_BASE_TIME, 65), target_merch, curr_dev, ip, acc, amount=200.0, session=target_sess),
    ]

    history = []
    for d_i in range(1, 5):
        h_dev = f"dev_hop_{idx}_{d_i}"
        h_merch = f"merch_hop_{d_i}_{idx:04d}"
        h_sess = f"sess_hop_h_{d_i}_{idx}"
        h_time = _BASE_TIME - timedelta(hours=d_i * 6)
        history.extend([
            _evt(f"hhop_{idx}_{d_i}_1", "PAYMENT_ATTEMPTED", _ts(h_time, 0), h_merch, h_dev, ip, acc, amount=150.0, session=h_sess),
            _evt(f"hhop_{idx}_{d_i}_2", "PAYMENT_FAILED", _ts(h_time, 5), h_merch, h_dev, ip, acc, session=h_sess),
        ])

    return {
        "scenario_id": f"account_device_rot_{idx}",
        "label": LABEL_ACCOUNT_DEVICE_ROTATION,
        "target_merchant_id": target_merch,
        "target_entity_id": acc,
        "current_session": current_session,
        "cross_merchant_history": history,
        "expected_local_action": RecommendedAction.ALLOW,
        "expected_cross_action": RecommendedAction.BLOCK,
    }


def gen_merchant_hopping(rng: random.Random, idx: int) -> Dict[str, Any]:
    """Rapid cross-merchant attempts in very short time window (< 1 hour)."""
    dev = f"dev_mhop_{idx:04d}"
    ip = f"198.51.100.{(idx * 5) % 250 + 1}"
    target_merch = f"merch_target_{idx:04d}"
    target_acc = f"acc_mhop_{idx:04d}"
    target_sess = f"sess_mhop_target_{idx}"

    current_session = [
        _evt(f"mhop_{idx}_e0", "SESSION_STARTED", _ts(_BASE_TIME, 0), target_merch, dev, ip, target_acc, session=target_sess),
        _evt(f"mhop_{idx}_e1", "CHECKOUT_VIEWED", _ts(_BASE_TIME, 20), target_merch, dev, ip, target_acc, session=target_sess),
        _evt(f"mhop_{idx}_e2", "PAYMENT_ATTEMPTED", _ts(_BASE_TIME, 40), target_merch, dev, ip, target_acc, amount=300.0, session=target_sess),
        _evt(f"mhop_{idx}_e3", "PAYMENT_FAILED", _ts(_BASE_TIME, 45), target_merch, dev, ip, target_acc, session=target_sess),
    ]

    history = []
    for m_i in range(1, 4):
        h_merch = f"merch_hop_{m_i}_{idx:04d}"
        h_acc = f"acc_mhop_{m_i}_{idx:04d}"
        h_sess = f"sess_mhop_h_{m_i}_{idx}"
        h_time = _BASE_TIME - timedelta(minutes=m_i * 10)
        history.extend([
            _evt(f"hmhop_{idx}_{m_i}_1", "PAYMENT_ATTEMPTED", _ts(h_time, 0), h_merch, dev, ip, h_acc, amount=300.0, session=h_sess),
            _evt(f"hmhop_{idx}_{m_i}_2", "PAYMENT_FAILED", _ts(h_time, 5), h_merch, dev, ip, h_acc, session=h_sess),
        ])

    return {
        "scenario_id": f"merchant_hopping_{idx}",
        "label": LABEL_MERCHANT_HOPPING,
        "target_merchant_id": target_merch,
        "target_entity_id": dev,
        "current_session": current_session,
        "cross_merchant_history": history,
        "expected_local_action": RecommendedAction.ALLOW,
        "expected_cross_action": RecommendedAction.BLOCK,
    }


def gen_mixed_entity_ring(rng: random.Random, idx: int) -> Dict[str, Any]:
    """Coordinated multi-device/multi-IP/multi-merchant ring."""
    dev = f"dev_mixed_{idx:04d}"
    ip = f"198.51.100.{(idx * 17) % 250 + 1}"
    target_merch = f"merch_target_{idx:04d}"
    target_acc = f"acc_mixed_{idx:04d}"
    target_sess = f"sess_mixed_target_{idx}"

    current_session = [
        _evt(f"mix_{idx}_e0", "SESSION_STARTED", _ts(_BASE_TIME, 0), target_merch, dev, ip, target_acc, session=target_sess),
        _evt(f"mix_{idx}_e1", "CHECKOUT_VIEWED", _ts(_BASE_TIME, 35), target_merch, dev, ip, target_acc, session=target_sess),
        _evt(f"mix_{idx}_e2", "PAYMENT_ATTEMPTED", _ts(_BASE_TIME, 70), target_merch, dev, ip, target_acc, amount=99.0, session=target_sess),
        _evt(f"mix_{idx}_e3", "PAYMENT_FAILED", _ts(_BASE_TIME, 75), target_merch, dev, ip, target_acc, session=target_sess),
    ]

    history = []
    for i in range(1, 6):
        h_dev = f"dev_mixed_{idx}_{i}"
        h_ip = f"198.51.100.{(idx * 17 + i) % 250 + 1}"
        h_merch = f"merch_mix_{i}_{idx:04d}"
        h_acc = f"acc_mix_{i}_{idx:04d}"
        h_sess = f"sess_mix_h_{i}_{idx}"
        h_time = _BASE_TIME - timedelta(hours=i * 2)
        history.extend([
            _evt(f"hmix_{idx}_{i}_1", "PAYMENT_ATTEMPTED", _ts(h_time, 0), h_merch, h_dev, h_ip, h_acc, amount=100.0, session=h_sess),
            _evt(f"hmix_{idx}_{i}_2", "PAYMENT_FAILED", _ts(h_time, 5), h_merch, h_dev, h_ip, h_acc, session=h_sess),
        ])

    return {
        "scenario_id": f"mixed_entity_ring_{idx}",
        "label": LABEL_MIXED_ENTITY_RING,
        "target_merchant_id": target_merch,
        "target_entity_id": dev,
        "current_session": current_session,
        "cross_merchant_history": history,
        "expected_local_action": RecommendedAction.ALLOW,
        "expected_cross_action": RecommendedAction.BLOCK,
    }


def gen_legitimate_office_network(rng: random.Random, idx: int) -> Dict[str, Any]:
    """10 legitimate accounts sharing an office IP (0% failures). Safe shared-infrastructure."""
    office_ip = f"192.0.2.{(idx * 2) % 250 + 1}"
    target_merch = f"merch_office_{idx:04d}"
    target_dev = f"dev_emp_target_{idx:04d}"
    target_acc = f"acc_emp_target_{idx:04d}"
    target_sess = f"sess_off_target_{idx}"

    current_session = [
        _evt(f"off_{idx}_e0", "SESSION_STARTED", _ts(_BASE_TIME, 0), target_merch, target_dev, office_ip, target_acc, session=target_sess),
        _evt(f"off_{idx}_e1", "CHECKOUT_VIEWED", _ts(_BASE_TIME, 30), target_merch, target_dev, office_ip, target_acc, session=target_sess),
        _evt(f"off_{idx}_e2", "PAYMENT_ATTEMPTED", _ts(_BASE_TIME, 60), target_merch, target_dev, office_ip, target_acc, amount=45.0, session=target_sess),
        _evt(f"off_{idx}_e3", "PAYMENT_SUCCEEDED", _ts(_BASE_TIME, 65), target_merch, target_dev, office_ip, target_acc, amount=45.0, session=target_sess),
    ]

    history = []
    for emp_i in range(1, 9):
        h_dev = f"dev_emp_{emp_i}_{idx:04d}"
        h_acc = f"acc_emp_{emp_i}_{idx:04d}"
        h_merch = f"merch_emp_{emp_i % 3}_{idx:04d}"
        h_sess = f"sess_off_h_{emp_i}_{idx}"
        h_time = _BASE_TIME - timedelta(hours=emp_i * 4)
        history.extend([
            _evt(f"hoff_{idx}_{emp_i}_1", "PAYMENT_ATTEMPTED", _ts(h_time, 0), h_merch, h_dev, office_ip, h_acc, amount=round(rng.uniform(20, 100), 2), session=h_sess),
            _evt(f"hoff_{idx}_{emp_i}_2", "PAYMENT_SUCCEEDED", _ts(h_time, 5), h_merch, h_dev, office_ip, h_acc, session=h_sess),
        ])

    return {
        "scenario_id": f"legit_office_{idx}",
        "label": LABEL_LEGITIMATE_OFFICE_NETWORK,
        "target_merchant_id": target_merch,
        "target_entity_id": f"ip_{office_ip}",
        "current_session": current_session,
        "cross_merchant_history": history,
        "expected_local_action": RecommendedAction.ALLOW,
        "expected_cross_action": RecommendedAction.ALLOW,
    }


def gen_legitimate_family_device(rng: random.Random, idx: int) -> Dict[str, Any]:
    """3 family members sharing 1 tablet on distinct merchants with successful payments."""
    family_dev = f"dev_family_ipad_{idx:04d}"
    home_ip = f"198.51.100.{(idx * 19) % 250 + 1}"
    target_merch = f"merch_fam_target_{idx:04d}"
    target_acc = f"acc_mom_{idx:04d}"
    target_sess = f"sess_fam_target_{idx}"

    current_session = [
        _evt(f"fam_{idx}_e0", "SESSION_STARTED", _ts(_BASE_TIME, 0), target_merch, family_dev, home_ip, target_acc, session=target_sess),
        _evt(f"fam_{idx}_e1", "CHECKOUT_VIEWED", _ts(_BASE_TIME, 40), target_merch, family_dev, home_ip, target_acc, session=target_sess),
        _evt(f"fam_{idx}_e2", "PAYMENT_ATTEMPTED", _ts(_BASE_TIME, 80), target_merch, family_dev, home_ip, target_acc, amount=75.0, session=target_sess),
        _evt(f"fam_{idx}_e3", "PAYMENT_SUCCEEDED", _ts(_BASE_TIME, 85), target_merch, family_dev, home_ip, target_acc, amount=75.0, session=target_sess),
    ]

    history = []
    family_members = [f"acc_dad_{idx:04d}", f"acc_teen_{idx:04d}"]
    for m_idx, member_acc in enumerate(family_members):
        h_merch = f"merch_fam_{m_idx}_{idx:04d}"
        h_sess = f"sess_fam_h_{m_idx}_{idx}"
        h_time = _BASE_TIME - timedelta(days=m_idx + 1)
        history.extend([
            _evt(f"hfam_{idx}_{m_idx}_1", "PAYMENT_ATTEMPTED", _ts(h_time, 0), h_merch, family_dev, home_ip, member_acc, amount=50.0, session=h_sess),
            _evt(f"hfam_{idx}_{m_idx}_2", "PAYMENT_SUCCEEDED", _ts(h_time, 5), h_merch, family_dev, home_ip, member_acc, session=h_sess),
        ])

    return {
        "scenario_id": f"legit_family_{idx}",
        "label": LABEL_LEGITIMATE_FAMILY_DEVICE,
        "target_merchant_id": target_merch,
        "target_entity_id": family_dev,
        "current_session": current_session,
        "cross_merchant_history": history,
        "expected_local_action": RecommendedAction.ALLOW,
        "expected_cross_action": RecommendedAction.ALLOW,
    }


def gen_legitimate_mobile_network(rng: random.Random, idx: int) -> Dict[str, Any]:
    """Many users sharing mobile carrier CGNAT IP."""
    cgnat_ip = f"100.64.0.{(idx * 23) % 250 + 1}"
    target_merch = f"merch_mob_{idx:04d}"
    target_dev = f"dev_mob_target_{idx:04d}"
    target_acc = f"acc_mob_target_{idx:04d}"
    target_sess = f"sess_mob_target_{idx}"

    current_session = [
        _evt(f"mob_{idx}_e0", "SESSION_STARTED", _ts(_BASE_TIME, 0), target_merch, target_dev, cgnat_ip, target_acc, session=target_sess),
        _evt(f"mob_{idx}_e1", "CHECKOUT_VIEWED", _ts(_BASE_TIME, 30), target_merch, target_dev, cgnat_ip, target_acc, session=target_sess),
        _evt(f"mob_{idx}_e2", "PAYMENT_ATTEMPTED", _ts(_BASE_TIME, 60), target_merch, target_dev, cgnat_ip, target_acc, amount=30.0, session=target_sess),
        _evt(f"mob_{idx}_e3", "PAYMENT_SUCCEEDED", _ts(_BASE_TIME, 65), target_merch, target_dev, cgnat_ip, target_acc, amount=30.0, session=target_sess),
    ]

    history = []
    for user_i in range(1, 12):
        h_dev = f"dev_mob_{user_i}_{idx:04d}"
        h_acc = f"acc_mob_{user_i}_{idx:04d}"
        h_merch = f"merch_mob_{user_i % 4}_{idx:04d}"
        h_sess = f"sess_mob_h_{user_i}_{idx}"
        h_time = _BASE_TIME - timedelta(hours=user_i * 2)
        history.extend([
            _evt(f"hmob_{idx}_{user_i}_1", "PAYMENT_ATTEMPTED", _ts(h_time, 0), h_merch, h_dev, cgnat_ip, h_acc, amount=round(rng.uniform(15, 60), 2), session=h_sess),
            _evt(f"hmob_{idx}_{user_i}_2", "PAYMENT_SUCCEEDED", _ts(h_time, 5), h_merch, h_dev, cgnat_ip, h_acc, session=h_sess),
        ])

    return {
        "scenario_id": f"legit_mobile_{idx}",
        "label": LABEL_LEGITIMATE_MOBILE_NETWORK,
        "target_merchant_id": target_merch,
        "target_entity_id": f"ip_{cgnat_ip}",
        "current_session": current_session,
        "cross_merchant_history": history,
        "expected_local_action": RecommendedAction.ALLOW,
        "expected_cross_action": RecommendedAction.ALLOW,
    }


def gen_isolated_normal_user(rng: random.Random, idx: int) -> Dict[str, Any]:
    """Standard single-merchant benign user."""
    dev = f"dev_iso_{idx:04d}"
    ip = f"198.51.100.{(idx * 29) % 250 + 1}"
    merch = f"merch_iso_{idx:04d}"
    acc = f"acc_iso_{idx:04d}"
    sess = f"sess_iso_target_{idx}"

    current_session = [
        _evt(f"iso_{idx}_e0", "SESSION_STARTED", _ts(_BASE_TIME, 0), merch, dev, ip, acc, session=sess),
        _evt(f"iso_{idx}_e1", "CHECKOUT_VIEWED", _ts(_BASE_TIME, 45), merch, dev, ip, acc, session=sess),
        _evt(f"iso_{idx}_e2", "PAYMENT_ATTEMPTED", _ts(_BASE_TIME, 90), merch, dev, ip, acc, amount=150.0, session=sess),
        _evt(f"iso_{idx}_e3", "PAYMENT_SUCCEEDED", _ts(_BASE_TIME, 95), merch, dev, ip, acc, amount=150.0, session=sess),
    ]

    return {
        "scenario_id": f"isolated_normal_{idx}",
        "label": LABEL_ISOLATED_NORMAL_USER,
        "target_merchant_id": merch,
        "target_entity_id": acc,
        "current_session": current_session,
        "cross_merchant_history": [],
        "expected_local_action": RecommendedAction.ALLOW,
        "expected_cross_action": RecommendedAction.ALLOW,
    }



SCENARIO_GENERATORS = [
    gen_device_reuse_ring,
    gen_ip_reuse_ring,
    gen_distributed_low_and_slow,
    gen_account_device_rotation,
    gen_merchant_hopping,
    gen_mixed_entity_ring,
    gen_legitimate_office_network,
    gen_legitimate_family_device,
    gen_legitimate_mobile_network,
    gen_isolated_normal_user,
]


def generate_cross_merchant_dataset(
    total_samples: int = 500,
    seed: int = 42,
) -> List[Dict[str, Any]]:
    """Generate deterministic cross-merchant dataset across all 10 scenarios."""
    rng = random.Random(seed)
    dataset: List[Dict[str, Any]] = []
    n_gens = len(SCENARIO_GENERATORS)

    for i in range(total_samples):
        gen_fn = SCENARIO_GENERATORS[i % n_gens]
        sample = gen_fn(rng, i // n_gens)
        dataset.append(sample)

    return dataset
