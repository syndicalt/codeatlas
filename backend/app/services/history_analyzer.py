"""Analyze Git history to produce per-commit graph snapshots, churn metrics, and contributor data."""

from __future__ import annotations

from pathlib import Path

import git
import networkx as nx

from app.services.graph_builder import build_graph, graph_to_cytoscape_json
from app.services.models import (
    ChurnMetric,
    CommitInfo,
    GraphDelta,
    HistoryData,
)
from app.services.parser import parse_project


def analyze_history(
    repo_path: Path,
    max_snapshots: int = 50,
    progress_cb: callable | None = None,
) -> HistoryData:
    """Run full history analysis on a cloned git repository.

    Args:
        repo_path: Path to the cloned repo (must be a git repo).
        max_snapshots: Maximum number of commit snapshots to build.
        progress_cb: Optional callback(percent: int) for progress updates.
    """
    repo = git.Repo(repo_path)
    all_commits = list(repo.iter_commits(repo.active_branch, reverse=True))

    if not all_commits:
        return HistoryData()

    # Collect commit info for all commits
    commit_infos = _collect_commit_infos(all_commits)

    # Sample commits for graph snapshots
    sampled_indices = _sample_indices(len(all_commits), max_snapshots)
    sampled_commits = [all_commits[i] for i in sampled_indices]

    # Build graph snapshots at sampled commits
    snapshots: dict[str, dict] = {}
    graphs: dict[str, nx.DiGraph] = {}
    deltas: list[GraphDelta] = []
    prev_graph: nx.DiGraph | None = None

    for idx, commit in enumerate(sampled_commits):
        if progress_cb:
            pct = int((idx / len(sampled_commits)) * 100)
            progress_cb(pct)

        # Checkout commit
        repo.git.checkout(commit.hexsha, force=True)

        # Parse and build graph
        try:
            parsed_files = parse_project(repo_path)
            graph = build_graph(parsed_files) if parsed_files else nx.DiGraph()
        except Exception:
            graph = nx.DiGraph()

        cyto_json = graph_to_cytoscape_json(graph)
        sha = commit.hexsha
        snapshots[sha] = cyto_json
        graphs[sha] = graph

        # Compute delta from previous snapshot
        changed_files = [ci.files_changed for ci in commit_infos if ci.sha == sha]
        changed_files = changed_files[0] if changed_files else []
        delta = _compute_delta(prev_graph, graph, sha, changed_files)
        deltas.append(delta)
        prev_graph = graph

    # Restore to latest commit
    try:
        repo.git.checkout(repo.active_branch.name, force=True)
    except Exception:
        if all_commits:
            repo.git.checkout(all_commits[-1].hexsha, force=True)

    # Compute churn and contributors from all commits
    churn = _compute_churn(all_commits)
    contributors = _compute_contributors(all_commits)

    baseline_sha = sampled_commits[0].hexsha if sampled_commits else ""

    return HistoryData(
        commits=commit_infos,
        churn=churn,
        contributors=contributors,
        deltas=deltas,
        snapshots=snapshots,
        baseline_sha=baseline_sha,
    )


def _collect_commit_infos(commits: list[git.Commit]) -> list[CommitInfo]:
    infos = []
    for c in commits:
        try:
            files_changed = list(c.stats.files.keys())
        except Exception:
            files_changed = []

        infos.append(CommitInfo(
            sha=c.hexsha,
            short_sha=c.hexsha[:8],
            message=c.message.strip()[:200],
            author_name=c.author.name or "",
            author_email=c.author.email or "",
            timestamp=c.committed_date,
            files_changed=files_changed,
        ))
    return infos


def _sample_indices(total: int, max_snapshots: int) -> list[int]:
    """Select evenly spaced indices, always including first and last."""
    if total <= max_snapshots:
        return list(range(total))

    indices = set()
    indices.add(0)
    indices.add(total - 1)

    step = (total - 1) / (max_snapshots - 1)
    for i in range(max_snapshots):
        idx = round(i * step)
        indices.add(min(idx, total - 1))

    return sorted(indices)


def _compute_delta(
    prev_graph: nx.DiGraph | None,
    curr_graph: nx.DiGraph,
    commit_sha: str,
    changed_files: list[str],
) -> GraphDelta:
    if prev_graph is None:
        return GraphDelta(
            commit_sha=commit_sha,
            added_nodes=list(curr_graph.nodes()),
            added_edges=list(curr_graph.edges()),
        )

    prev_nodes = set(prev_graph.nodes())
    curr_nodes = set(curr_graph.nodes())
    prev_edges = set(prev_graph.edges())
    curr_edges = set(curr_graph.edges())

    added_nodes = list(curr_nodes - prev_nodes)
    removed_nodes = list(prev_nodes - curr_nodes)

    # Nodes in both snapshots whose file was changed
    common_nodes = curr_nodes & prev_nodes
    modified_nodes = []
    for node_id in common_nodes:
        attrs = curr_graph.nodes.get(node_id, {})
        file_path = attrs.get("file", "")
        if file_path and file_path in changed_files:
            modified_nodes.append(node_id)

    return GraphDelta(
        commit_sha=commit_sha,
        added_nodes=added_nodes,
        removed_nodes=removed_nodes,
        modified_nodes=modified_nodes,
        added_edges=list(curr_edges - prev_edges),
        removed_edges=list(prev_edges - curr_edges),
    )


def _compute_churn(commits: list[git.Commit]) -> dict:
    """Compute per-file churn across all commits. Returns {path: [ChurnMetric, ...]}."""
    churn: dict[str, list] = {}
    for c in commits:
        try:
            for path, stat in c.stats.files.items():
                entry = ChurnMetric(
                    path=path,
                    additions=stat.get("insertions", 0),
                    deletions=stat.get("deletions", 0),
                    commit_sha=c.hexsha,
                )
                churn.setdefault(path, []).append(entry)
        except Exception:
            continue
    return churn


def _compute_contributors(commits: list[git.Commit]) -> dict:
    """Build contributor map: email -> {name, files, commit_count}."""
    contrib: dict[str, dict] = {}
    for c in commits:
        email = c.author.email or "unknown"
        if email not in contrib:
            contrib[email] = {
                "name": c.author.name or "Unknown",
                "files": set(),
                "commit_count": 0,
            }
        contrib[email]["commit_count"] += 1
        try:
            for path in c.stats.files:
                contrib[email]["files"].add(path)
        except Exception:
            pass

    # Convert sets to sorted lists for JSON serialization
    for email in contrib:
        contrib[email]["files"] = sorted(contrib[email]["files"])

    return contrib
