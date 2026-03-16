"""Shareable graph link endpoints."""
import json
import uuid
from fastapi import APIRouter, HTTPException
from app.services.database import create_shared_graph, get_shared_graph
from app.services.graph_builder import project_store

router = APIRouter()


@router.post("/{project_id}")
async def create_share(project_id: str):
    data = project_store.get(project_id)
    if data is None:
        raise HTTPException(status_code=404, detail="Project not found")
    share_id = uuid.uuid4().hex[:8]
    elements_json = json.dumps(data.cytoscape_json)
    await create_shared_graph(share_id, project_id, elements_json)
    return {"share_id": share_id}


@router.get("/{share_id}")
async def get_share(share_id: str):
    row = await get_shared_graph(share_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Shared graph not found")
    elements = json.loads(row["elements_json"])
    return {"share_id": share_id, "project_id": row["project_id"], "elements": elements}
