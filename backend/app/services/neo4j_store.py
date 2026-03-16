"""Neo4j graph storage backend for CodeAtlas."""
from __future__ import annotations

import networkx as nx
from neo4j import AsyncGraphDatabase, AsyncDriver


# Mapping from node type to Neo4j label
_TYPE_TO_LABEL = {
    "module": "Module",
    "class": "Class",
    "function": "Function",
    "external": "External",
}

# Mapping from relationship name to Neo4j relationship type
_REL_TO_TYPE = {
    "imports": "IMPORTS",
    "inherits": "INHERITS",
    "calls": "CALLS",
    "contains": "CONTAINS",
}


class Neo4jStore:
    """Async wrapper around the Neo4j driver for storing/loading CodeAtlas graphs."""

    def __init__(self) -> None:
        self._driver: AsyncDriver | None = None

    async def connect(self, uri: str, user: str, password: str) -> None:
        """Open a connection to Neo4j."""
        self._driver = AsyncGraphDatabase.driver(uri, auth=(user, password))

    async def close(self) -> None:
        """Close the Neo4j driver."""
        if self._driver is not None:
            await self._driver.close()
            self._driver = None

    def _ensure_driver(self) -> AsyncDriver:
        if self._driver is None:
            raise RuntimeError("Neo4jStore is not connected. Call connect() first.")
        return self._driver

    # ------------------------------------------------------------------
    # Store
    # ------------------------------------------------------------------

    async def store_graph(self, project_id: str, nx_graph: nx.DiGraph) -> None:
        """Convert a NetworkX DiGraph to Cypher CREATE statements and persist."""
        driver = self._ensure_driver()

        async with driver.session() as session:
            # Clear existing data for this project
            await session.run(
                "MATCH (n {project_id: $pid}) DETACH DELETE n",
                pid=project_id,
            )

            # Create nodes
            for node_id, attrs in nx_graph.nodes(data=True):
                node_type = attrs.get("type", "unknown")
                label = _TYPE_TO_LABEL.get(node_type, "Node")
                props = {
                    "node_id": node_id,
                    "project_id": project_id,
                    "label": attrs.get("label", node_id),
                    "type": node_type,
                    "file": attrs.get("file", ""),
                    "line": attrs.get("line", 0),
                    "directory": attrs.get("directory", ""),
                }
                query = f"CREATE (n:{label} $props)"
                await session.run(query, props=props)

            # Create relationships
            for source, target, attrs in nx_graph.edges(data=True):
                rel_name = attrs.get("relationship", "")
                rel_type = _REL_TO_TYPE.get(rel_name, "RELATED")
                query = (
                    "MATCH (a {node_id: $src, project_id: $pid}), "
                    "(b {node_id: $tgt, project_id: $pid}) "
                    f"CREATE (a)-[r:{rel_type} {{relationship: $rel}}]->(b)"
                )
                await session.run(
                    query, src=source, tgt=target, pid=project_id, rel=rel_name,
                )

    # ------------------------------------------------------------------
    # Load
    # ------------------------------------------------------------------

    async def load_graph(self, project_id: str) -> nx.DiGraph | None:
        """Load a graph from Neo4j back into a NetworkX DiGraph."""
        driver = self._ensure_driver()
        G = nx.DiGraph()

        async with driver.session() as session:
            # Load nodes
            result = await session.run(
                "MATCH (n {project_id: $pid}) RETURN n", pid=project_id,
            )
            records = [r async for r in result]
            if not records:
                return None

            for record in records:
                node = record["n"]
                G.add_node(
                    node["node_id"],
                    label=node.get("label", ""),
                    type=node.get("type", "unknown"),
                    file=node.get("file", ""),
                    line=node.get("line", 0),
                    directory=node.get("directory", ""),
                )

            # Load relationships
            result = await session.run(
                "MATCH (a {project_id: $pid})-[r]->(b {project_id: $pid}) "
                "RETURN a.node_id AS src, b.node_id AS tgt, r.relationship AS rel",
                pid=project_id,
            )
            async for record in result:
                G.add_edge(
                    record["src"],
                    record["tgt"],
                    relationship=record["rel"] or "",
                )

        return G

    # ------------------------------------------------------------------
    # Delete
    # ------------------------------------------------------------------

    async def delete_graph(self, project_id: str) -> None:
        """Remove all nodes and relationships for a project."""
        driver = self._ensure_driver()
        async with driver.session() as session:
            await session.run(
                "MATCH (n {project_id: $pid}) DETACH DELETE n", pid=project_id,
            )

    # ------------------------------------------------------------------
    # Neighborhood query
    # ------------------------------------------------------------------

    async def query_neighborhood(
        self, project_id: str, node_id: str, depth: int = 1,
    ) -> nx.DiGraph:
        """Return a subgraph of nodes within *depth* hops of *node_id*."""
        driver = self._ensure_driver()
        G = nx.DiGraph()

        async with driver.session() as session:
            query = (
                "MATCH path = (start {node_id: $nid, project_id: $pid})"
                f"-[*0..{depth}]-(neighbor {{project_id: $pid}}) "
                "UNWIND nodes(path) AS n "
                "UNWIND relationships(path) AS r "
                "WITH COLLECT(DISTINCT n) AS ns, COLLECT(DISTINCT r) AS rs "
                "RETURN ns, rs"
            )
            result = await session.run(query, nid=node_id, pid=project_id)
            record = await result.single()

            if record is None:
                return G

            for node in record["ns"]:
                G.add_node(
                    node["node_id"],
                    label=node.get("label", ""),
                    type=node.get("type", "unknown"),
                    file=node.get("file", ""),
                    line=node.get("line", 0),
                    directory=node.get("directory", ""),
                )

            for rel in record["rs"]:
                src = rel.start_node["node_id"]
                tgt = rel.end_node["node_id"]
                G.add_edge(src, tgt, relationship=rel.get("relationship", ""))

        return G
