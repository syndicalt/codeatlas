# CodeAtlas

**AI-Powered Code Knowledge Graph Explorer**

CodeAtlas transforms complex codebases into intuitive, interactive knowledge graphs. Point it at a GitHub repository or upload a ZIP file, and it parses the code to build a visual map of modules, classes, functions, dependencies, and inheritance — all rendered as an interactive graph in your browser.

## Features

- **Multi-language parsing** — Python, JavaScript, and TypeScript via Tree-sitter
- **Automatic graph generation** — Extracts functions, classes, imports, and inheritance hierarchies
- **Interactive visualization** — Zoom, pan, click-to-inspect nodes with Cytoscape.js
- **Color-coded nodes** — Modules (blue), classes (green), functions (orange), external deps (gray)
- **Two input modes** — GitHub URL or ZIP file upload

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

Open [http://localhost:5173](http://localhost:5173), paste a GitHub URL or drop a ZIP, and explore the graph.

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
│   │   │   └── parsers/     # Language-specific parsers
│   │   └── models/          # Pydantic schemas
│   └── tests/               # Pytest test suite
├── frontend/                # React + TypeScript + Vite
│   └── src/
│       ├── components/      # LandingPage, GraphView
│       ├── api/             # Backend API client
│       └── types/           # TypeScript interfaces
└── docs/                    # Documentation (MkDocs)
```

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ingest/github` | POST | Analyze a GitHub repository |
| `/api/ingest/upload` | POST | Analyze a ZIP file upload |
| `/api/graph/{project_id}` | GET | Retrieve graph data |
| `/health` | GET | Server health check |

Full API docs available at `http://localhost:8000/docs` when the server is running.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.10+, FastAPI, NetworkX, Tree-sitter, GitPython |
| Frontend | TypeScript, React, Cytoscape.js, Tailwind CSS, Vite |
| Testing | Pytest (backend), TypeScript compiler (frontend) |
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
- **Phase 2** Advanced visuals (search, filter, call chains, export)
- **Phase 3** Git history integration (time slider, churn metrics)
- **Phase 4** RAG agent (natural language queries)
- **Phase 5** Polish & extensibility (plugins, auth, collaboration)

## License

MIT
