"""FastAPI dependencies for authentication."""

from __future__ import annotations

from fastapi import Header, HTTPException

from app.services.auth import decode_jwt
from app.services.database import get_user_by_id


async def get_current_user(authorization: str | None = Header(default=None)) -> dict | None:
    """Return the current user or None for guests. Does not raise."""
    if not authorization:
        return None
    # Accept "Bearer <token>" format
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        return None
    payload = decode_jwt(token)
    if not payload:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    return await get_user_by_id(user_id)


async def require_auth(authorization: str | None = Header(default=None)) -> dict:
    """Return the current user or raise 401."""
    user = await get_current_user(authorization)
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user
