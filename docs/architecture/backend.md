# Backend Architecture

The backend is a Python FastAPI application located in `backend/`.

## Directory Structure

```
backend/
├── requirements.txt          # Python dependencies
├── app/
│   ├── main.py               # FastAPI app, CORS, lifespan
│   ├── config.py             # Settings via pydantic-settings
│   ├── routers/
│   │   ├── ingest.py         # Ingestion + demo + status endpoints
│   │   └── graph.py          # Graph data + search + filter + callchain + export
│   ├── services/
│   │   ├── models.py         # Shared dataclasses (ParsedFile, FunctionDef, ProjectData, etc.)
│   │   ├── cloner.py         # Git clone + ZIP extraction
│   │   ├── parser.py         # Orchestrator: walks files, dispatches to parsers
│   │   ├── graph_builder.py  # NetworkX graph + Cytoscape.js JSON export
│   │   ├── graph_query.py    # Search, filter, call chain traversal
│   │   ├── task_manager.py   # Background task status tracking
│   │   └── parsers/
│   │       ├── python_parser.py   # Tree-sitter Python extraction
│   │       ├── js_ts_parser.py    # Tree-sitter JS/TS extraction
│   │       └── java_parser.py     # Tree-sitter Java extraction
│   ├── models/
│   │   └── schemas.py        # Pydantic request/response models
│   └── data/
│       └── sample/           # Bundled demo project (Python)
└── tests/
    ├── conftest.py           # Fixtures (FastAPI TestClient)
    ├── test_parser.py        # Parser unit tests (Python, JS/TS, Java)
    └── test_graph_builder.py # Graph builder unit tests
```

## Processing Pipeline

Ingestion runs as a background task:

```
Input (URL, ZIP, or Demo)
    │
    ▼
┌──────────────┐
│ Task Manager  │  create_task(project_id) → status: queued
└──────┬───────┘
       │ (Background)
       ▼
┌─────────┐
│ Cloner  │  clone_repo() or extract_zip() or copytree()
└────┬────┘
     │ Path to source directory
     ▼
┌─────────┐
│ Parser  │  parse_project() → list[ParsedFile]
└────┬────┘  (walks files, dispatches to language parsers)
     │
     ▼
┌──────────────┐
│ Graph Builder │  build_graph() → NetworkX DiGraph
└────┬─────────┘  (resolves imports, inheritance, calls)
     │
     ▼
┌──────────────────┐
│ Cytoscape Export  │  graph_to_cytoscape_json() → dict
└────┬─────────────┘  (adds directory, connections, weight)
     │
     ▼
┌──────────────────┐
│ Project Store     │  project_store[id] = ProjectData(json, graph)
└──────────────────┘
```

## Language Parsers

All parsers extract functions, classes, imports, and **function calls** from AST bodies.

**`parsers/python_parser.py`**

| Element | Tree-sitter Node Types |
|---------|----------------------|
| Functions | `function_definition` |
| Classes | `class_definition` (with base classes) |
| Methods | `function_definition` inside class body |
| Imports | `import_statement`, `import_from_statement` |
| Calls | `call` nodes (identifier and attribute access) |

**`parsers/js_ts_parser.py`**

| Element | Tree-sitter Node Types |
|---------|----------------------|
| Functions | `function_declaration` |
| Arrow functions | `arrow_function` inside `variable_declarator` |
| Classes | `class_declaration` (with heritage) |
| Methods | `method_definition` inside class body |
| Imports | `import_statement` |
| Exports | Exported declarations are unwrapped |
| Calls | `call_expression` nodes (identifier and member expression) |

**`parsers/java_parser.py`**

| Element | Tree-sitter Node Types |
|---------|----------------------|
| Classes | `class_declaration` (superclass + interfaces) |
| Interfaces | `interface_declaration` (extends) |
| Methods | `method_declaration` |
| Constructors | `constructor_declaration` |
| Imports | `import_declaration` |
| Calls | `method_invocation` nodes |

## Graph Builder

**`services/graph_builder.py`**

### Node Types

| Type | ID Format | Extra Attributes |
|------|-----------|-----------------|
| Module | `mod:{path}` | `directory` |
| Class | `class:{path}:{name}` | `directory` |
| Function | `func:{path}:{name}` | `directory` |
| Method | `func:{path}:{class}.{name}` | `directory` |
| External | `ext:{module}` | — |

### Edge Types

| Relationship | Meaning | Resolution |
|-------------|---------|------------|
| `contains` | Module → class/function, class → method | Direct parent |
| `imports` | Module → module | File path matching |
| `inherits` | Class → base class | Name matching |
| `calls` | Function → function | Same-file > same-dir > global |

### Cytoscape JSON Enrichment

Each node includes `directory` (parent path) and `connections` (in-degree + out-degree). Each edge includes `weight`.

## Graph Query Service

**`services/graph_query.py`**

- **`search_nodes(G, query, type, file)`** — Substring match on label, exact match on type, prefix match on file path
- **`filter_by_scope(G, scope)`** — Returns subgraph: `internal` excludes external nodes, `external` keeps only modules connected to external deps
- **`get_call_chain(G, node_id, direction, depth)`** — BFS traversal following only `calls` edges, returns subgraph

## Task Manager

**`services/task_manager.py`**

Tracks background task progress with `TaskInfo` dataclass: `project_id`, `status` (queued/processing/ready/error), `progress` (0-100), `error_message`. Stored in an in-memory dict.

## Project Store

**`services/graph_builder.py`** — `project_store: dict[str, ProjectData]`

Each `ProjectData` holds both the Cytoscape JSON (for rendering) and the NetworkX DiGraph (for queries). This dual representation enables server-side search, filtering, and call chain traversal.
