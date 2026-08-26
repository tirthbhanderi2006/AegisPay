import re
from typing import Any

SENSITIVE_KEYS = {
    "card_number",
    "pan",
    "cvv",
    "customer_email",
    "email",
    "customer_name",
    "name",
    "phone",
    "phone_number",
}

_EMAIL_RE = re.compile(r"^(?P<local>[^@]+)@(?P<domain>.+)$")


def _mask_value(key: str, value: Any) -> Any:
    if not isinstance(value, str) or not value:
        return "***MASKED***"
    lowered = key.lower()
    if "@" in value and _EMAIL_RE.match(value):
        match = _EMAIL_RE.match(value)
        local = match.group("local")
        domain = match.group("domain")
        return f"{local[0]}***@{domain}"
    if "name" in lowered:
        return f"{value.strip()[0]}***"
    return "***MASKED***"


def mask_record(data: Any) -> Any:
    if isinstance(data, dict):
        masked = {}
        for key, value in data.items():
            if isinstance(key, str) and key.lower() in SENSITIVE_KEYS and value is not None:
                masked[key] = _mask_value(key, value)
            else:
                masked[key] = mask_record(value)
        return masked
    if isinstance(data, list):
        return [mask_record(item) for item in data]
    return data
