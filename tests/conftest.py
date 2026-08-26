import json
from pathlib import Path

import pytest

from app.models.dispute import DisputeEvent

ROOT = Path(__file__).resolve().parents[1]
FIXTURES = ROOT / "data" / "fixtures"


def load_fixture(name: str) -> dict:
    with open(FIXTURES / name, "r", encoding="utf-8") as handle:
        return json.load(handle)


@pytest.fixture
def strong_event() -> DisputeEvent:
    return DisputeEvent.model_validate(load_fixture("visa_ce3_qualified.json"))


@pytest.fixture
def weak_event() -> DisputeEvent:
    return DisputeEvent.model_validate(load_fixture("visa_weak_no_match.json"))


@pytest.fixture
def unknown_code_event() -> DisputeEvent:
    return DisputeEvent.model_validate(load_fixture("mastercard_unknown_code.json"))
