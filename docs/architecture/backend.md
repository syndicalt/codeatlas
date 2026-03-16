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
│   │   ├── ingest.py         # POST /api/ingest/github, /api/ingest/upload
│   │   └── graph.py          # GET /api/graph/{project_id}
│   ├── services/
│   │   ├── models.py         # Shared dataclasses (ParsedFile, FunctionDef, etc.)
│   │   ├── cloner.py         # Git clone + ZIP extraction
│   │   ├── parser.py         # Orchestrator: walks files, dispatches to parsers
│   │   ├── graph_builder.py  # NetworkX graph + Cytoscape.js JSON export
│   │   └── parsers/
│   │       ├── python_parser.py   # Tree-sitter Python extraction
│   │       └── js_ts_parser.py    # Tree-sitter JS/TS extraction
│   └── models/
│       └── schemas.py        # Pydantic request/response models
└── tests/
    ├── conftest.py           # Fixtures (FastAPI TestClient)
    ├── test_parser.py        # Parser unit tests
    └── test_graph_builder.py # Graph builder unit tests
```

## Processing Pipeline

Each ingestion request follows this pipeline:

```
Input (URL or ZIP)
    │
    ▼
┌─────────┐
│ Cloner  │  clone_repo() or extract_zip()
└────┬────┘
     │ Path to source directory
     ▼
┌─────────┐
│ Parser  │  parse_project() → list[ParsedFile]
└────┬────┘
     │ Structured extraction results
     ▼
┌──────────────┐
│ Graph Builder │  build_graph() → NetworkX DiGraph
└────┬─────────┘
     │
     ▼
┌──────────────────┐
│ Cytoscape Export  │  graph_to_cytoscape_json() → dict
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│ In-Memory Store   │  project_store[project_id] = json
└──────────────────┘
```

## Cloner Service

**`services/cloner.py`**

Two ingestion methods:

- **`clone_repo(url, dest, branch)`** — Validates the GitHub URL against a regex, performs a shallow clone (`depth=1`) using GitPython.
- **`extract_zip(upload_file, dest)`** — Saves the uploaded file, extracts with `zipfile`, includes zip-slip protection. If the archive has a single root directory, returns that directory.

## Parser Service

**`services/parser.py`** — Orchestrator

Walks the project directory recursively. For each file:

1. Checks if the directory is in the skip list
2. Checks if the extension is supported
3. Dispatches to the appropriate language parser
4. Returns a `ParsedFile` with extracted functions, classes, and imports

**`services/parsers/python_parser.py`**

Extracts from Python files using Tree-sitter:

| Element | Tree-sitter Node Types |
|---------|----------------------|
| Functions | `function_definition` |
| Classes | `class_definition` (with base classes) |
| Methods | `function_definition` inside class body |
| Imports | `import_statement`, `import_from_statement` |

**`services/parsers/js_ts_parser.py`**

Extracts from JavaScript/TypeScript files:

| Element | Tree-sitter Node Types |
|---------|----------------------|
| Functions | `function_declaration` |
| Arrow functions | `arrow_function` inside `variable_declarator` |
| Classes | `class_declaration` (with heritage) |
| Methods | `method_definition` inside class body |
| Imports | `import_statement` |
| Exports | Exported declarations are unwrapped |

## Graph Builder

**`services/graph_builder.py`**

Constructs a `networkx.DiGraph` with the following node and edge types:

### Node Types

| Type | ID Format | Example |
|------|-----------|---------|
| Module | `mod:{path}` | `mod:src/utils.py` |
| Class | `class:{path}:{name}` | `class:src/models.py:User` |
| Function | `func:{path}:{name}` | `func:src/main.py:run` |
| Method | `func:{path}:{class}.{name}` | `func:src/models.py:User.save` |
| External | `ext:{module}` | `ext:flask` |

### Edge Types

| Relationship | Meaning |
|-------------|---------|
| `contains` | Module contains class/function, class contains method |
| `imports` | Module imports another module |
| `inherits` | Class extends another class |

### Import Resolution

Imports are resolved by converting file paths to dotted module paths and matching against import statements. Unresolved imports (third-party packages) are represented as `external` nodes.
