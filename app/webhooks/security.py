"""Webhook cryptographic security and replay-window validation."""

from datetime import datetime, timezone
import hashlib
import hmac
import json
import time
from typing import Any, Dict, Optional, Tuple

from app.utils.timeutil import parse_iso8601


def generate_webhook_signature(secret: str, timestamp: str, payload: Any) -> str:
    """Generate HMAC-SHA256 signature for webhook payload.

    Signature formula: hex(HMAC_SHA256(secret, timestamp + "." + canonical_json(payload)))
    """
    if isinstance(payload, dict):
        raw_body = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    elif hasattr(payload, "model_dump"):
        raw_body = json.dumps(payload.model_dump(), sort_keys=True, separators=(",", ":"))
    else:
        raw_body = str(payload)

    message = f"{timestamp}.{raw_body}".encode("utf-8")
    sig = hmac.new(secret.encode("utf-8"), message, hashlib.sha256).hexdigest()
    return f"t={timestamp},v1={sig}"


def verify_webhook_signature(
    secret: str,
    signature_header: str,
    raw_body: str,
    max_drift_seconds: int = 300,
    as_of_now: Optional[float] = None,
) -> Tuple[bool, str]:
    """Verify inbound webhook HMAC signature and enforce 5-minute replay-window validation.

    Returns (is_valid, error_reason).
    """
    if not signature_header:
        return False, "Missing signature header"

    parts = dict(item.split("=", 1) for item in signature_header.split(",") if "=" in item)
    ts_str = parts.get("t")
    received_sig = parts.get("v1")

    if not ts_str or not received_sig:
        return False, "Malformed signature header format"

    # Replay-window validation
    try:
        # Check if unix timestamp or ISO string
        if ts_str.isdigit():
            ts_val = float(ts_str)
        else:
            parsed = parse_iso8601(ts_str)
            ts_val = parsed.timestamp() if parsed else 0.0

        current_ts = as_of_now if as_of_now is not None else time.time()
        if abs(current_ts - ts_val) > max_drift_seconds:
            return False, f"Timestamp drift ({abs(current_ts - ts_val):.1f}s) exceeds {max_drift_seconds}s replay window"
    except Exception as e:
        return False, f"Invalid timestamp format: {e}"

    # Verify HMAC
    message = f"{ts_str}.{raw_body}".encode("utf-8")
    expected_sig = hmac.new(secret.encode("utf-8"), message, hashlib.sha256).hexdigest()

    if not hmac.compare_digest(received_sig, expected_sig):
        return False, "Signature mismatch"

    return True, "Valid"
