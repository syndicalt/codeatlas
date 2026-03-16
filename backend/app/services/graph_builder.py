from __future__ import annotations

from pathlib import PurePosixPath

import networkx as nx

from app.services.models import ParsedFile, ProjectData


# In-memory project store: project_id -> ProjectData
project_store: dict[str, ProjectData] = {}


def build_graph(parsed_files: list[ParsedFile]) -> nx.DiGraph:
    G = nx.DiGraph()

    path_to_module: dict[str, str] = {}

    for pf in parsed_files:
        module_id = f"mod:{pf.path}"
        label = PurePosixPath(pf.path).stem
        directory = str(PurePosixPath(pf.path).parent)
        if directory == ".":
            directory = ""
        G.add_node(module_id, label=label, type="module", file=pf.path, line=1, directory=directory)
        path_to_module[pf.path] = module_id

        for cls in pf.classes:
            cls_id = f"class:{pf.path}:{cls.name}"
            G.add_node(cls_id, label=cls.name, type="class", file=pf.path, line=cls.line, directory=directory)
            G.add_edge(module_id, cls_id, relationship="contains")

            for method in cls.methods:
                method_id = f"func:{pf.path}:{cls.name}.{method.name}"
                G.add_node(method_id, label=f"{cls.name}.{method.name}", type="function", file=pf.path, line=method.line, directory=directory)
                G.add_edge(cls_id, method_id, relationship="contains")

        for func in pf.functions:
            func_id = f"func:{pf.path}:{func.name}"
            G.add_node(func_id, label=func.name, type="function", file=pf.path, line=func.line, directory=directory)
            G.add_edge(module_id, func_id, relationship="contains")

    _resolve_imports(G, parsed_files, path_to_module)
    _resolve_inheritance(G, parsed_files)
    _resolve_calls(G, parsed_files)

    return G


def _resolve_imports(G: nx.DiGraph, parsed_files: list[ParsedFile], path_to_module: dict[str, str]):
    module_lookup: dict[str, str] = {}
    for path in path_to_module:
        p = PurePosixPath(path)
        stem = str(p.with_suffix("")).replace("/", ".")
        module_lookup[stem] = path
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
                ext_id = f"ext:{imp.module}"
                if not G.has_node(ext_id):
                    G.add_node(ext_id, label=imp.module, type="external", file="", line=0, directory="")
                G.add_edge(source_id, ext_id, relationship="imports")


def _resolve_inheritance(G: nx.DiGraph, parsed_files: list[ParsedFile]):
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


def _resolve_calls(G: nx.DiGraph, parsed_files: list[ParsedFile]):
    """Create call edges between functions."""
    # Build lookup: function name -> list of (node_id, file_path)
    func_lookup: dict[str, list[tuple[str, str]]] = {}
    for pf in parsed_files:
        for func in pf.functions:
            func_id = f"func:{pf.path}:{func.name}"
            func_lookup.setdefault(func.name, []).append((func_id, pf.path))
        for cls in pf.classes:
            for method in cls.methods:
                method_id = f"func:{pf.path}:{cls.name}.{method.name}"
                func_lookup.setdefault(method.name, []).append((method_id, pf.path))

    for pf in parsed_files:
        for func in pf.functions:
            caller_id = f"func:{pf.path}:{func.name}"
            _add_call_edges(G, caller_id, pf.path, func.calls, func_lookup)
        for cls in pf.classes:
            for method in cls.methods:
                caller_id = f"func:{pf.path}:{cls.name}.{method.name}"
                _add_call_edges(G, caller_id, pf.path, method.calls, func_lookup)


def _add_call_edges(G: nx.DiGraph, caller_id: str, caller_path: str, calls: list[str],
                    func_lookup: dict[str, list[tuple[str, str]]]):
    for call_name in calls:
        candidates = func_lookup.get(call_name)
        if not candidates:
            continue
        # Prefer same-file match, then same-directory, then first match
        target_id = None
        caller_dir = str(PurePosixPath(caller_path).parent)
        same_file = [c for c in candidates if c[1] == caller_path and c[0] != caller_id]
        same_dir = [c for c in candidates if str(PurePosixPath(c[1]).parent) == caller_dir and c[0] != caller_id]
        other = [c for c in candidates if c[0] != caller_id]

        if same_file:
            target_id = same_file[0][0]
        elif same_dir:
            target_id = same_dir[0][0]
        elif other:
            target_id = other[0][0]

        if target_id and not G.has_edge(caller_id, target_id):
            G.add_edge(caller_id, target_id, relationship="calls")


def graph_to_cytoscape_json(G: nx.DiGraph) -> dict:
    """Convert NetworkX graph to Cytoscape.js elements format."""
    # Precompute connection counts per node
    connection_count: dict[str, int] = {}
    for node_id in G.nodes:
        connection_count[node_id] = G.in_degree(node_id) + G.out_degree(node_id)

    # Collect unique directories for compound grouping
    directories: set[str] = set()
    for _, attrs in G.nodes(data=True):
        d = attrs.get("directory", "")
        if d:
            directories.add(d)

    # Create compound parent nodes for directories (only if there are multiple)
    nodes = []
    if len(directories) > 1:
        for d in sorted(directories):
            dir_id = f"dir:{d}"
            label = PurePosixPath(d).name or d
            nodes.append({
                "data": {
                    "id": dir_id,
                    "label": label,
                    "type": "group",
                },
                "classes": "group",
            })

    for node_id, attrs in G.nodes(data=True):
        node_data: dict = {
            "id": node_id,
            "label": attrs.get("label", node_id),
            "type": attrs.get("type", "unknown"),
            "file": attrs.get("file", ""),
            "line": attrs.get("line", 0),
            "directory": attrs.get("directory", ""),
            "connections": connection_count.get(node_id, 0),
        }
        # Assign parent for directory grouping (modules go into their directory group)
        d = attrs.get("directory", "")
        if len(directories) > 1 and d and attrs.get("type") == "module":
            node_data["parent"] = f"dir:{d}"

        nodes.append({
            "data": node_data,
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
                "weight": 1,
            },
        })

    return {"nodes": nodes, "edges": edges}


def cytoscape_json_to_graph(cyto_json: dict) -> nx.DiGraph:
    """Rebuild a NetworkX DiGraph from Cytoscape.js JSON elements."""
    G = nx.DiGraph()
    for node in cyto_json.get("nodes", []):
        d = node["data"]
        # Skip compound group nodes — they're only for frontend layout
        if d.get("type") == "group":
            continue
        G.add_node(
            d["id"],
            label=d.get("label", d["id"]),
            type=d.get("type", "unknown"),
            file=d.get("file", ""),
            line=d.get("line", 0),
            directory=d.get("directory", ""),
        )
    for edge in cyto_json.get("edges", []):
        d = edge["data"]
        G.add_edge(
            d["source"],
            d["target"],
            relationship=d.get("relationship", ""),
        )
    return G
