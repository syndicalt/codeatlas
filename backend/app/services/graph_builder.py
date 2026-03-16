from __future__ import annotations

from pathlib import PurePosixPath

import networkx as nx

from app.services.models import ParsedFile


# In-memory project store: project_id -> cytoscape JSON
project_store: dict[str, dict] = {}


def build_graph(parsed_files: list[ParsedFile]) -> nx.DiGraph:
    G = nx.DiGraph()

    # Map file paths to module IDs for import resolution
    path_to_module: dict[str, str] = {}

    for pf in parsed_files:
        module_id = f"mod:{pf.path}"
        label = PurePosixPath(pf.path).stem
        G.add_node(module_id, label=label, type="module", file=pf.path, line=1)
        path_to_module[pf.path] = module_id

        # Add classes
        for cls in pf.classes:
            cls_id = f"class:{pf.path}:{cls.name}"
            G.add_node(cls_id, label=cls.name, type="class", file=pf.path, line=cls.line)
            G.add_edge(module_id, cls_id, relationship="contains")

            # Add methods
            for method in cls.methods:
                method_id = f"func:{pf.path}:{cls.name}.{method.name}"
                G.add_node(method_id, label=f"{cls.name}.{method.name}", type="function", file=pf.path, line=method.line)
                G.add_edge(cls_id, method_id, relationship="contains")

        # Add top-level functions
        for func in pf.functions:
            func_id = f"func:{pf.path}:{func.name}"
            G.add_node(func_id, label=func.name, type="function", file=pf.path, line=func.line)
            G.add_edge(module_id, func_id, relationship="contains")

    # Resolve imports and inheritance
    _resolve_imports(G, parsed_files, path_to_module)
    _resolve_inheritance(G, parsed_files)

    return G


def _resolve_imports(G: nx.DiGraph, parsed_files: list[ParsedFile], path_to_module: dict[str, str]):
    """Create import edges between modules."""
    # Build lookup: module dotted path -> file path
    module_lookup: dict[str, str] = {}
    for path in path_to_module:
        # Convert file path to possible import path
        # e.g., "src/utils/helper.py" -> "src.utils.helper"
        p = PurePosixPath(path)
        stem = str(p.with_suffix("")).replace("/", ".")
        module_lookup[stem] = path
        # Also store just the filename stem
        module_lookup[p.stem] = path

    for pf in parsed_files:
        source_id = f"mod:{pf.path}"
        for imp in pf.imports:
            target_path = module_lookup.get(imp.module)
            if target_path:
                target_id = f"mod:{target_path}"
                if source_id != target_id:
                    G.add_edge(source_id, target_id, relationship="imports")
            else:
                # External dependency — add as an external node
                ext_id = f"ext:{imp.module}"
                if not G.has_node(ext_id):
                    G.add_node(ext_id, label=imp.module, type="external", file="", line=0)
                G.add_edge(source_id, ext_id, relationship="imports")


def _resolve_inheritance(G: nx.DiGraph, parsed_files: list[ParsedFile]):
    """Create inheritance edges between classes."""
    # Build lookup: class name -> node id
    class_lookup: dict[str, str] = {}
    for pf in parsed_files:
        for cls in pf.classes:
            cls_id = f"class:{pf.path}:{cls.name}"
            class_lookup[cls.name] = cls_id

    for pf in parsed_files:
        for cls in pf.classes:
            cls_id = f"class:{pf.path}:{cls.name}"
            for base in cls.bases:
                base_name = base.split(".")[-1]
                base_id = class_lookup.get(base_name)
                if base_id and base_id != cls_id:
                    G.add_edge(cls_id, base_id, relationship="inherits")


def graph_to_cytoscape_json(G: nx.DiGraph) -> dict:
    """Convert NetworkX graph to Cytoscape.js elements format."""
    nodes = []
    for node_id, attrs in G.nodes(data=True):
        nodes.append({
            "data": {
                "id": node_id,
                "label": attrs.get("label", node_id),
                "type": attrs.get("type", "unknown"),
                "file": attrs.get("file", ""),
                "line": attrs.get("line", 0),
            },
            "classes": attrs.get("type", "unknown"),
        })

    edges = []
    for source, target, attrs in G.edges(data=True):
        edges.append({
            "data": {
                "id": f"{source}->{target}",
                "source": source,
                "target": target,
                "relationship": attrs.get("relationship", ""),
            },
        })

    return {"nodes": nodes, "edges": edges}
