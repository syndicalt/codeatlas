# Architecture Overview

CodeAtlas follows a client-server architecture with a Python backend handling code analysis, AI queries, and user management, and a React frontend providing interactive visualization and chat.

## High-Level Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                      Browser (Frontend)                        │
│                                                                │
│  ┌──────────────┐  ┌────────────────────────────────────────┐  │
│  │ Landing Page  │  │         Dashboard (Split View)         │  │
│  │ (Upload Form) │  │  ┌──────────┐  ┌──────────────────┐   │  │
│  │ (Demo Button) │  │  │  Graph   │  │  Detail / Ask AI │   │  │
│  │ (Recent List) │  │  │  Canvas  │  │  (resizable)     │   │  │
│  └──────┬───────┘  │  └──────────┘  └──────────────────┘   │  │
│         │          │  ┌──────────────────────────────────┐   │  │
│         │          │  │ Search│Filter│Theme│History│Share │   │  │
│         │          │  └──────────────────────────────────┘   │  │
│         │          └────────────────────────────────────────┘  │
│         │          ┌───────────────┐ ┌───────────────────┐    │
│         │          │ Settings Page │ │  Auth Callback    │    │
│         │          │ (Keys/Prefs)  │ │  (OAuth return)   │    │
│         │          └───────────────┘ └───────────────────┘    │
│         ▼                          ▲                          │
│  ┌────────────────────────────────────────────────────┐       │
│  │     API Client + Auth Context + Task Polling       │       │
│  └──────────────────┬─────────────────────────────────┘       │
└─────────────────────┼─────────────────────────────────────────┘
                      │ HTTP (JSON) + WebSocket
┌─────────────────────┼─────────────────────────────────────────┐
│                 Backend (FastAPI)                              │
│                      │                                        │
│  ┌───────────────────▼────────────────────────┐               │
│  │               API Routers                  │               │
│  │  /api/ingest/*   /api/graph/*              │               │
│  │  /api/rag/*      /api/history/*            │               │
│  │  /api/auth/*     /api/user/*               │               │
│  │  /api/share/*    /api/ws/*                 │               │
│  └───────────────────┬────────────────────────┘               │
│                      │                                        │
│  ┌───────────────────▼────────────────────────┐               │
│  │              Service Layer                 │               │
│  │                                            │               │
│  │  ┌─────────┐ ┌──────────┐ ┌─────────────┐ │               │
│  │  │ Cloner  │ │ Parser   │ │ Graph       │ │               │
│  │  │(Git/ZIP)│ │(T-sitter)│ │ Builder     │ │               │
│  │  └─────────┘ └──────────┘ └─────────────┘ │               │
│  │  ┌──────────────┐ ┌────────────────────┐   │               │
│  │  │ Graph Query  │ │  RAG Agent         │   │               │
│  │  │(search/chain)│ │  (tool-augmented)  │   │               │
│  │  └──────────────┘ └────────────────────┘   │               │
│  │  ┌──────────────┐ ┌────────────────────┐   │               │
│  │  │ LLM Providers│ │  Vector Index      │   │               │
│  │  │(multi-vendor)│ │  (FAISS + S-Trans) │   │               │
│  │  └──────────────┘ └────────────────────┘   │               │
│  │  ┌──────────────┐ ┌────────────────────┐   │               │
│  │  │ Auth + JWT   │ │  Encryption        │   │               │
│  │  │(GitHub/Google)│ │  (Fernet)         │   │               │
│  │  └──────────────┘ └────────────────────┘   │               │
│  │  ┌──────────────┐ ┌────────────────────┐   │               │
│  │  │ Task Manager │ │ History Analyzer   │   │               │
│  │  │(bg tasks)    │ │ (git log/diff)     │   │               │
│  │  └──────────────┘ └────────────────────┘   │               │
│  └────────────────────────────────────────────┘               │
│                                                               │
│  ┌────────────────────────────────────────────┐               │
│  │      In-Memory Project Store + SQLite DB   │               │
│  │  project_id → ProjectData                  │               │
│  │  (Cytoscape JSON + NetworkX DiGraph)        │               │
│  │  users, api_keys, atlas_history (SQLite)   │               │
│  └────────────────────────────────────────────┘               │
└───────────────────────────────────────────────────────────────┘
```

## Key Design Decisions

### In-Memory Storage with Dual Representation

Each project stores both the Cytoscape.js JSON (for rendering) and the NetworkX DiGraph (for querying). This enables server-side search, filtering, and call chain traversal without reconstructing the graph. The tradeoff is higher memory usage per project and data loss on restart.

### Background Processing

Ingestion endpoints return immediately with `status: "processing"`. Parsing and graph building run as FastAPI background tasks. The frontend polls `/api/ingest/status/{id}` until completion. This prevents HTTP timeouts on large repositories.

### Cytoscape.js-Native JSON

The backend exports graph data directly in Cytoscape.js element format, including compound parent nodes for directory grouping. This eliminates any translation layer in the frontend — the JSON from the API can be fed directly into the Cytoscape renderer.

### Call Chain Resolution

Function calls are extracted from AST bodies by all parsers. Resolution uses a priority system: same-file matches first, then same-directory, then global. This heuristic handles most cases without full type analysis.

### Multi-Provider LLM Abstraction

The RAG agent uses a provider-agnostic interface (`LLMProvider.chat()`) with tool definitions in Anthropic-style canonical format. Each provider converts to its native format (OpenAI function calling, Gemini function declarations, etc.). This allows users to bring their own API key for any supported provider.

### Stateless Auth with Encrypted Key Storage

Authentication uses stateless JWT tokens (7-day expiry). User API keys are encrypted at rest with Fernet symmetric encryption. The encryption key must be persisted in `.env` to survive backend restarts.

### Adaptive Graph Layout

The frontend uses fCoSE (fast Compound Spring Embedder) for all graph sizes, with parameters automatically tuned based on node count. Nodes are sized proportionally to their connection count, and modules are grouped into compound directory nodes for visual organization.

## Technology Choices

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Backend framework | FastAPI | Async-capable, auto-generated docs, background tasks, Pydantic validation |
| Code parsing | Tree-sitter | Language-agnostic, fast, accurate syntax trees |
| Graph library | NetworkX | Mature, Pythonic API, good for in-memory graphs and queries |
| LLM integration | Anthropic, OpenAI, Google GenAI, xAI, Ollama | Multi-provider flexibility via unified abstraction layer |
| Vector search | FAISS + sentence-transformers | Fast similarity search, small footprint, no external service needed |
| Database | SQLite (aiosqlite) | Zero-config, file-based, sufficient for user/key metadata |
| Encryption | Fernet (cryptography) | Symmetric, authenticated encryption for API key storage |
| Auth | PyJWT + OAuth2 | Stateless tokens, standard OAuth flow for GitHub/Google |
| Frontend framework | React + TypeScript | Type safety, component model, ecosystem |
| Graph rendering | Cytoscape.js + fCoSE | Feature-rich graph visualization, compound node support, client-side export |
| Styling | Tailwind CSS | Utility-first, fast iteration, minimal CSS |
| Build tool | Vite | Fast HMR, native TypeScript support |
| Deployment | Docker (multi-stage) | Single-container build combining frontend + backend |
| Rate limiting | SlowAPI | Simple decorator-based rate limiting for FastAPI |
