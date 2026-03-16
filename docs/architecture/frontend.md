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
    │   ├── LandingPage.tsx  # Upload form + demo button + task polling
    │   └── GraphView.tsx    # Dashboard: graph canvas + search/filter + detail panel
    ├── hooks/
    │   └── useTaskPolling.ts # Poll background task status
    └── types/
        └── graph.ts         # TypeScript interfaces for API data
```

## Routing

| Path | Component | Purpose |
|------|-----------|---------|
| `/` | `LandingPage` | Repository URL input, ZIP upload, and demo button |
| `/graph/:projectId` | `GraphView` | Dashboard with graph visualization |

After successful ingestion, the user is automatically navigated to the graph view once background processing completes.

## Components

### LandingPage

Three input methods:

1. **GitHub URL** — Text input with "Parse" button. Calls `POST /api/ingest/github`.
2. **ZIP Upload** — Drag-and-drop zone with click-to-browse fallback. Calls `POST /api/ingest/upload`.
3. **Demo** — "Try Demo Project" button. Calls `POST /api/ingest/demo`.

All three use background processing: the response returns `status: "processing"` and the component polls `/api/ingest/status/{id}` every 1.5 seconds via the `useTaskPolling` hook. A progress bar shows processing progress. On completion, navigates to the graph view.

### GraphView (Dashboard)

Split-view layout:

- **Left (~75%)** — Cytoscape.js graph canvas with a legend overlay
- **Right (320px)** — Collapsible detail panel showing selected node properties and connections

**Toolbar features:**

- **Search input** — Debounced text search (300ms). Matching nodes are highlighted with a yellow border; non-matching nodes dim to 20% opacity.
- **Type filter dropdown** — All / Module / Class / Function / External
- **Scope toggle** — All / Internal / External. Fetches a filtered subgraph from the backend and re-renders.
- **Export buttons** — PNG (client-side via `cy.png()`) and JSON (server-side download)
- **Panel toggle** — Show/Hide the detail panel

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
| Calls | Pink | Dotted |

**Layout:** Uses the COSE (Compound Spring Embedder) algorithm for automatic node positioning.

**Detail Panel:** Shows the selected node's type, file, line, directory, and connection count. Lists all incoming and outgoing edges grouped by relationship. Clicking a connected node navigates to its details.

## API Client

`api/client.ts` provides these functions:

```typescript
// Ingestion
ingestGitHub(url, branch?): Promise<IngestResponse>
ingestUpload(file): Promise<IngestResponse>
ingestDemo(): Promise<IngestResponse>
getTaskStatus(projectId): Promise<TaskStatus>

// Graph data
fetchGraph(projectId): Promise<GraphResponse>
searchGraph(projectId, query?, type?, file?): Promise<SearchResult>
filterGraph(projectId, scope): Promise<GraphResponse>
getCallChain(projectId, nodeId, direction?, depth?): Promise<GraphResponse>
exportGraphJSON(projectId): string  // Returns download URL
```

All requests go through Vite's development proxy (`/api` → `http://localhost:8000`).

## Hooks

### useTaskPolling

Custom hook that polls task status every 1.5 seconds:

```typescript
const task = useTaskPolling(projectId)
// task: { status, progress, error_message, node_count, edge_count } | null
```

Automatically stops polling when status reaches `ready` or `error`.

## Type Definitions

TypeScript interfaces in `types/graph.ts` mirror the backend Pydantic schemas:

- `GraphNode` — includes `directory` and `connections` fields
- `GraphEdge` — includes `weight` field
- `TaskStatus` — status polling response
- `SearchResult` — search response with `total_matches`
- `DependencyScope` — `'all' | 'internal' | 'external'`
