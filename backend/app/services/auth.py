"""JWT creation/decoding and OAuth code exchange for GitHub + Google."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import httpx
import jwt

from app.config import settings


# --- JWT ---

def create_jwt(user_id: str) -> str:
    """Create a signed JWT for the given user ID."""
    payload = {
        "sub": user_id,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=settings.jwt_expiry_hours),
    }
    return jwt.encode(payload, settings.get_jwt_secret(), algorithm="HS256")


def decode_jwt(token: str) -> dict | None:
    """Decode and verify a JWT. Returns the payload dict or None on failure."""
    try:
        return jwt.decode(token, settings.get_jwt_secret(), algorithms=["HS256"])
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


# --- GitHub OAuth ---

GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_URL = "https://api.github.com/user"
GITHUB_EMAILS_URL = "https://api.github.com/user/emails"


def github_redirect_url() -> str:
    """Build the GitHub OAuth redirect URL."""
    params = urlencode({
        "client_id": settings.github_client_id,
        "redirect_uri": f"{settings.frontend_url}/auth/callback",
        "scope": "read:user user:email repo",
        "state": "github",
    })
    return f"{GITHUB_AUTH_URL}?{params}"


async def github_exchange_code(code: str) -> dict:
    """Exchange a GitHub OAuth code for user info.

    Returns dict with keys: id, email, name, avatar_url, provider, provider_id.
    """
    callback = f"{settings.frontend_url}/auth/callback"
    async with httpx.AsyncClient() as client:
        # Exchange code for access token
        token_resp = await client.post(
            GITHUB_TOKEN_URL,
            data={
                "client_id": settings.github_client_id,
                "client_secret": settings.github_client_secret,
                "code": code,
                "redirect_uri": callback,
            },
            headers={"Accept": "application/json"},
        )
        token_data = token_resp.json()
        if token_resp.status_code != 200:
            error = token_data.get("error", "unknown_error")
            desc = token_data.get("error_description", token_resp.text)
            raise ValueError(f"GitHub token exchange failed: {error} - {desc}")
        access_token = token_data.get("access_token")
        if not access_token:
            raise ValueError(token_data.get("error_description", "No access_token in GitHub response"))

        headers = {"Authorization": f"Bearer {access_token}", "Accept": "application/json"}

        # Get user profile
        user_resp = await client.get(GITHUB_USER_URL, headers=headers)
        user_resp.raise_for_status()
        user_data = user_resp.json()

        # Get primary email
        email = user_data.get("email") or ""
        if not email:
            emails_resp = await client.get(GITHUB_EMAILS_URL, headers=headers)
            if emails_resp.status_code == 200:
                for e in emails_resp.json():
                    if e.get("primary"):
                        email = e["email"]
                        break

        return {
            "id": str(uuid.uuid4()),
            "email": email,
            "name": user_data.get("name") or user_data.get("login", ""),
            "avatar_url": user_data.get("avatar_url", ""),
            "provider": "github",
            "provider_id": str(user_data["id"]),
            "access_token": access_token,
        }


# --- Google OAuth ---

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"


def google_redirect_url() -> str:
    """Build the Google OAuth redirect URL."""
    params = urlencode({
        "client_id": settings.google_client_id,
        "redirect_uri": f"{settings.frontend_url}/auth/callback",
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "state": "google",
    })
    return f"{GOOGLE_AUTH_URL}?{params}"


async def google_exchange_code(code: str) -> dict:
    """Exchange a Google OAuth code for user info.

    Returns dict with keys: id, email, name, avatar_url, provider, provider_id.
    """
    callback = f"{settings.frontend_url}/auth/callback"
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "code": code,
                "redirect_uri": callback,
                "grant_type": "authorization_code",
            },
        )
        token_data = token_resp.json()
        if token_resp.status_code != 200:
            error = token_data.get("error", "unknown_error")
            desc = token_data.get("error_description", token_resp.text)
            raise ValueError(f"Google token exchange failed: {error} - {desc}")
        access_token = token_data.get("access_token")
        if not access_token:
            raise ValueError("No access_token in Google response")

        user_resp = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        user_resp.raise_for_status()
        user_data = user_resp.json()

        return {
            "id": str(uuid.uuid4()),
            "email": user_data.get("email", ""),
            "name": user_data.get("name", ""),
            "avatar_url": user_data.get("picture", ""),
            "provider": "google",
            "provider_id": str(user_data["id"]),
        }
