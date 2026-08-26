import pytest

from app.agents.llm import (
    _extract_failed_generation,
    balance_json_text,
    extract_json_object,
)


class FakeGroqJsonError(Exception):
    body = {
        "error": {
            "message": "Failed to generate JSON.",
            "code": "json_validate_failed",
            "failed_generation": '{"executive_summary": "x"}',
        }
    }


def test_valid_json_passes_through():
    assert extract_json_object('{"a": 1}') == {"a": 1}


def test_fenced_and_embedded_json_extracted():
    assert extract_json_object('```json\n{"a": 2}\n```') == {"a": 2}
    assert extract_json_object('prefix {"a": 3} suffix') == {"a": 3}


def test_missing_array_closer_with_stray_brace_is_balanced():
    bad = (
        '{\n'
        '  "executive_summary": "ok",\n'
        '  "evidence_points": [\n'
        '    {"category": "History", "rule_mapping": "Visa CE3.0 - History Consistency"}\n'
        '    }}'
    )
    parsed = extract_json_object(bad)
    assert parsed is not None
    assert parsed["executive_summary"] == "ok"
    assert len(parsed["evidence_points"]) == 1


def test_truncated_string_value_is_closed():
    parsed = extract_json_object('{"a": "value that got cut')
    assert parsed == {"a": "value that got cut"}


def test_unrecoverable_text_returns_none():
    assert extract_json_object("no json here at all") is None


def test_balance_returns_original_when_already_closed():
    text = '{"a": [1, 2]}'
    assert balance_json_text(text) == text


def test_failed_generation_extracted_from_error_body():
    raw = _extract_failed_generation(FakeGroqJsonError())
    assert raw == '{"executive_summary": "x"}'
    assert extract_json_object(raw) == {"executive_summary": "x"}


@pytest.mark.parametrize(
    "text",
    [
        '{"a": "unclosed',
        '{"a": [1, 2',
        '{"a": {"b": [true, false]',
    ],
)
def test_various_truncations_produce_parseable_output(text):
    balanced = balance_json_text(text)
    parsed = extract_json_object(balanced if balanced != text else text)
    assert isinstance(parsed, dict)
