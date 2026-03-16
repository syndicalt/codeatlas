# Frontend Architecture

The frontend is a React + TypeScript single-page application located in `frontend/`.

## Directory Structure

```
frontend/
├── index.html              # Entry HTML
├── package.json            # Dependencies
├── vite.config.ts          # Vite config (React plugin, Tailwind, API proxy)
├── tsconfig.json           # TypeScript config
└── src/
    ├── main.tsx            # React entry, BrowserRouter setup
    ├── App.tsx             # Route definitions
    ├── index.css           # Global styles (Tailwind import)
    ├── api/
    │   └── client.ts       # Backend API wrapper functions
    ├── components/
    │   ├── LandingPage.tsx  # Upload form (URL + ZIP drop zone)
    │   └── GraphView.tsx    # Cytoscape.js graph visualization
    └── types/
        └── graph.ts         # TypeScript interfaces for API data
```

## Routing

The app has two routes managed by React Router:

| Path | Component | Purpose |
|------|-----------|---------|
| `/` | `LandingPage` | Repository URL input and ZIP upload |
| `/graph/:projectId` | `GraphView` | Interactive graph visualization |

After successful ingestion, the user is automatically navigated to the graph view.

## Components

### LandingPage

Two input methods:

1. **GitHub URL** — Text input with "Parse" button. Calls `POST /api/ingest/github`.
2. **ZIP Upload** — Drag-and-drop zone with click-to-browse fallback. Calls `POST /api/ingest/upload`.

Both show a loading spinner during analysis and display error messages on failure.

### GraphView

Renders the knowledge graph using Cytoscape.js with these features:

**Node Styles:**

| Type | Color | Shape |
|------|-------|-------|
| Module | Blue (`#3b82f6`) | Rounded rectangle |
| Class | Green (`#22c55e`) | Diamond |
| Function | Orange (`#f97316`) | Ellipse |
| External | Gray (`#64748b`) | Dashed rectangle |

**Edge Styles:**

| Relationship | Color | Style |
|-------------|-------|-------|
| Contains | Gray | Solid |
| Imports | Blue | Dashed |
| Inherits | Purple | Solid, thicker |

**Layout:** Uses the COSE (Compound Spring Embedder) algorithm for automatic node positioning.

**Interactions:**

- Click a node to see details (file path, line number, type) in the bottom panel
- Click empty space to deselect
- Scroll to zoom, drag to pan
- Drag nodes to reposition

## API Client

`api/client.ts` provides three functions:

```typescript
ingestGitHub(url: string, branch?: string): Promise<IngestResponse>
ingestUpload(file: File): Promise<IngestResponse>
fetchGraph(projectId: string): Promise<GraphResponse>
```

All requests go through Vite's development proxy (`/api` → `http://localhost:8000`).

## Type Definitions

TypeScript interfaces in `types/graph.ts` mirror the backend Pydantic schemas, providing type safety across the stack.
