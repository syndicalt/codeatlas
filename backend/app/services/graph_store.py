"""Unified graph storage abstraction for CodeAtlas."""
from __future__ import annotations

from typing import Protocol

import networkx as nx

from app.config import settings
from app.services.models import ProjectData


class GraphStore(Protocol):
    """Protocol for graph storage backends."""

    async def store(self, project_id: str, data: ProjectData) -> None:
        ...

    async def load(self, project_id: str) -> ProjectData | None:
        ...

    async def delete(self, project_id: str) -> None:
        ...


class InMemoryGraphStore:
    """Wraps the existing in-memory project_store dict."""

    def __init__(self) -> None:
        from app.services.graph_builder import project_store
        self._store = project_store

    async def store(self, project_id: str, data: ProjectData) -> None:
        self._store[project_id] = data

    async def load(self, project_id: str) -> ProjectData | None:
        return self._store.get(project_id)

    async def delete(self, project_id: str) -> None:
        self._store.pop(project_id, None)


class Neo4jGraphStore:
    """Wraps Neo4jStore and the in-memory store for full ProjectData."""

    def __init__(self) -> None:
        from app.services.neo4j_store import Neo4jStore
        self._neo4j = Neo4jStore()
        # Keep in-memory cache for cytoscape_json and history (not stored in Neo4j)
        from app.services.graph_builder import project_store
        self._cache = project_store

    async def connect(self) -> None:
        await self._neo4j.connect(
            settings.neo4j_uri, settings.neo4j_user, settings.neo4j_password,
        )

    async def close(self) -> None:
        await self._neo4j.close()

    async def store(self, project_id: str, data: ProjectData) -> None:
        # Store graph in Neo4j
        graph = data.graph
        if isinstance(graph, nx.DiGraph):
            await self._neo4j.store_graph(project_id, graph)
        # Keep full ProjectData in memory for fast access
        self._cache[project_id] = data

    async def load(self, project_id: str) -> ProjectData | None:
        # Try in-memory cache first
        cached = self._cache.get(project_id)
        if cached is not None:
            return cached
        # Fall back to Neo4j
        graph = await self._neo4j.load_graph(project_id)
        if graph is None:
            return None
        from app.services.graph_builder import graph_to_cytoscape_json
        cyto = graph_to_cytoscape_json(graph)
        data = ProjectData(cytoscape_json=cyto, graph=graph)
        self._cache[project_id] = data
        return data

    async def delete(self, project_id: str) -> None:
        await self._neo4j.delete_graph(project_id)
        self._cache.pop(project_id, None)


# ------------------------------------------------------------------
# Module-level instance management
# ------------------------------------------------------------------

_store: GraphStore | None = None


def get_graph_store() -> GraphStore:
    """Return the active graph store instance."""
    if _store is None:
        raise RuntimeError("Graph store not initialized. Call init_graph_store() first.")
    return _store


async def init_graph_store() -> None:
    """Initialize the graph store based on settings."""
    global _store
    if settings.use_neo4j:
        store = Neo4jGraphStore()
        await store.connect()
        _store = store
    else:
        _store = InMemoryGraphStore()


async def close_graph_store() -> None:
    """Shut down the graph store."""
    global _store
    if _store is not None and isinstance(_store, Neo4jGraphStore):
        await _store.close()
    _store = None
