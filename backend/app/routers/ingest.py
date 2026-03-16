import json
import uuid

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request, UploadFile

from app.config import settings
from app.models.schemas import IngestGitHubRequest, IngestResponse, TaskStatusResponse
from app.services.cloner import clone_repo, extract_zip
from app.services.graph_builder import (
    build_graph, cytoscape_json_to_graph, graph_to_cytoscape_json, project_store,
)
from app.services.models import ProjectData
from app.services.parser import parse_project
from app.services.task_manager import (
    TaskStatus, create_task, get_task, update_task,
)

router = APIRouter()


def _process_in_background(project_id: str, root, analyze_history: bool = False):
    """Run parsing and graph building, updating task status along the way."""
    try:
        update_task(project_id, TaskStatus.processing, progress=10)
        parsed_files = parse_project(root)

        if not parsed_files:
            update_task(project_id, TaskStatus.error, error_message="No supported source files found")
            return

        update_task(project_id, TaskStatus.processing, progress=40)
        graph = build_graph(parsed_files)
        cytoscape_json = graph_to_cytoscape_json(graph)

        history = None
        if analyze_history:
            update_task(project_id, TaskStatus.processing, progress=50)
            from app.services.history_analyzer import analyze_history as run_history

            def progress_cb(pct: int):
                # Map 0-100 history progress to 50-95 overall progress
                overall = 50 + int(pct * 0.45)
                update_task(project_id, TaskStatus.processing, progress=overall)

            history = run_history(root, progress_cb=progress_cb)

        project_store[project_id] = ProjectData(
            cytoscape_json=cytoscape_json, graph=graph, history=history,
        )

        update_task(project_id, TaskStatus.ready, progress=100)
    except Exception as e:
        update_task(project_id, TaskStatus.error, error_message=str(e))


@router.post("/github", response_model=IngestResponse)
async def ingest_github(request: IngestGitHubRequest, background_tasks: BackgroundTasks):
    project_id = str(uuid.uuid4())
    dest = settings.upload_dir / project_id

    try:
        shallow = not request.analyze_history
        clone_repo(request.url, dest, request.branch, shallow=shallow)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Clone failed: {e}")

    create_task(project_id)
    background_tasks.add_task(
        _process_in_background, project_id, dest, analyze_history=request.analyze_history,
    )

    return IngestResponse(project_id=project_id, status="processing")


@router.post("/upload", response_model=IngestResponse)
async def ingest_upload(file: UploadFile, background_tasks: BackgroundTasks):
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

    create_task(project_id)
    background_tasks.add_task(_process_in_background, project_id, root)

    return IngestResponse(project_id=project_id, status="processing")


@router.get("/status/{project_id}", response_model=TaskStatusResponse)
async def get_status(project_id: str):
    task = get_task(project_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    node_count = 0
    edge_count = 0
    data = project_store.get(project_id)
    if data:
        node_count = len(data.cytoscape_json["nodes"])
        edge_count = len(data.cytoscape_json["edges"])

    return TaskStatusResponse(
        project_id=project_id,
        status=task.status.value,
        progress=task.progress,
        error_message=task.error_message,
        node_count=node_count,
        edge_count=edge_count,
    )


@router.post("/demo", response_model=IngestResponse)
async def ingest_demo(background_tasks: BackgroundTasks):
    """Load a pre-built sample project for demo purposes."""
    from pathlib import Path
    import shutil

    project_id = str(uuid.uuid4())
    demo_src = Path(__file__).parent.parent / "data" / "sample"

    if not demo_src.exists():
        raise HTTPException(status_code=500, detail="Demo data not available")

    dest = settings.upload_dir / project_id
    shutil.copytree(demo_src, dest)

    create_task(project_id)
    background_tasks.add_task(_process_in_background, project_id, dest)

    return IngestResponse(project_id=project_id, status="processing")


@router.post("/import", response_model=IngestResponse)
async def ingest_import(file: UploadFile):
    """Import a previously exported CodeAtlas JSON file to rebuild the graph."""
    if not file.filename or not file.filename.endswith(".json"):
        raise HTTPException(status_code=400, detail="Only .json files are accepted")

    try:
        content = await file.read()
        data = json.loads(content)
    except (json.JSONDecodeError, UnicodeDecodeError):
        raise HTTPException(status_code=400, detail="Invalid JSON file")

    elements = data.get("elements")
    if not elements or "nodes" not in elements or "edges" not in elements:
        raise HTTPException(
            status_code=400,
            detail="Invalid CodeAtlas JSON: missing elements.nodes or elements.edges",
        )

    project_id = data.get("project_id") or str(uuid.uuid4())
    # Avoid collisions with existing projects
    if project_id in project_store:
        project_id = str(uuid.uuid4())

    graph = cytoscape_json_to_graph(elements)
    project_store[project_id] = ProjectData(cytoscape_json=elements, graph=graph)

    return IngestResponse(
        project_id=project_id,
        status="ready",
        node_count=len(elements["nodes"]),
        edge_count=len(elements["edges"]),
    )
