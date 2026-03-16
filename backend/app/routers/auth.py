"""OAuth authentication endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query

from app.dependencies import get_current_user
from app.models.schemas import AuthTokenResponse, OAuthRedirectResponse, UserProfileResponse
from app.services.auth import (
    create_jwt,
    github_exchange_code,
    github_redirect_url,
    google_exchange_code,
    google_redirect_url,
)
from app.services.database import upsert_user

router = APIRouter()


def _user_to_response(user: dict) -> UserProfileResponse:
    return UserProfileResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        avatar_url=user["avatar_url"],
        oauth_provider=user["oauth_provider"],
        preferred_model=user["preferred_model"],
        preferred_provider=user["preferred_provider"],
        created_at=user["created_at"],
    )


@router.get("/github", response_model=OAuthRedirectResponse)
async def github_login():
    """Return the GitHub OAuth redirect URL."""
    return OAuthRedirectResponse(url=github_redirect_url())


@router.get("/github/callback", response_model=AuthTokenResponse)
async def github_callback(code: str = Query(...)):
    """Exchange GitHub OAuth code for a JWT."""
    try:
        info = await github_exchange_code(code)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"GitHub OAuth failed: {e}")

    user = await upsert_user(
        user_id=info["id"],
        email=info["email"],
        name=info["name"],
        avatar_url=info["avatar_url"],
        oauth_provider="github",
        oauth_provider_id=info["provider_id"],
    )

    if info.get("access_token"):
        from app.services.encryption import encrypt
        from app.services.database import set_api_key
        import uuid

        encrypted = encrypt(info["access_token"])
        await set_api_key(str(uuid.uuid4()), user["id"], "github_token", encrypted)

    token = create_jwt(user["id"])
    return AuthTokenResponse(token=token, user=_user_to_response(user))


@router.get("/google", response_model=OAuthRedirectResponse)
async def google_login():
    """Return the Google OAuth redirect URL."""
    return OAuthRedirectResponse(url=google_redirect_url())


@router.get("/google/callback", response_model=AuthTokenResponse)
async def google_callback(code: str = Query(...)):
    """Exchange Google OAuth code for a JWT."""
    try:
        info = await google_exchange_code(code)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Google OAuth failed: {e}")

    user = await upsert_user(
        user_id=info["id"],
        email=info["email"],
        name=info["name"],
        avatar_url=info["avatar_url"],
        oauth_provider="google",
        oauth_provider_id=info["provider_id"],
    )

    token = create_jwt(user["id"])
    return AuthTokenResponse(token=token, user=_user_to_response(user))


@router.get("/me", response_model=UserProfileResponse)
async def get_me(user: dict | None = Depends(get_current_user)):
    """Return the current user's profile, or 401 if not authenticated."""
    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return _user_to_response(user)
