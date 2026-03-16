# CodeAtlas

**AI-Powered Code Knowledge Graph Explorer**

CodeAtlas transforms complex codebases into intuitive, interactive knowledge graphs. Point it at a GitHub repository or upload a ZIP file, and it parses the code to build a visual map of modules, classes, functions, dependencies, call chains, and inheritance — all rendered as an interactive graph in your browser. Ask natural language questions about your codebase with the built-in AI chat.

## Features

### Graph Generation
- **Multi-language parsing** — Python, JavaScript, TypeScript, and Java via Tree-sitter
- **Automatic graph generation** — Extracts functions, classes, imports, inheritance, and call relationships
- **Call chain analysis** — Trace function invocations across files
- **Directory clustering** — Nodes are grouped by directory for visual clarity
- **Connection-based sizing** — Highly connected nodes appear larger for instant visual hierarchy

### Interactive Visualization
- **5 themes** — Dark, Light, Neon, Sunset, and High Contrast
- **Dashboard split view** — Graph canvas with a resizable detail + chat panel
- **Search and filter** — Find nodes by name, type, or file path with real-time highlighting
- **Dependency scope filtering** — Toggle between all, internal, or external dependencies
- **Graph export** — Download as PNG or JSON, or share via link
- **Adaptive layout** — fCoSE force-directed layout with parameters tuned to graph size

### AI-Powered Queries (Ask AI)
- **Natural language chat** — Ask questions like "What are the main modules?" or "Show the call chain for this function"
- **Multi-provider LLM support** — Anthropic (Claude), OpenAI, Google Gemini, xAI (Grok), and Ollama (local)
- **RAG pipeline** — Vector search over graph nodes, relationships, and commit history via FAISS + sentence-transformers
- **Tool-augmented agent** — The AI can search the codebase, trace call chains, inspect nodes, and query commit history
- **Local fallback** — Works without an API key using vector search only

### Git History
- **Time slider** — Animate graph changes across commits
- **Churn metrics** — See which files change most frequently
- **Contributor view** — See who owns which parts of the codebase
- **Diff highlighting** — Added, removed, and modified nodes are color-coded

### User Accounts & Settings
- **OAuth login** — Sign in with GitHub or Google
- **Bring your own API key** — Store encrypted keys for any supported LLM provider
- **Model preferences** — Choose your preferred provider and model
- **Atlas history** — Track previously generated graphs

### Deployment
- **Docker** — Single-container multi-stage build (frontend + backend)
- **Background processing** — Large repos are analyzed asynchronously with progress tracking
- **Rate limiting** — Configurable per-endpoint rate limits via SlowAPI
- **Real-time collaboration** — WebSocket-based presence (experimental)

## Quick Start

### Backend

```bash
cd backend
pip install -r requirements.txt
cp ../.env.example .env  # Edit with your OAuth/API credentials
python -m uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173), paste a GitHub URL, drop a ZIP, or click **Try Demo Project**.

### Docker (single container)

```bash
docker build -t codeatlas .
docker run -p 8000:8000 codeatlas
```

## Project Structure

```
codeatlas/
├── backend/                 # Python FastAPI server
│   ├── app/
│   │   ├── main.py          # App entry point, middleware, static serving
│   │   ├── config.py        # Environment settings
│   │   ├── dependencies.py  # Auth dependency injection
│   │   ├── routers/         # API endpoints
│   │   │   ├── ingest.py    # GitHub/ZIP/demo ingestion
│   │   │   ├── graph.py     # Graph data, search, filter, export
│   │   │   ├── rag.py       # AI chat queries
│   │   │   ├── auth.py      # OAuth (GitHub + Google)
│   │   │   ├── user.py      # API keys, preferences, history
│   │   │   ├── history.py   # Git history timeline, diff, churn
│   │   │   ├── share.py     # Shareable graph links
│   │   │   └── ws.py        # WebSocket collaboration
│   │   ├── services/        # Business logic
│   │   │   ├── cloner.py    # Git clone + ZIP extraction
│   │   │   ├── parser.py    # Tree-sitter parsing orchestrator
│   │   │   ├── graph_builder.py  # NetworkX → Cytoscape.js
│   │   │   ├── graph_query.py    # Search, filter, call chain queries
│   │   │   ├── rag_agent.py      # Tool-augmented LLM agent
│   │   │   ├── llm_providers.py  # Multi-provider LLM abstraction
│   │   │   ├── vector_index.py   # FAISS vector index
│   │   │   ├── database.py       # SQLite (users, API keys, history)
│   │   │   ├── encryption.py     # Fernet key encryption
│   │   │   ├── auth.py           # JWT + OAuth code exchange
│   │   │   ├── task_manager.py   # Background task status tracking
│   │   │   ├── history_analyzer.py # Git history analysis
│   │   │   └── parsers/     # Language-specific parsers (Python, JS/TS, Java)
│   │   ├── models/          # Pydantic schemas
│   │   ├── middleware/       # Rate limiting
│   │   └── data/sample/     # Bundled demo project
│   └── tests/               # Pytest test suite
├── frontend/                # React + TypeScript + Vite
│   └── src/
│       ├── components/      # LandingPage, GraphView, ChatPanel, SettingsPage, etc.
│       ├── contexts/        # AuthContext (user state, JWT management)
│       ├── hooks/           # useTaskPolling, useCollaboration
│       ├── api/             # Backend API client + auth client
│       └── types/           # TypeScript interfaces
├── docs/                    # Documentation (MkDocs Material)
├── Dockerfile               # Multi-stage build for single-container deploy
├── .env.example             # Environment variable template
└── .github/workflows/       # CI/CD (docs deployment)
```

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ingest/github` | POST | Analyze a GitHub repository |
| `/api/ingest/upload` | POST | Analyze a ZIP file upload |
| `/api/ingest/demo` | POST | Load the demo project |
| `/api/ingest/import` | POST | Import a previously exported JSON |
| `/api/ingest/status/{id}` | GET | Poll task processing status |
| `/api/graph/{id}` | GET | Retrieve graph data |
| `/api/graph/{id}/search` | GET | Search nodes by name, type, file |
| `/api/graph/{id}/filter` | GET | Filter by dependency scope |
| `/api/graph/{id}/callchain/{node}` | GET | Trace call chain from a node |
| `/api/graph/{id}/export` | GET | Export graph as JSON |
| `/api/rag/{id}/query` | POST | AI chat query (requires API key) |
| `/api/rag/{id}/index-status` | GET | Check vector index status |
| `/api/rag/{id}/build-index` | POST | Manually build vector index |
| `/api/history/{id}/timeline` | GET | Get commit timeline |
| `/api/history/{id}/at/{sha}` | GET | Get graph at a specific commit |
| `/api/history/{id}/diff` | GET | Get diff between commits |
| `/api/history/{id}/churn` | GET | Get file churn metrics |
| `/api/history/{id}/contributors` | GET | Get contributor data |
| `/api/auth/github` | GET | GitHub OAuth redirect |
| `/api/auth/google` | GET | Google OAuth redirect |
| `/api/auth/me` | GET | Current user profile |
| `/api/user/api-keys` | GET/PUT/DELETE | Manage LLM API keys |
| `/api/user/preferences` | PUT | Update model preferences |
| `/api/share/{id}` | POST/GET | Create/fetch shared graph links |
| `/health` | GET | Server health check |

Full interactive API docs at `http://localhost:8000/docs` when the server is running.

## Configuration

Copy `.env.example` to `backend/.env` and configure:

| Variable | Description |
|----------|-------------|
| `CODEATLAS_GITHUB_CLIENT_ID/SECRET` | GitHub OAuth app credentials |
| `CODEATLAS_GOOGLE_CLIENT_ID/SECRET` | Google OAuth app credentials |
| `CODEATLAS_ANTHROPIC_API_KEY` | Server-level fallback LLM key (optional) |
| `CODEATLAS_JWT_SECRET` | JWT signing secret (auto-generated if empty) |
| `CODEATLAS_ENCRYPTION_KEY` | Fernet key for API key encryption (auto-generated if empty) |
| `CODEATLAS_FRONTEND_URL` | Frontend URL for OAuth redirects |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.10+, FastAPI, NetworkX, Tree-sitter, GitPython, SlowAPI |
| AI/RAG | Anthropic/OpenAI/Gemini/Grok/Ollama, FAISS, sentence-transformers |
| Database | SQLite (aiosqlite), Fernet encryption, PyJWT |
| Frontend | TypeScript, React, Cytoscape.js (fCoSE layout), Tailwind CSS, Vite |
| Deployment | Docker (multi-stage), Railway, Fly.io |
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
- **Phase 2** :white_check_mark: Advanced visuals (search, filter, call chains, export, Java support)
- **Phase 3** :white_check_mark: Git history integration (time slider, churn metrics, contributors)
- **Phase 4** :white_check_mark: RAG agent (multi-provider AI chat, vector search, tool-augmented queries)
- **Phase 5** :white_check_mark: Polish & extensibility (OAuth, API key management, Docker deploy, graph styling, rate limiting, WebSocket collaboration)

## License

MIT
