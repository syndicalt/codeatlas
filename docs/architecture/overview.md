# Architecture Overview

CodeAtlas follows a client-server architecture with a Python backend handling code analysis and a React frontend providing interactive visualization.

## High-Level Diagram

```
┌───────────────────────────────────────────────────────────┐
│                     Browser (Frontend)                    │
│                                                           │
│  ┌──────────────┐  ┌───────────────────────────────────┐  │
│  │ Landing Page  │  │        Dashboard (Split View)     │  │
│  │ (Upload Form) │  │  ┌──────────┐  ┌──────────────┐  │  │
│  │ (Demo Button) │  │  │  Graph   │  │   Detail     │  │  │
│  └──────┬───────┘  │  │  Canvas   │  │   Panel      │  │  │
│         │          │  └──────────┘  └──────────────┘  │  │
│         │          │  ┌─────────────────────────────┐  │  │
│         │          │  │ Search | Filter | Export     │  │  │
│         │          │  └─────────────────────────────┘  │  │
│         │          └───────────────────────────────────┘  │
│         ▼                          ▲                      │
│  ┌──────────────────────────────────────────────┐         │
│  │         API Client + Task Polling             │         │
│  └──────────────────┬───────────────────────────┘         │
└─────────────────────┼─────────────────────────────────────┘
                      │ HTTP (JSON)
┌─────────────────────┼─────────────────────────────────────┐
│                 Backend (FastAPI)                          │
│                      │                                    │
│  ┌───────────────────▼──────────────────────┐             │
│  │              API Routers                 │             │
│  │  /api/ingest/*   /api/graph/*            │             │
│  │  (github, upload, demo, status)          │             │
│  │  (search, filter, callchain, export)     │             │
│  └───────────────────┬──────────────────────┘             │
│                      │                                    │
│  ┌───────────────────▼──────────────────────┐             │
│  │             Service Layer                │             │
│  │                                          │             │
│  │  ┌─────────┐ ┌──────────┐ ┌───────────┐ │             │
│  │  │ Cloner  │ │ Parser   │ │ Graph     │ │             │
│  │  │(Git/ZIP)│ │(T-sitter)│ │ Builder   │ │             │
│  │  └─────────┘ └──────────┘ └───────────┘ │             │
│  │  ┌──────────────┐ ┌──────────────────┐   │             │
│  │  │ Graph Query  │ │ Task Manager     │   │             │
│  │  │(search/chain)│ │(background tasks)│   │             │
│  │  └──────────────┘ └──────────────────┘   │             │
│  └──────────────────────────────────────────┘             │
│                                                           │
│  ┌──────────────────────────────────────────┐             │
│  │        In-Memory Project Store           │             │
│  │  project_id → ProjectData                │             │
│  │  (Cytoscape JSON + NetworkX DiGraph)     │             │
│  └──────────────────────────────────────────┘             │
└───────────────────────────────────────────────────────────┘
```

## Key Design Decisions

### In-Memory Storage with Dual Representation

Each project stores both the Cytoscape.js JSON (for rendering) and the NetworkX DiGraph (for querying). This enables server-side search, filtering, and call chain traversal without reconstructing the graph. The tradeoff is higher memory usage per project and data loss on restart.

### Background Processing

Ingestion endpoints return immediately with `status: "processing"`. Parsing and graph building run as FastAPI background tasks. The frontend polls `/api/ingest/status/{id}` until completion. This prevents HTTP timeouts on large repositories.

### Cytoscape.js-Native JSON

The backend exports graph data directly in Cytoscape.js element format. This eliminates any translation layer in the frontend — the JSON from the API can be fed directly into the Cytoscape renderer.

### Call Chain Resolution

Function calls are extracted from AST bodies by all parsers. Resolution uses a priority system: same-file matches first, then same-directory, then global. This heuristic handles most cases without full type analysis.

### Shallow Clones

GitHub repos are cloned with `depth=1` to minimize network transfer and disk usage. Full history is not needed for structural analysis (will be added in Phase 3).

## Technology Choices

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Backend framework | FastAPI | Async-capable, auto-generated docs, background tasks, Pydantic validation |
| Code parsing | Tree-sitter | Language-agnostic, fast, accurate syntax trees |
| Graph library | NetworkX | Mature, Pythonic API, good for in-memory graphs and queries |
| Frontend framework | React + TypeScript | Type safety, component model, ecosystem |
| Graph rendering | Cytoscape.js | Feature-rich graph visualization, supports large graphs, client-side export |
| Styling | Tailwind CSS | Utility-first, fast iteration, minimal CSS |
| Build tool | Vite | Fast HMR, native TypeScript support |
