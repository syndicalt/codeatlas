# Architecture Overview

CodeAtlas follows a client-server architecture with a Python backend handling code analysis and a React frontend providing interactive visualization.

## High-Level Diagram

```
┌─────────────────────────────────────────────────────┐
│                    Browser (Frontend)               │
│                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │ Landing Page │  │  Graph View  │  │  Detail   │  │
│  │ (UploadForm) │  │ (Cytoscape)  │  │  Panel    │  │
│  └──────┬───────┘  └──────▲───────┘  └───────────┘  │
│         │                 │                         │
│         ▼                 │                         │
│  ┌──────────────────────────────────────┐           │
│  │           API Client (fetch)         │           │
│  └──────────────────┬───────────────────┘           │
└─────────────────────┼───────────────────────────────┘
                      │ HTTP (JSON)
┌─────────────────────┼───────────────────────────────┐
│                 Backend (FastAPI)                   │
│                      │                              │
│  ┌───────────────────▼──────────────────┐           │
│  │             API Routers              │           │
│  │   /api/ingest/*    /api/graph/*      │           │
│  └───────────────────┬──────────────────┘           │
│                      │                              │
│  ┌───────────────────▼──────────────────┐           │
│  │            Service Layer             │           │
│  │                                      │           │
│  │  ┌─────────┐ ┌──────────┐ ┌────────┐ │           │
│  │  │ Cloner  │ │ Parser   │ │ Graph  │ │           │
│  │  │(Git/ZIP)│ │(T-sitter)│ │Builder │ │           │
│  │  └─────────┘ └──────────┘ └────────┘ │           │
│  └──────────────────────────────────────┘           │
│                                                     │
│  ┌──────────────────────────────────────┐           │
│  │        In-Memory Project Store       │           │
│  │       (project_id → graph JSON)      │           │
│  └──────────────────────────────────────┘           │
└─────────────────────────────────────────────────────┘
```

## Key Design Decisions

### In-Memory Storage (Phase 1)

Graph data is stored in a Python dictionary keyed by project UUID. This keeps the architecture simple with no database dependency. The tradeoff is that data is lost on server restart. Phase 2 will introduce persistent storage via Neo4j.

### Cytoscape.js-Native JSON

The backend exports graph data directly in Cytoscape.js element format. This eliminates any translation layer in the frontend — the JSON from the API can be fed directly into the Cytoscape renderer.

### Synchronous Processing

Ingestion (clone/extract → parse → build graph) happens synchronously within a single HTTP request. For repositories with up to ~2000 files, this completes in seconds. Larger repos will benefit from background task processing in Phase 2.

### Shallow Clones

GitHub repos are cloned with `depth=1` to minimize network transfer and disk usage. Full history is not needed for structural analysis in Phase 1.

## Technology Choices

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Backend framework | FastAPI | Async-capable, auto-generated docs, Pydantic validation |
| Code parsing | Tree-sitter | Language-agnostic, fast, accurate syntax trees |
| Graph library | NetworkX | Mature, Pythonic API, good for in-memory graphs |
| Frontend framework | React + TypeScript | Type safety, component model, ecosystem |
| Graph rendering | Cytoscape.js | Feature-rich graph visualization, supports large graphs |
| Styling | Tailwind CSS | Utility-first, fast iteration, minimal CSS |
| Build tool | Vite | Fast HMR, native TypeScript support |
