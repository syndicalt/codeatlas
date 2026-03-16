from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse

from app.models.schemas import (
    CallChainDirection,
    DependencyScope,
    GraphResponse,
)
from app.services.graph_builder import graph_to_cytoscape_json, project_store
from app.services.graph_query import (
    DependencyScope as QueryScope,
    filter_by_scope,
    get_call_chain,
    search_nodes,
)

router = APIRouter()


def _get_project(project_id: str):
    data = project_store.get(project_id)
    if data is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return data


@router.get("/{project_id}", response_model=GraphResponse)
async def get_graph(project_id: str):
    data = _get_project(project_id)
    return GraphResponse(project_id=project_id, elements=data.cytoscape_json)


@router.get("/{project_id}/search")
async def search_graph(
    project_id: str,
    q: str | None = Query(None, description="Name substring search"),
    type: str | None = Query(None, description="Node type filter"),
    file: str | None = Query(None, description="File path prefix filter"),
):
    data = _get_project(project_id)
    matching_ids = search_nodes(data.graph, query=q, node_type=type, file_path=file)

    # Return matching nodes and their connected edges
    id_set = set(matching_ids)
    nodes = [n for n in data.cytoscape_json["nodes"] if n["data"]["id"] in id_set]
    edges = [e for e in data.cytoscape_json["edges"]
             if e["data"]["source"] in id_set or e["data"]["target"] in id_set]

    return {"project_id": project_id, "elements": {"nodes": nodes, "edges": edges},
            "total_matches": len(matching_ids)}


@router.get("/{project_id}/filter")
async def filter_graph(
    project_id: str,
    scope: DependencyScope = Query(DependencyScope.all),
):
    data = _get_project(project_id)
    scope_enum = QueryScope(scope.value)
    subgraph = filter_by_scope(data.graph, scope_enum)
    elements = graph_to_cytoscape_json(subgraph)
    return {"project_id": project_id, "elements": elements}


@router.get("/{project_id}/callchain/{node_id:path}")
async def call_chain(
    project_id: str,
    node_id: str,
    direction: CallChainDirection = Query(CallChainDirection.callees),
    depth: int = Query(5, ge=1, le=20),
):
    data = _get_project(project_id)
    subgraph = get_call_chain(data.graph, node_id, direction=direction.value, max_depth=depth)

    if len(subgraph) == 0:
        raise HTTPException(status_code=404, detail="Node not found or no call chain")

    elements = graph_to_cytoscape_json(subgraph)
    return {"project_id": project_id, "elements": elements}


@router.get("/{project_id}/export")
async def export_graph(
    project_id: str,
    format: str = Query("json", description="Export format: json"),
):
    data = _get_project(project_id)

    if format == "json":
        return JSONResponse(
            content={"project_id": project_id, "elements": data.cytoscape_json},
            headers={"Content-Disposition": f"attachment; filename=codeatlas-{project_id[:8]}.json"},
        )

    raise HTTPException(status_code=400, detail="PNG/SVG export is handled client-side")
