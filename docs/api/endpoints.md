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

Clone and analyze a GitHub repository.

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
  "status": "ready",
  "node_count": 128,
  "edge_count": 245
}
```

**Errors:**

| Status | Condition |
|--------|-----------|
| `400` | Invalid GitHub URL |
| `400` | No supported source files found |
| `500` | Clone failed (network, auth, etc.) |

---

### `POST /api/ingest/upload`

Upload and analyze a ZIP archive.

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
  "status": "ready",
  "node_count": 42,
  "edge_count": 78
}
```

**Errors:**

| Status | Condition |
|--------|-----------|
| `400` | File is not a `.zip` |
| `400` | ZIP contains path traversal (zip slip) |
| `400` | No supported source files found |
| `500` | Extraction failed |

---

## Graph Data

### `GET /api/graph/{project_id}`

Retrieve the knowledge graph for an analyzed project.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `project_id` | string (UUID) | Project identifier from ingestion response |

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
          "line": 1
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
          "relationship": "contains"
        }
      }
    ]
  }
}
```

**Errors:**

| Status | Condition |
|--------|-----------|
| `404` | Project ID not found (may have been lost on server restart) |
