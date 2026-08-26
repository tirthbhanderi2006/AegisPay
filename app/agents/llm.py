import json
import logging
import re
import time
from typing import Optional, Type, TypeVar

from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, ValidationError

from app.config import settings

logger = logging.getLogger(__name__)

_FENCE_RE = re.compile(r"^```(?:json)?\s*(.*?)\s*```\s*$", re.DOTALL)
_RATE_LIMIT_HINT_RE = re.compile(r"try again in ([\d.]+)s", re.IGNORECASE)

MAX_RATE_LIMIT_ATTEMPTS = 6

T = TypeVar("T", bound=BaseModel)

_llm = None


def get_llm():
    global _llm
    if _llm is None:
        from langchain_groq import ChatGroq

        _llm = ChatGroq(
            model=settings.model_name,
            temperature=0,
            api_key=settings.groq_api_key,
            max_tokens=settings.llm_max_tokens,
            model_kwargs={"response_format": {"type": "json_object"}},
        )
    return _llm


def _is_rate_limit_error(exc: Exception) -> bool:
    name = type(exc).__name__
    text = str(exc)
    return "RateLimitError" in name or "rate_limit_exceeded" in text or "Error code: 429" in text


def invoke_with_rate_limit_retry(messages):
    llm = get_llm()
    last_exc = None
    for attempt in range(1, MAX_RATE_LIMIT_ATTEMPTS + 1):
        try:
            return llm.invoke(messages)
        except Exception as exc:
            if not _is_rate_limit_error(exc):
                raise
            last_exc = exc
            hint = _RATE_LIMIT_HINT_RE.search(str(exc))
            if hint:
                delay = min(float(hint.group(1)) + 1.0, 60.0)
            else:
                delay = min(2.0 * (2 ** (attempt - 1)), 30.0)
            logger.warning(
                "Groq rate limit hit (attempt %d/%d); retrying in %.1fs", attempt, MAX_RATE_LIMIT_ATTEMPTS, delay
            )
            time.sleep(delay)
    raise last_exc


def strip_json_fences(text: str) -> str:
    cleaned = text.strip()
    match = _FENCE_RE.match(cleaned)
    if match:
        return match.group(1).strip()
    return cleaned


def balance_json_text(text: str) -> Optional[str]:
    stack = []
    in_string = False
    escape = False
    for index, ch in enumerate(text):
        if in_string:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == '"':
                in_string = False
            continue
        if ch == '"':
            in_string = True
        elif ch in "{[":
            stack.append(ch)
        elif ch in "}]":
            expected = "{" if ch == "}" else "["
            if not stack or stack[-1] != expected:
                truncated = text[:index].rstrip().rstrip(",")
                closers = "".join("}" if s == "{" else "]" for s in reversed(stack))
                return truncated + closers
            stack.pop()
    if stack or in_string:
        candidate = text.rstrip().rstrip(",")
        if in_string:
            candidate += '"'
        closers = "".join("}" if s == "{" else "]" for s in reversed(stack))
        return candidate + closers
    return text


def extract_json_object(text: str) -> Optional[dict]:
    candidates = [text]
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end > start:
        candidates.append(text[start : end + 1])
    balanced = balance_json_text(text.strip())
    if balanced is not None and balanced != text.strip():
        candidates.append(balanced)
    for candidate in candidates:
        try:
            parsed = json.loads(candidate)
            if isinstance(parsed, dict):
                return parsed
        except (json.JSONDecodeError, TypeError):
            continue
    return None


def _extract_failed_generation(exc: Exception) -> Optional[str]:
    body = getattr(exc, "body", None)
    if isinstance(body, dict):
        error = body.get("error")
        if isinstance(error, dict):
            failed = error.get("failed_generation")
            if isinstance(failed, str):
                return failed
    match = re.search(r"'failed_generation':\s*'(.*)'\s*}\s*$", str(exc), re.DOTALL)
    if match:
        return match.group(1)
    return None


def invoke_structured(system_prompt: str, user_prompt: str, schema: Type[T]) -> Optional[T]:

    def _call(prompt: str):
        try:
            response = invoke_with_rate_limit_retry(
                [SystemMessage(content=system_prompt), HumanMessage(content=prompt)]
            )
        except Exception as exc:
            if _is_rate_limit_error(exc):
                raise
            logger.warning("LLM call failed (%s): %s", type(exc).__name__, exc)
            salvaged = _extract_failed_generation(exc)
            if salvaged:
                data = extract_json_object(strip_json_fences(salvaged))
                if data is not None:
                    logger.info("Salvaged valid JSON from Groq failed_generation payload.")
                    return data, salvaged
            return None, ""
        raw = response.content if isinstance(response.content, str) else str(response.content)
        data = extract_json_object(strip_json_fences(raw))
        if data is None and "```" in raw:
            data = extract_json_object(raw)
        return data, raw

    data, raw = _call(user_prompt)
    if data is None:
        logger.warning("LLM returned non-JSON output; attempting one repair retry.")
        repair_prompt = (
            user_prompt
            + "\n\nYour previous reply was not valid JSON:\n"
            + raw[:4000]
            + "\nReturn ONLY corrected valid JSON matching the requested schema, with no markdown fences or commentary."
        )
        data, _ = _call(repair_prompt)
    if data is None:
        return None
    try:
        return schema.model_validate(data)
    except ValidationError as exc:
        logger.warning("LLM JSON failed schema validation: %s", exc.errors()[:3])
        return None
