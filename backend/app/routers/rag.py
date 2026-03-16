"""RAG query endpoints for natural language codebase exploration."""

from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_current_user
from app.models.schemas import RagIndexStatus, RagQueryRequest, RagQueryResponse
from app.services.database import get_api_key_for_provider
from app.services.encryption import decrypt
from app.services.graph_builder import project_store
from app.services.rag_agent import query_agent
from app.services.vector_index import get_or_build_index, index_store

router = APIRouter()


async def _resolve_llm_config(user: dict | None) -> tuple[str | None, str | None, str | None]:
    """Resolve (api_key, provider_name, model) from user preferences.

    Returns (None, None, None) if no user or no key configured.
    """
    if not user:
        return None, None, None

    provider_name = user.get("preferred_provider") or "anthropic"
    model = user.get("preferred_model") or ""

    encrypted_key = await get_api_key_for_provider(user["id"], provider_name)
    if not encrypted_key:
        return None, None, None

    try:
        api_key = decrypt(encrypted_key)
    except ValueError:
        return None, None, None

    return api_key, provider_name, model


@router.post("/{project_id}/query", response_model=RagQueryResponse)
async def rag_query(
    project_id: str,
    body: RagQueryRequest,
    user: dict | None = Depends(get_current_user),
):
    """Ask a natural language question about the codebase."""
    project_data = project_store.get(project_id)
    if project_data is None:
        raise HTTPException(status_code=404, detail="Project not found")

    api_key, provider_name, model = await _resolve_llm_config(user)

    agent_resp, conversation_id = await query_agent(
        project_id=project_id,
        message=body.message,
        conversation_id=body.conversation_id,
        api_key=api_key,
        provider_name=provider_name,
        model=model,
    )

    return RagQueryResponse(
        project_id=project_id,
        message_id="",  # could be used for streaming later
        conversation_id=conversation_id,
        text=agent_resp.text,
        highlighted_nodes=agent_resp.highlighted_nodes,
        subgraph_elements=agent_resp.subgraph_elements,
        code_snippets=[
            {"file": s["file"], "start_line": s.get("start_line", 0),
             "end_line": s.get("end_line", 0), "label": s.get("label", "")}
            for s in agent_resp.code_snippets
        ],
        confidence=agent_resp.confidence,
        follow_up_suggestions=agent_resp.follow_up_suggestions,
        is_local_only=agent_resp.is_local_only,
    )


@router.get("/{project_id}/index-status", response_model=RagIndexStatus)
async def rag_index_status(project_id: str):
    """Check whether the vector index has been built for a project."""
    project_data = project_store.get(project_id)
    if project_data is None:
        raise HTTPException(status_code=404, detail="Project not found")

    idx = index_store.get(project_id)
    return RagIndexStatus(
        project_id=project_id,
        indexed=idx is not None and idx.is_built,
        doc_count=idx.doc_count if idx else 0,
    )


@router.post("/{project_id}/build-index")
async def build_index(project_id: str):
    """Manually trigger vector index build."""
    project_data = project_store.get(project_id)
    if project_data is None:
        raise HTTPException(status_code=404, detail="Project not found")

    idx = get_or_build_index(project_id, project_data)
    return {"project_id": project_id, "indexed": True, "doc_count": idx.doc_count}
