from app.services.models import ParsedFile, FunctionDef, ClassDef, ImportDef
from app.services.graph_builder import build_graph, graph_to_cytoscape_json


def _make_parsed_files():
    return [
        ParsedFile(
            path="main.py",
            language="python",
            functions=[FunctionDef(name="main", line=1)],
            classes=[],
            imports=[ImportDef(module="utils", names=["helper"])],
        ),
        ParsedFile(
            path="utils.py",
            language="python",
            functions=[FunctionDef(name="helper", line=1)],
            classes=[
                ClassDef(
                    name="Base",
                    line=5,
                    bases=[],
                    methods=[FunctionDef(name="run", line=6)],
                ),
            ],
            imports=[],
        ),
    ]


def test_build_graph_nodes():
    G = build_graph(_make_parsed_files())
    node_ids = set(G.nodes)
    assert "mod:main.py" in node_ids
    assert "mod:utils.py" in node_ids
    assert "func:main.py:main" in node_ids
    assert "func:utils.py:helper" in node_ids
    assert "class:utils.py:Base" in node_ids


def test_build_graph_edges():
    G = build_graph(_make_parsed_files())
    edges = [(u, v, d["relationship"]) for u, v, d in G.edges(data=True)]
    assert ("mod:main.py", "func:main.py:main", "contains") in edges
    assert ("mod:main.py", "mod:utils.py", "imports") in edges
    assert ("class:utils.py:Base", "func:utils.py:Base.run", "contains") in edges


def test_cytoscape_json_format():
    G = build_graph(_make_parsed_files())
    result = graph_to_cytoscape_json(G)
    assert "nodes" in result
    assert "edges" in result
    assert all("data" in n for n in result["nodes"])
    assert all("data" in e for e in result["edges"])
