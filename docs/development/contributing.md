# Contributing

## Project Structure

```
codeatlas/
├── backend/              # Python FastAPI server
│   ├── app/
│   │   ├── main.py       # FastAPI app, CORS, lifespan
│   │   ├── config.py     # Settings via pydantic-settings
│   │   ├── routers/
│   │   │   ├── ingest.py # Ingestion + demo + status endpoints
│   │   │   └── graph.py  # Graph data + search + filter + callchain + export
│   │   ├── services/
│   │   │   ├── models.py         # Shared dataclasses
│   │   │   ├── cloner.py         # Git clone + ZIP extraction
│   │   │   ├── parser.py         # Orchestrator: dispatches to language parsers
│   │   │   ├── graph_builder.py  # NetworkX graph + Cytoscape JSON export
│   │   │   ├── graph_query.py    # Search, filter, call chain traversal
│   │   │   ├── task_manager.py   # Background task status tracking
│   │   │   └── parsers/
│   │   │       ├── python_parser.py  # Tree-sitter Python
│   │   │       ├── js_ts_parser.py   # Tree-sitter JS/TS
│   │   │       └── java_parser.py    # Tree-sitter Java
│   │   ├── models/
│   │   │   └── schemas.py   # Pydantic request/response models
│   │   └── data/
│   │       └── sample/       # Bundled demo project
│   └── tests/                # Pytest tests (21 tests)
├── frontend/                 # React TypeScript app
│   └── src/
│       ├── api/
│       │   └── client.ts     # Backend API wrapper functions
│       ├── components/
│       │   ├── LandingPage.tsx  # Upload form + demo + task polling
│       │   └── GraphView.tsx    # Dashboard: graph + search + detail panel
│       ├── hooks/
│       │   └── useTaskPolling.ts # Poll background task status
│       └── types/
│           └── graph.ts      # TypeScript interfaces
└── docs/                     # Documentation (MkDocs Material)
```

## Development Setup

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Adding a New Language Parser

To add support for a new programming language:

1. **Create the parser** at `backend/app/services/parsers/{language}_parser.py`

    ```python
    from app.services.models import ClassDef, FunctionDef, ImportDef, ParsedFile

    def parse_{language}(source: str, rel_path: str, language: str) -> ParsedFile:
        # Use tree-sitter to parse the source
        # Extract functions, classes, imports, and function calls
        # Return a ParsedFile
        ...
    ```

2. **Register the parser** in `backend/app/services/parser.py`

    Add the file extension to `LANGUAGE_MAP` and the parser function to `PARSER_MAP`.

3. **Update configuration** in `backend/app/config.py`

    Add the file extension to `allowed_extensions`.

4. **Write tests** in `backend/tests/test_parser.py`

    Add test cases for the new language's functions, classes, imports, and function calls.

## Code Style

- **Backend:** Follow PEP 8. Type hints are used throughout.
- **Frontend:** TypeScript strict mode. Functional components with hooks.
- **Commits:** Use descriptive commit messages summarizing the change.

## Running Tests

```bash
# Backend
cd backend
python -m pytest tests/ -v

# Frontend
cd frontend
npm run build  # Type check via build
```
