"""Tests for the synthetic payment-event generator."""

import random

import pytest

from app.synthetic.generator import (
    LABEL_CARD_TESTING,
    LABEL_NORMAL,
    LABEL_SHARED_DEVICE,
    generate_dataset,
    gen_normal_user,
    gen_card_testing_a,
)


class TestReproducibility:
    def test_same_seed_same_output(self):
        d1 = generate_dataset(sessions=26, seed=99)
        d2 = generate_dataset(sessions=26, seed=99)
        assert len(d1) == len(d2)
        for s1, s2 in zip(d1, d2):
            assert s1["scenario"] == s2["scenario"]
            assert len(s1["events"]) == len(s2["events"])
            for e1, e2 in zip(s1["events"], s2["events"]):
                assert e1["event_id"] == e2["event_id"]
                assert e1["timestamp"] == e2["timestamp"]

    def test_different_seed_different_output(self):
        d1 = generate_dataset(sessions=26, seed=1)
        d2 = generate_dataset(sessions=26, seed=2)
        # At least some sessions should differ
        differ = any(
            s1["scenario"] != s2["scenario"]
            for s1, s2 in zip(d1, d2)
        )
        assert differ


class TestScenarioCoverage:
    def test_all_scenarios_present(self):
        d = generate_dataset(sessions=130, seed=42)
        scenarios = set(s["scenario"] for s in d)
        assert "NORMAL" in scenarios
        assert "CARD_TESTING_A" in scenarios
        assert "CARD_TESTING_B" in scenarios
        assert "CARD_TESTING_C" in scenarios
        assert "CARD_TESTING_D" in scenarios
        assert "CARD_TESTING_E" in scenarios
        assert "LOW_AND_SLOW_AUTOMATION" in scenarios
        assert "ACCOUNT_TAKEOVER_LIKE" in scenarios
        assert "AUTOMATED_CHECKOUT" in scenarios
        assert "LEGITIMATE_SHARED_DEVICE" in scenarios
        assert "LEGITIMATE_SHARED_IP" in scenarios
        assert "LEGITIMATE_RETRY_BEHAVIOR" in scenarios
        assert "DISTRIBUTED_SUSPICIOUS_BEHAVIOR" in scenarios


class TestEventValidity:
    def test_events_have_required_fields(self):
        events, _, _, _ = gen_normal_user(random.Random(42), 0)
        for ev in events:
            assert "event_id" in ev
            assert "event_type" in ev
            assert "timestamp" in ev
            assert "device_hash" in ev
            assert "ip_address" in ev

    def test_card_testing_has_many_events(self):
        events, label, action, _ = gen_card_testing_a(random.Random(42), 0)
        assert label == LABEL_CARD_TESTING
        assert action == "BLOCK"
        assert len(events) > 10

    def test_no_raw_pan_in_events(self):
        """Events must never contain raw PAN data."""
        d = generate_dataset(sessions=26, seed=42)
        for sample in d:
            for ev in sample["events"]:
                # Check no field looks like a card number
                for key, val in ev.items():
                    if isinstance(val, str) and len(val) >= 13:
                        assert not val.isdigit(), f"Possible raw PAN in {key}: {val}"


class TestGroundTruth:
    def test_labels_are_valid(self):
        d = generate_dataset(sessions=130, seed=42)
        valid_labels = {
            "NORMAL", "CARD_TESTING", "LOW_AND_SLOW_AUTOMATION",
            "ACCOUNT_TAKEOVER_LIKE", "AUTOMATED_CHECKOUT",
            "LEGITIMATE_SHARED_DEVICE", "LEGITIMATE_SHARED_IP",
            "LEGITIMATE_RETRY_BEHAVIOR", "DISTRIBUTED_SUSPICIOUS_BEHAVIOR",
        }
        for sample in d:
            assert sample["label"] in valid_labels, f"Unknown label: {sample['label']}"

    def test_actions_are_valid(self):
        d = generate_dataset(sessions=130, seed=42)
        for sample in d:
            assert sample["expected_action"] in ("ALLOW", "CHALLENGE", "BLOCK")
