from fastapi import APIRouter, HTTPException, Query

from app.models.schemas import (
    ChurnResponse,
    CommitInfoSchema,
    ContributorResponse,
    DiffResponse,
    GraphAtCommitResponse,
    GraphDeltaSchema,
    HistoryTimelineResponse,
)
from app.services.graph_builder import project_store

router = APIRouter()


def _get_history(project_id: str):
    data = project_store.get(project_id)
    if data is None:
        raise HTTPException(status_code=404, detail="Project not found")
    if data.history is None:
        raise HTTPException(
            status_code=404,
            detail="History not analyzed. Re-ingest with analyze_history=true.",
        )
    return data.history


@router.get("/{project_id}/timeline", response_model=HistoryTimelineResponse)
async def get_timeline(project_id: str):
    history = _get_history(project_id)
    sampled_shas = set(history.snapshots.keys())
    return HistoryTimelineResponse(
        project_id=project_id,
        commits=[
            CommitInfoSchema(
                sha=c.sha,
                short_sha=c.short_sha,
                message=c.message,
                author_name=c.author_name,
                author_email=c.author_email,
                timestamp=c.timestamp,
                files_changed=c.files_changed,
            )
            for c in history.commits
            if c.sha in sampled_shas
        ],
        total_commits=len(history.commits),
        sampled_commits=len(history.snapshots),
    )


@router.get("/{project_id}/at/{commit_sha}", response_model=GraphAtCommitResponse)
async def get_graph_at_commit(project_id: str, commit_sha: str):
    history = _get_history(project_id)
    elements = history.snapshots.get(commit_sha)
    if elements is None:
        raise HTTPException(status_code=404, detail="Snapshot not found for this commit")

    delta = None
    for d in history.deltas:
        if d.commit_sha == commit_sha:
            delta = GraphDeltaSchema(
                added_nodes=d.added_nodes,
                removed_nodes=d.removed_nodes,
                modified_nodes=d.modified_nodes,
            )
            break

    return GraphAtCommitResponse(
        project_id=project_id,
        commit_sha=commit_sha,
        elements=elements,
        delta=delta,
    )


@router.get("/{project_id}/diff", response_model=DiffResponse)
async def get_diff(
    project_id: str,
    from_sha: str = Query(..., description="Base commit SHA"),
    to_sha: str = Query(..., description="Compare commit SHA"),
):
    history = _get_history(project_id)
    from_elements = history.snapshots.get(from_sha)
    to_elements = history.snapshots.get(to_sha)

    if from_elements is None or to_elements is None:
        raise HTTPException(status_code=404, detail="One or both commit snapshots not found")

    from_node_ids = {n["data"]["id"] for n in from_elements["nodes"]}
    to_node_ids = {n["data"]["id"] for n in to_elements["nodes"]}

    delta = GraphDeltaSchema(
        added_nodes=sorted(to_node_ids - from_node_ids),
        removed_nodes=sorted(from_node_ids - to_node_ids),
        modified_nodes=[],  # would need file-level diff for this
    )

    return DiffResponse(
        project_id=project_id,
        from_sha=from_sha,
        to_sha=to_sha,
        delta=delta,
        elements=to_elements,
    )


@router.get("/{project_id}/churn", response_model=ChurnResponse)
async def get_churn(project_id: str):
    history = _get_history(project_id)
    # Convert ChurnMetric dataclasses to dicts
    churn_dict = {}
    for path, metrics in history.churn.items():
        churn_dict[path] = [
            {"path": m.path, "additions": m.additions, "deletions": m.deletions, "commit_sha": m.commit_sha}
            for m in metrics
        ]
    return ChurnResponse(project_id=project_id, churn=churn_dict)


@router.get("/{project_id}/contributors", response_model=ContributorResponse)
async def get_contributors(project_id: str):
    history = _get_history(project_id)
    return ContributorResponse(project_id=project_id, contributors=history.contributors)
