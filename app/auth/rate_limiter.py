"""Deterministic in-memory token-bucket / sliding-window rate limiter."""

from collections import defaultdict
import time
from typing import Dict, List, Tuple


class RateLimiter:
    """Sliding-window in-memory rate limiter per key/merchant."""

    def __init__(self, default_rpm: int = 1000) -> None:
        self.default_rpm = default_rpm
        self._history: Dict[str, List[float]] = defaultdict(list)

    def is_allowed(self, identifier: str, limit_rpm: int = 1000, as_of_ts: float = None) -> Tuple[bool, int, float]:
        """Check if request is allowed under rate limit.

        Returns (is_allowed, remaining_requests, reset_after_seconds).
        """
        now = as_of_ts if as_of_ts is not None else time.time()
        window_start = now - 60.0

        # Prune old timestamps
        current_hits = [t for t in self._history[identifier] if t > window_start]
        self._history[identifier] = current_hits

        limit = limit_rpm if limit_rpm > 0 else self.default_rpm

        if len(current_hits) >= limit:
            oldest_hit = current_hits[0]
            reset_after = max(0.1, round(60.0 - (now - oldest_hit), 2))
            return False, 0, reset_after

        self._history[identifier].append(now)
        remaining = max(0, limit - len(self._history[identifier]))
        return True, remaining, 60.0

    def reset(self) -> None:
        """Clear all rate limit histories (for tests)."""
        self._history.clear()


# Global rate limiter instance
rate_limiter = RateLimiter()
