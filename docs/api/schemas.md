# Data Schemas

## Request Schemas

### IngestGitHubRequest

```json
{
  "url": "string (required)",
  "branch": "string | null (optional)"
}
```

## Response Schemas

### IngestResponse

Returned by both ingestion endpoints.

```json
{
  "project_id": "string (UUID)",
  "status": "string",
  "node_count": "integer",
  "edge_count": "integer"
}
```

### GraphResponse

Returned by the graph endpoint. The `elements` field uses Cytoscape.js native format.

```json
{
  "project_id": "string (UUID)",
  "elements": {
    "nodes": ["GraphNode[]"],
    "edges": ["GraphEdge[]"]
  }
}
```

## Graph Element Schemas

### GraphNode

```json
{
  "data": {
    "id": "string",
    "label": "string",
    "type": "module | class | function | external",
    "file": "string (relative path)",
    "line": "integer"
  },
  "classes": "string (same as data.type)"
}
```

### GraphEdge

```json
{
  "data": {
    "id": "string (source->target)",
    "source": "string (node ID)",
    "target": "string (node ID)",
    "relationship": "contains | imports | inherits"
  }
}
```

## Internal Data Models

These dataclasses are used within the backend pipeline (`services/models.py`):

### ParsedFile

Represents a single parsed source file.

| Field | Type | Description |
|-------|------|-------------|
| `path` | `str` | Relative path from project root |
| `language` | `str` | `python`, `javascript`, or `typescript` |
| `functions` | `list[FunctionDef]` | Top-level functions |
| `classes` | `list[ClassDef]` | Class definitions |
| `imports` | `list[ImportDef]` | Import statements |

### FunctionDef

| Field | Type | Description |
|-------|------|-------------|
| `name` | `str` | Function name |
| `line` | `int` | Line number (1-indexed) |
| `decorators` | `list[str]` | Decorator strings (Python only) |

### ClassDef

| Field | Type | Description |
|-------|------|-------------|
| `name` | `str` | Class name |
| `line` | `int` | Line number (1-indexed) |
| `bases` | `list[str]` | Base class names |
| `methods` | `list[FunctionDef]` | Method definitions |

### ImportDef

| Field | Type | Description |
|-------|------|-------------|
| `module` | `str` | Module path (e.g., `os.path`, `react`) |
| `names` | `list[str]` | Imported names |
