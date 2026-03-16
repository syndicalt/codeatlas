from fastapi import APIRouter, HTTPException

from app.models.schemas import GraphResponse
from app.services.graph_builder import project_store

router = APIRouter()


@router.get("/{project_id}", response_model=GraphResponse)
async def get_graph(project_id: str):
    elements = project_store.get(project_id)
    if elements is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return GraphResponse(project_id=project_id, elements=elements)
