import uuid

from fastapi import APIRouter, HTTPException, UploadFile

from app.config import settings
from app.models.schemas import IngestGitHubRequest, IngestResponse
from app.services.cloner import clone_repo, extract_zip
from app.services.graph_builder import build_graph, graph_to_cytoscape_json, project_store
from app.services.parser import parse_project

router = APIRouter()


@router.post("/github", response_model=IngestResponse)
async def ingest_github(request: IngestGitHubRequest):
    project_id = str(uuid.uuid4())
    dest = settings.upload_dir / project_id

    try:
        clone_repo(request.url, dest, request.branch)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Clone failed: {e}")

    return _process_project(project_id, dest)


@router.post("/upload", response_model=IngestResponse)
async def ingest_upload(file: UploadFile):
    if not file.filename or not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only .zip files are accepted")

    project_id = str(uuid.uuid4())
    dest = settings.upload_dir / project_id

    try:
        root = await extract_zip(file, dest)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Extraction failed: {e}")

    return _process_project(project_id, root)


def _process_project(project_id: str, root) -> IngestResponse:
    parsed_files = parse_project(root)

    if not parsed_files:
        raise HTTPException(status_code=400, detail="No supported source files found")

    graph = build_graph(parsed_files)
    cytoscape_json = graph_to_cytoscape_json(graph)
    project_store[project_id] = cytoscape_json

    return IngestResponse(
        project_id=project_id,
        status="ready",
        node_count=len(cytoscape_json["nodes"]),
        edge_count=len(cytoscape_json["edges"]),
    )
