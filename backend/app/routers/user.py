"""User profile, API key, and atlas history management endpoints."""

import uuid

from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import require_auth
from app.models.schemas import (
    ApiKeyEntry,
    AtlasHistoryEntry,
    SetApiKeyRequest,
    UpdatePreferencesRequest,
    UserProfileResponse,
    VALID_PROVIDERS,
)
from app.services.database import (
    delete_api_key,
    delete_atlas_history_entry,
    get_api_keys,
    get_atlas_history,
    set_api_key,
    update_user_preferences,
)
from app.services.encryption import encrypt

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


@router.get("/profile", response_model=UserProfileResponse)
async def get_profile(user: dict = Depends(require_auth)):
    return _user_to_response(user)


@router.put("/preferences", response_model=UserProfileResponse)
async def update_preferences(body: UpdatePreferencesRequest, user: dict = Depends(require_auth)):
    await update_user_preferences(user["id"], body.preferred_model, body.preferred_provider)
    user["preferred_model"] = body.preferred_model
    user["preferred_provider"] = body.preferred_provider
    return _user_to_response(user)


@router.get("/api-keys", response_model=list[ApiKeyEntry])
async def list_api_keys(user: dict = Depends(require_auth)):
    keys = await get_api_keys(user["id"])
    return [ApiKeyEntry(id=k["id"], provider=k["provider"], created_at=k["created_at"]) for k in keys]


@router.put("/api-keys/{provider}")
async def upsert_api_key(provider: str, body: SetApiKeyRequest, user: dict = Depends(require_auth)):
    if provider not in VALID_PROVIDERS:
        raise HTTPException(status_code=400, detail=f"Invalid provider. Must be one of: {', '.join(sorted(VALID_PROVIDERS))}")
    if not body.key.strip():
        raise HTTPException(status_code=400, detail="API key cannot be empty")

    encrypted = encrypt(body.key.strip())
    key_id = str(uuid.uuid4())
    await set_api_key(key_id, user["id"], provider, encrypted)
    return {"status": "ok", "provider": provider}


@router.delete("/api-keys/{provider}")
async def remove_api_key(provider: str, user: dict = Depends(require_auth)):
    deleted = await delete_api_key(user["id"], provider)
    if not deleted:
        raise HTTPException(status_code=404, detail="API key not found")
    return {"status": "ok", "provider": provider}


@router.get("/atlas-history", response_model=list[AtlasHistoryEntry])
async def list_atlas_history(user: dict = Depends(require_auth)):
    entries = await get_atlas_history(user["id"])
    return [
        AtlasHistoryEntry(
            id=e["id"],
            project_id=e["project_id"],
            source_url=e["source_url"],
            name=e["name"],
            node_count=e["node_count"],
            edge_count=e["edge_count"],
            created_at=e["created_at"],
        )
        for e in entries
    ]


@router.delete("/atlas-history/{entry_id}")
async def remove_atlas_history(entry_id: str, user: dict = Depends(require_auth)):
    deleted = await delete_atlas_history_entry(user["id"], entry_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="History entry not found")
    return {"status": "ok"}
