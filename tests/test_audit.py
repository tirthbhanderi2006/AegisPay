"""Unit tests for Phase 4 Decision Audit Snapshots."""

import pytest
from app.audit.models import RiskDecisionSnapshot
from app.audit.repository import DecisionSnapshotRepository
from app.models.firewall import RecommendedAction


class TestAuditSnapshotModelAndPrivacy:
    def test_snapshot_decision_hash_determinism(self):
        s1 = RiskDecisionSnapshot(
            transaction_id="txn_1", session_id="sess_1", merchant_id="m1",
            timestamp="2026-07-20T10:00:00Z",
            feature_values={"velocity": 0.5, "retry": 0.2},
            feature_contributions={"velocity": 0.125, "retry": 0.04},
            calibration_version="cal-v1", calibration_hash="hash123",
            threshold_version="thresh-v1", fx_rate_version="identity",
            evidence_quality=0.85, final_score=0.45, final_action=RecommendedAction.CHALLENGE,
        )
        s2 = RiskDecisionSnapshot(
            transaction_id="txn_1", session_id="sess_1", merchant_id="m1",
            timestamp="2026-07-20T10:00:00Z",
            feature_values={"retry": 0.2, "velocity": 0.5},
            feature_contributions={"retry": 0.04, "velocity": 0.125},
            calibration_version="cal-v1", calibration_hash="hash123",
            threshold_version="thresh-v1", fx_rate_version="identity",
            evidence_quality=0.85, final_score=0.45, final_action=RecommendedAction.CHALLENGE,
        )
        assert s1.decision_hash == s2.decision_hash

    def test_audit_dict_sanitization_privacy_boundaries(self):
        s = RiskDecisionSnapshot(
            transaction_id="txn_priv_1", session_id="sess_priv", merchant_id="merch_victim_99",
            timestamp="2026-07-20T10:00:00Z",
            feature_values={"velocity": 0.8},
            feature_contributions={"velocity": 0.2},
            calibration_version="cal-v1", calibration_hash="full_secret_hash_value_12345",
            threshold_version="thresh-v1", fx_rate_version="identity",
            evidence_quality=0.90, final_score=0.85, final_action=RecommendedAction.BLOCK,
        )
        audit_dict = s.to_audit_dict()
        assert audit_dict["decision"] == "BLOCK"
        assert audit_dict["total_risk_score"] == 0.85
        assert "privacy_notice" in audit_dict

    def test_audit_repository_in_memory_crud(self):
        repo = DecisionSnapshotRepository()
        s = RiskDecisionSnapshot(
            transaction_id="txn_crud", session_id="sess_c", merchant_id="m_c",
            timestamp="2026-07-20T10:00:00Z",
            feature_values={"velocity": 0.1}, feature_contributions={"velocity": 0.025},
            calibration_version="cal-v1", calibration_hash="h1",
            threshold_version="thresh-v1", fx_rate_version="identity",
            evidence_quality=0.5, final_score=0.1, final_action=RecommendedAction.ALLOW,
        )
        repo.save_snapshot(s)
        assert repo.get_snapshot("txn_crud") is not None
        assert repo.get_snapshot("txn_crud").final_action == RecommendedAction.ALLOW
