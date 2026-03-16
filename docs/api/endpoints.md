# API Endpoints

The backend exposes a REST API at `http://localhost:8000`. Interactive documentation is available at `/docs` (Swagger UI) and `/redoc` (ReDoc).

## Health Check

### `GET /health`

Returns server status.

**Response:**

```json
{"status": "ok"}
```

---

## Ingestion

### `POST /api/ingest/github`

Clone and analyze a GitHub repository. Processing runs in the background.

**Request Body:**

```json
{
  "url": "https://github.com/owner/repo",
  "branch": "main"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | Yes | Public GitHub repository URL |
| `branch` | string | No | Branch to clone (defaults to repo default) |

**Response:** `200 OK`

```json
{
  "project_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "node_count": 0,
  "edge_count": 0
}
```

**Errors:**

| Status | Condition |
|--------|-----------|
| `400` | Invalid GitHub URL |
| `500` | Clone failed (network, auth, etc.) |

---

### `POST /api/ingest/upload`

Upload and analyze a ZIP archive. Processing runs in the background.

**Request:** `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | file | Yes | ZIP archive containing source code |

**Example:**

```bash
curl -X POST http://localhost:8000/api/ingest/upload \
  -F "file=@my-project.zip"
```

**Response:** `200 OK`

```json
{
  "project_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing"
}
```

**Errors:**

| Status | Condition |
|--------|-----------|
| `400` | File is not a `.zip` |
| `400` | ZIP contains path traversal (zip slip) |
| `500` | Extraction failed |

---

### `POST /api/ingest/demo`

Load a pre-bundled sample project for demonstration.

**Response:** `200 OK`

```json
{
  "project_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing"
}
```

---

### `GET /api/ingest/status/{project_id}`

Poll the processing status of an ingestion task.

**Response:** `200 OK`

```json
{
  "project_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "ready",
  "progress": 100,
  "error_message": "",
  "node_count": 128,
  "edge_count": 245
}
```

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | `queued`, `processing`, `ready`, or `error` |
| `progress` | integer | 0–100 percentage |
| `error_message` | string | Non-empty when status is `error` |
| `node_count` | integer | Populated when status is `ready` |
| `edge_count` | integer | Populated when status is `ready` |

---

## Graph Data

### `GET /api/graph/{project_id}`

Retrieve the full knowledge graph for an analyzed project.

**Response:** `200 OK`

```json
{
  "project_id": "550e8400-e29b-41d4-a716-446655440000",
  "elements": {
    "nodes": [
      {
        "data": {
          "id": "mod:src/main.py",
          "label": "main",
          "type": "module",
          "file": "src/main.py",
          "line": 1,
          "directory": "src",
          "connections": 5
        },
        "classes": "module"
      }
    ],
    "edges": [
      {
        "data": {
          "id": "mod:src/main.py->func:src/main.py:run",
          "source": "mod:src/main.py",
          "target": "func:src/main.py:run",
          "relationship": "contains",
          "weight": 1
        }
      }
    ]
  }
}
```

**Errors:**

| Status | Condition |
|--------|-----------|
| `404` | Project ID not found |

---

### `GET /api/graph/{project_id}/search`

Search for nodes matching criteria. Returns matching nodes and their connected edges.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `q` | string | Name substring search (case-insensitive) |
| `type` | string | Node type: `module`, `class`, `function`, `external` |
| `file` | string | File path prefix filter |

**Example:**

```bash
curl "http://localhost:8000/api/graph/{id}/search?q=parse&type=function"
```

**Response:** `200 OK`

```json
{
  "project_id": "...",
  "elements": { "nodes": [...], "edges": [...] },
  "total_matches": 12
}
```

---

### `GET /api/graph/{project_id}/filter`

Filter the graph by dependency scope.

**Query Parameters:**

| Parameter | Values | Description |
|-----------|--------|-------------|
| `scope` | `all`, `internal`, `external` | Dependency scope |

- `all` — Full graph (default)
- `internal` — Excludes external dependency nodes
- `external` — Only modules that import external deps, plus the external nodes

**Response:** `200 OK` — Same format as `GET /api/graph/{project_id}`

---

### `GET /api/graph/{project_id}/callchain/{node_id}`

Trace the call chain from a function node.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `node_id` | string | Full node ID (e.g., `func:src/main.py:run`) |

**Query Parameters:**

| Parameter | Default | Description |
|-----------|---------|-------------|
| `direction` | `callees` | `callers` or `callees` |
| `depth` | `5` | Max traversal depth (1–20) |

**Example:**

```bash
curl "http://localhost:8000/api/graph/{id}/callchain/func:src/main.py:run?direction=callees&depth=3"
```

**Response:** `200 OK` — Subgraph containing the call chain nodes and edges

---

### `GET /api/graph/{project_id}/export`

Export the graph data.

**Query Parameters:**

| Parameter | Values | Description |
|-----------|--------|-------------|
| `format` | `json` | Export format |

JSON export returns the graph as a downloadable file. PNG and SVG export are handled client-side via the Cytoscape.js API.

**Response:** JSON file download with `Content-Disposition` header
