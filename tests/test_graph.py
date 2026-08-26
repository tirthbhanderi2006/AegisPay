from app.graph import workflow as wf


def _fake_draft(state):
    dossier = {
        "executive_summary": "Test draft.",
        "dispute_classification": "Visa CE3.0 Qualified — Card-Absent Fraud Claim",
        "compelling_evidence_type": "Visa CE3.0",
        "evidence_points": [],
        "rebuttal_narrative": "x" * 250,
    }
    return {"dossier": dossier, "draft_llm_failed": False}


def _fake_audit_factory(passed: bool):
    def fake_audit(state):
        iterations = state.get("iterations", 0) + 1
        record = {
            "passed": passed,
            "confidence_score": 0.9 if passed else 0.2,
            "deficiencies": [] if passed else ["Evidence chain does not satisfy CE3.0 identifier matching."],
            "suggested_revisions": [] if passed else ["Cite only telemetry-backed evidence."],
            "iteration": iterations,
            "auditor_llm_failed": False,
        }
        return {
            "audit": record,
            "audit_history": list(state.get("audit_history", [])) + [record],
            "iterations": iterations,
        }

    return fake_audit


def _fake_notice(state):
    return {
        "notice": {
            "notice_title": "Dispute auto-settled",
            "notice_body": "Expected-value analysis favored settlement.",
            "improvement_tip": "Enable 3-D Secure on checkout.",
            "notice_llm_failed": False,
        }
    }


def test_strong_fixture_fights_and_passes_audit(strong_event, monkeypatch):
    monkeypatch.setattr(wf, "run_draft", _fake_draft)
    monkeypatch.setattr(wf, "run_audit", _fake_audit_factory(passed=True))
    final_state = wf.workflow.invoke(wf.build_initial_state(strong_event))
    assert final_state["decision"] == "fight"
    assert final_state["claim_type"] == "FRAUD_UNRECOGNIZED"
    assert final_state["classification_source"] == "static_table"
    assert final_state["rule_result"]["ce3_qualified"] is True
    assert final_state["final_status"] == wf.FINAL_FOUGHT
    assert final_state["iterations"] == 1
    result = wf.serialize_result(final_state)
    assert result["dossier"] is not None
    assert len(result["audit_trail"]) == 1
    assert result["persisted"] is False


def test_weak_fixture_auto_settles_with_notice(weak_event, monkeypatch):
    monkeypatch.setattr(wf, "run_auto_settlement_notice", _fake_notice)
    final_state = wf.workflow.invoke(wf.build_initial_state(weak_event))
    assert final_state["decision"] == "settle"
    assert final_state["rule_result"]["ce3_qualified"] is False
    assert final_state["win_probability"] < 0.4
    assert final_state["final_status"] == wf.FINAL_SETTLED
    assert final_state["notice"]["improvement_tip"]
    assert final_state["dossier"] is None


def test_unknown_reason_code_escalates_via_llm_fallback(unknown_code_event, monkeypatch):
    calls = []

    def fake_classify(network, reason_code, reason_code_description):
        calls.append(reason_code)
        from app.models.dispute import ClaimType
        from app.models.outputs import ClaimClassification

        return ClaimClassification(
            claim_type=ClaimType.UNKNOWN_REQUIRES_HUMAN_REVIEW,
            confidence=0.95,
            reasoning="Unmapped pilot code.",
        )

    monkeypatch.setattr(wf, "classify_reason_code", fake_classify)
    final_state = wf.workflow.invoke(wf.build_initial_state(unknown_code_event))
    assert calls == ["99.99"]
    assert final_state["classification_source"] == "llm_fallback"
    assert final_state["needs_human_review"] is True
    assert final_state["decision"] == "escalate"
    assert final_state["final_status"] == wf.FINAL_ESCALATED_HUMAN


def test_audit_circuit_breaker_escalates_after_max_iterations(strong_event, monkeypatch):
    monkeypatch.setattr(wf, "run_draft", _fake_draft)
    monkeypatch.setattr(wf, "run_audit", _fake_audit_factory(passed=False))
    final_state = wf.workflow.invoke(wf.build_initial_state(strong_event))
    assert final_state["decision"] == "fight"
    assert final_state["iterations"] == final_state["max_iterations"] == 2
    assert final_state["final_status"] == wf.FINAL_ESCALATED_ITERATIONS
    assert len(final_state["audit_history"]) == final_state["iterations"]


def test_serialize_result_contains_contract_keys(weak_event, monkeypatch):
    monkeypatch.setattr(wf, "run_auto_settlement_notice", _fake_notice)
    final_state = wf.workflow.invoke(wf.build_initial_state(weak_event))
    result = wf.serialize_result(final_state, persisted=True)
    expected_keys = {
        "dispute_id",
        "network",
        "reason_code",
        "claim_type",
        "classification_source",
        "decision",
        "final_status",
        "iterations_used",
        "max_iterations",
        "win_probability",
        "expected_value_fight",
        "expected_value_settle",
        "primary_gap",
        "rule_engine",
        "dossier",
        "audit_trail",
        "notice",
        "persisted",
    }
    assert expected_keys.issubset(result.keys())
