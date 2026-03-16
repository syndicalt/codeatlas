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

Returned by all ingestion endpoints.

```json
{
  "project_id": "string (UUID)",
  "status": "processing | ready | error",
  "node_count": "integer (0 until ready)",
  "edge_count": "integer (0 until ready)"
}
```

### TaskStatusResponse

Returned by the status polling endpoint.

```json
{
  "project_id": "string (UUID)",
  "status": "queued | processing | ready | error",
  "progress": "integer (0-100)",
  "error_message": "string",
  "node_count": "integer",
  "edge_count": "integer"
}
```

### GraphResponse

Returned by graph, filter, and call chain endpoints. The `elements` field uses Cytoscape.js native format.

```json
{
  "project_id": "string (UUID)",
  "elements": {
    "nodes": ["GraphNode[]"],
    "edges": ["GraphEdge[]"]
  }
}
```

### SearchResult

Returned by the search endpoint.

```json
{
  "project_id": "string (UUID)",
  "elements": {
    "nodes": ["GraphNode[]"],
    "edges": ["GraphEdge[]"]
  },
  "total_matches": "integer"
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
    "line": "integer",
    "directory": "string (parent directory path)",
    "connections": "integer (in-degree + out-degree)"
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
    "relationship": "contains | imports | inherits | calls",
    "weight": "integer"
  }
}
```

## Enums

### DependencyScope

`"all" | "internal" | "external"`

### CallChainDirection

`"callers" | "callees"`

### ExportFormat

`"json" | "png" | "svg"`

(PNG and SVG are handled client-side)

## Internal Data Models

These dataclasses are used within the backend pipeline (`services/models.py`):

### ParsedFile

| Field | Type | Description |
|-------|------|-------------|
| `path` | `str` | Relative path from project root |
| `language` | `str` | `python`, `javascript`, `typescript`, or `java` |
| `functions` | `list[FunctionDef]` | Top-level functions |
| `classes` | `list[ClassDef]` | Class definitions |
| `imports` | `list[ImportDef]` | Import statements |

### FunctionDef

| Field | Type | Description |
|-------|------|-------------|
| `name` | `str` | Function name |
| `line` | `int` | Line number (1-indexed) |
| `decorators` | `list[str]` | Decorator strings (Python only) |
| `calls` | `list[str]` | Names of functions called within the body |

### ClassDef

| Field | Type | Description |
|-------|------|-------------|
| `name` | `str` | Class name |
| `line` | `int` | Line number (1-indexed) |
| `bases` | `list[str]` | Base class / interface names |
| `methods` | `list[FunctionDef]` | Method definitions |

### ImportDef

| Field | Type | Description |
|-------|------|-------------|
| `module` | `str` | Module path (e.g., `os.path`, `react`, `java.util`) |
| `names` | `list[str]` | Imported names |

### ProjectData

| Field | Type | Description |
|-------|------|-------------|
| `cytoscape_json` | `dict` | Cytoscape.js elements format |
| `graph` | `nx.DiGraph` | NetworkX graph for querying |
