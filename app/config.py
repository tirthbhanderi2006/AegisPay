import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


def _str(name: str, default: str) -> str:
    value = os.getenv(name)
    return value if value not in (None, "") else default


def _float(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, ""))
    except ValueError:
        return default


def _int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, ""))
    except ValueError:
        return default


@dataclass(frozen=True)
class Settings:
    groq_api_key: str
    model_name: str
    llm_max_tokens: int
    max_audit_iterations: int
    dispute_fee_usd: float
    cost_to_fight_usd: float
    database_url: str


settings = Settings(
    groq_api_key=_str("GROQ_API_KEY", ""),
    model_name=_str("AEGIS_MODEL_NAME", "openai/gpt-oss-120b"),
    llm_max_tokens=_int("AEGIS_LLM_MAX_TOKENS", 2048),
    max_audit_iterations=_int("AEGIS_MAX_AUDIT_ITERATIONS", 2),
    dispute_fee_usd=_float("AEGIS_DISPUTE_FEE_USD", 15.00),
    cost_to_fight_usd=_float("AEGIS_COST_TO_FIGHT_USD", 50.00),
    database_url=_str("AEGIS_DATABASE_URL", "postgresql://aegis:aegis@localhost:5432/aegispay"),
)
