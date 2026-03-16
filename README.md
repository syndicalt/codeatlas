# CodeAtlas

**AI-Powered Code Knowledge Graph Explorer**

CodeAtlas transforms complex codebases into intuitive, interactive knowledge graphs. Point it at a GitHub repository or upload a ZIP file, and it parses the code to build a visual map of modules, classes, functions, dependencies, call chains, and inheritance — all rendered as an interactive graph in your browser.

## Features

- **Multi-language parsing** — Python, JavaScript, TypeScript, and Java via Tree-sitter
- **Call chain analysis** — Trace function invocations across files
- **Automatic graph generation** — Extracts functions, classes, imports, inheritance, and call relationships
- **Interactive visualization** — Zoom, pan, search, filter, and click-to-inspect with Cytoscape.js
- **Dashboard split view** — Graph canvas with a collapsible detail panel
- **Search and filter** — Find nodes by name, type, or file path with real-time highlighting
- **Dependency scope filtering** — Toggle between all, internal, or external dependencies
- **Graph export** — Download as PNG or JSON
- **Background processing** — Large repos are analyzed asynchronously with progress tracking
- **Demo mode** — Try a pre-loaded sample project instantly
- **Color-coded nodes** — Modules (blue), classes (green), functions (orange), external deps (gray)

## Quick Start

### Backend

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173), paste a GitHub URL, drop a ZIP, or click **Try Demo Project**.

## Project Structure

```
codeatlas/
├── backend/                 # Python FastAPI server
│   ├── app/
│   │   ├── main.py          # App entry point
│   │   ├── config.py        # Environment settings
│   │   ├── routers/         # API endpoints (ingest, graph)
│   │   ├── services/        # Business logic
│   │   │   ├── cloner.py    # Git clone + ZIP extraction
│   │   │   ├── parser.py    # Tree-sitter parsing orchestrator
│   │   │   ├── graph_builder.py  # NetworkX → Cytoscape.js
│   │   │   ├── graph_query.py    # Search, filter, call chain queries
│   │   │   ├── task_manager.py   # Background task status tracking
│   │   │   └── parsers/     # Language-specific parsers (Python, JS/TS, Java)
│   │   ├── models/          # Pydantic schemas
│   │   └── data/sample/     # Bundled demo project
│   └── tests/               # Pytest test suite (21 tests)
├── frontend/                # React + TypeScript + Vite
│   └── src/
│       ├── components/      # LandingPage, GraphView (split dashboard)
│       ├── hooks/           # useTaskPolling
│       ├── api/             # Backend API client
│       └── types/           # TypeScript interfaces
└── docs/                    # Documentation (MkDocs)
```

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ingest/github` | POST | Analyze a GitHub repository |
| `/api/ingest/upload` | POST | Analyze a ZIP file upload |
| `/api/ingest/demo` | POST | Load the demo project |
| `/api/ingest/status/{id}` | GET | Poll task processing status |
| `/api/graph/{id}` | GET | Retrieve graph data |
| `/api/graph/{id}/search` | GET | Search nodes by name, type, file |
| `/api/graph/{id}/filter` | GET | Filter by dependency scope |
| `/api/graph/{id}/callchain/{node}` | GET | Trace call chain from a node |
| `/api/graph/{id}/export` | GET | Export graph as JSON |
| `/health` | GET | Server health check |

Full API docs available at `http://localhost:8000/docs` when the server is running.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.10+, FastAPI, NetworkX, Tree-sitter, GitPython |
| Frontend | TypeScript, React, Cytoscape.js, Tailwind CSS, Vite |
| Testing | Pytest (backend, 21 tests), TypeScript compiler (frontend) |
| Docs | MkDocs Material |

## Running Tests

```bash
cd backend
python -m pytest tests/ -v
```

## Documentation

Full documentation is available at the [docs site](docs/) and covers:

- [Installation](docs/getting-started/installation.md)
- [Quick Start](docs/getting-started/quickstart.md)
- [Configuration](docs/getting-started/configuration.md)
- [Architecture](docs/architecture/overview.md)
- [API Reference](docs/api/endpoints.md)
- [Contributing](docs/development/contributing.md)
- [Roadmap](docs/development/roadmap.md)

## Roadmap

- **Phase 1** :white_check_mark: Core ingestion & basic graph
- **Phase 2** :white_check_mark: Advanced visuals (search, filter, call chains, export, Java support)
- **Phase 3** Git history integration (time slider, churn metrics)
- **Phase 4** RAG agent (natural language queries)
- **Phase 5** Polish & extensibility (plugins, auth, collaboration)

## License

MIT
