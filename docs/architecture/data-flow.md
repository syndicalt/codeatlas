# Data Flow

This page traces data through the system from user input to rendered graph.

## Ingestion Flow (Background Processing)

```
User                Frontend              Backend
 │                    │                     │
 │  Enter GitHub URL  │                     │
 │──────────────────►│                     │
 │                    │  POST /api/ingest/  │
 │                    │  github {url}       │
 │                    │────────────────────►│
 │                    │                     │  1. Validate URL
 │                    │                     │  2. git clone --depth=1
 │                    │  {project_id,       │  3. Create background task
 │                    │   status:processing}│
 │                    │◄────────────────────│
 │                    │                     │
 │  Show progress bar │                     │  (Background)
 │◄──────────────────│                     │  4. Walk source files
 │                    │  GET /ingest/status │  5. Parse with Tree-sitter
 │                    │────────────────────►│  6. Extract function calls
 │                    │  {progress: 50}     │  7. Build NetworkX graph
 │                    │◄────────────────────│  8. Resolve imports/calls
 │                    │         ...         │  9. Export Cytoscape JSON
 │                    │  GET /ingest/status │  10. Store ProjectData
 │                    │────────────────────►│
 │                    │  {status: ready}    │
 │                    │◄────────────────────│
 │                    │                     │
 │  Navigate to       │                     │
 │  /graph/:id        │                     │
 │                    │  GET /api/graph/:id │
 │                    │────────────────────►│
 │                    │  {elements: {...}}  │  11. Return Cytoscape JSON
 │                    │◄────────────────────│
 │                    │                     │
 │  Render dashboard  │  12. Cytoscape.js   │
 │◄──────────────────│      renders graph  │
```

## Query Flow (Search / Filter / Call Chain)

```
User                Frontend              Backend
 │                    │                     │
 │  Type in search    │                     │
 │──────────────────►│                     │
 │                    │  (300ms debounce)   │
 │                    │  GET /graph/:id/    │
 │                    │  search?q=parse     │
 │                    │────────────────────►│
 │                    │                     │  Query NetworkX DiGraph
 │                    │  {matching nodes}   │
 │                    │◄────────────────────│
 │                    │                     │
 │  Highlighted nodes │  Dim non-matching   │
 │◄──────────────────│  Highlight matching │
```

## Data Transformations

### Step 1: Source Code → ParsedFile

Tree-sitter parses raw source into a concrete syntax tree. The language-specific parsers walk this tree to extract structured data, including function calls:

```python
# Input: raw Python source
"""
class UserService:
    def get_user(self, id):
        return self.db.find(id)
"""

# Output: ParsedFile
ParsedFile(
    path="services/user.py",
    language="python",
    classes=[
        ClassDef(
            name="UserService",
            line=1,
            methods=[FunctionDef(name="get_user", line=2, calls=["find"])]
        )
    ],
    functions=[],
    imports=[]
)
```

### Step 2: ParsedFile → NetworkX Graph

The graph builder creates nodes and edges, including call relationships:

```
Nodes:
  mod:services/user.py                       (type=module, directory=services)
  class:services/user.py:UserService         (type=class, directory=services)
  func:services/user.py:UserService.get_user (type=function, directory=services)

Edges:
  mod:services/user.py → class:...:UserService     (contains)
  class:...:UserService → func:...:get_user         (contains)
  func:...:get_user → func:...:find                  (calls)
```

### Step 3: NetworkX Graph → Cytoscape.js JSON

The graph is serialized with enriched attributes:

```json
{
  "nodes": [
    {
      "data": {
        "id": "mod:services/user.py",
        "label": "user",
        "type": "module",
        "file": "services/user.py",
        "line": 1,
        "directory": "services",
        "connections": 2
      },
      "classes": "module"
    }
  ],
  "edges": [
    {
      "data": {
        "id": "func:...:get_user->func:...:find",
        "source": "func:services/user.py:UserService.get_user",
        "target": "func:other/db.py:find",
        "relationship": "calls",
        "weight": 1
      }
    }
  ]
}
```

### Step 4: JSON → Visual Dashboard

Cytoscape.js maps the `classes` field on each node to stylesheet selectors, applying colors and shapes. The COSE layout positions nodes. The detail panel reads from the same data. Search highlighting applies `highlighted`/`dimmed` CSS classes dynamically.
