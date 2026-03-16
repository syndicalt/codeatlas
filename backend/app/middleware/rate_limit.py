"""Rate limiting middleware using SlowAPI with in-memory storage."""

from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request


def _key_func(request: Request) -> str:
    """Extract client IP for rate limiting."""
    return get_remote_address(request) or "unknown"


limiter = Limiter(key_func=_key_func)
