from __future__ import annotations

from enum import Enum

import networkx as nx


class DependencyScope(str, Enum):
    all = "all"
    internal = "internal"
    external = "external"


def search_nodes(G: nx.DiGraph, query: str | None = None,
                 node_type: str | None = None,
                 file_path: str | None = None) -> list[str]:
    """Return node IDs matching the search criteria."""
    results = []
    for node_id, attrs in G.nodes(data=True):
        if query:
            label = attrs.get("label", "").lower()
            if query.lower() not in label:
                continue
        if node_type:
            if attrs.get("type") != node_type:
                continue
        if file_path:
            if not attrs.get("file", "").startswith(file_path):
                continue
        results.append(node_id)
    return results


def filter_by_scope(G: nx.DiGraph, scope: DependencyScope) -> nx.DiGraph:
    """Return a subgraph filtered by dependency scope."""
    if scope == DependencyScope.all:
        return G

    if scope == DependencyScope.internal:
        # Remove external nodes and their edges
        internal_nodes = [n for n, d in G.nodes(data=True) if d.get("type") != "external"]
        return G.subgraph(internal_nodes).copy()

    if scope == DependencyScope.external:
        # Keep only modules that import external deps, plus the external nodes
        external_nodes = {n for n, d in G.nodes(data=True) if d.get("type") == "external"}
        # Find modules that connect to external nodes
        connected = set()
        for ext in external_nodes:
            for pred in G.predecessors(ext):
                connected.add(pred)
        keep = external_nodes | connected
        return G.subgraph(keep).copy()

    return G


def get_call_chain(G: nx.DiGraph, node_id: str,
                   direction: str = "callees",
                   max_depth: int = 5) -> nx.DiGraph:
    """BFS traversal of call edges from a node. Returns a subgraph."""
    if node_id not in G:
        return nx.DiGraph()

    visited: set[str] = {node_id}
    frontier: set[str] = {node_id}
    edges: list[tuple[str, str, dict]] = []

    for _ in range(max_depth):
        next_frontier: set[str] = set()
        for current in frontier:
            if direction == "callees":
                neighbors = G.successors(current)
            else:
                neighbors = G.predecessors(current)

            for neighbor in neighbors:
                # Only follow call edges
                if direction == "callees":
                    edge_data = G.get_edge_data(current, neighbor, {})
                else:
                    edge_data = G.get_edge_data(neighbor, current, {})

                if edge_data.get("relationship") != "calls":
                    continue

                if direction == "callees":
                    edges.append((current, neighbor, edge_data))
                else:
                    edges.append((neighbor, current, edge_data))

                if neighbor not in visited:
                    visited.add(neighbor)
                    next_frontier.add(neighbor)

        if not next_frontier:
            break
        frontier = next_frontier

    subgraph = nx.DiGraph()
    for node_id_v in visited:
        if node_id_v in G:
            subgraph.add_node(node_id_v, **G.nodes[node_id_v])
    for src, tgt, data in edges:
        subgraph.add_edge(src, tgt, **data)

    return subgraph
