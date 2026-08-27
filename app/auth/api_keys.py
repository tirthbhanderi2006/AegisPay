"""API key hashing and generation utilities."""

import hashlib
import secrets
from typing import Tuple


def hash_api_key(raw_key: str) -> str:
    """Hash raw API key using SHA-256 for secure storage."""
    return hashlib.sha256(raw_key.strip().encode("utf-8")).hexdigest()


def generate_api_key(prefix: str = "ak_live") -> Tuple[str, str, str]:
    """Generate a secure new API key, returning (key_id, raw_key, key_hash).

    The raw_key should only ever be displayed once to the merchant.
    """
    key_id = f"key_{secrets.token_hex(8)}"
    random_bytes = secrets.token_urlsafe(32)
    raw_key = f"{prefix}_{random_bytes}"
    key_hash = hash_api_key(raw_key)
    return key_id, raw_key, key_hash
