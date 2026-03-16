# Data Flow

This page traces data through the system from user input to rendered graph.

## Ingestion Flow

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
 │                    │                     │  3. Walk source files
 │                    │                     │  4. Parse with Tree-sitter
 │                    │                     │  5. Build NetworkX graph
 │                    │                     │  6. Export Cytoscape JSON
 │                    │                     │  7. Store in memory
 │                    │  {project_id,       │
 │                    │   node_count, ...}  │
 │                    │◄────────────────────│
 │                    │                     │
 │  Navigate to       │                     │
 │  /graph/:id        │                     │
 │                    │  GET /api/graph/:id │
 │                    │────────────────────►│
 │                    │                     │  8. Lookup in store
 │                    │  {elements: {       │
 │                    │    nodes, edges}}   │
 │                    │◄────────────────────│
 │                    │                     │
 │  Render graph      │  9. Cytoscape.js    │
 │◄──────────────────│     renders graph   │
```

## Data Transformations

### Step 1: Source Code → ParsedFile

Tree-sitter parses raw source into a concrete syntax tree. The language-specific parsers walk this tree to extract structured data:

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
            methods=[FunctionDef(name="get_user", line=2)]
        )
    ],
    functions=[],
    imports=[]
)
```

### Step 2: ParsedFile → NetworkX Graph

The graph builder creates nodes and edges from the parsed data:

```
Nodes:
  mod:services/user.py     (type=module)
  class:services/user.py:UserService  (type=class)
  func:services/user.py:UserService.get_user  (type=function)

Edges:
  mod:services/user.py → class:services/user.py:UserService  (contains)
  class:services/user.py:UserService → func:...:get_user     (contains)
```

### Step 3: NetworkX Graph → Cytoscape.js JSON

The graph is serialized to Cytoscape's native element format:

```json
{
  "nodes": [
    {
      "data": {
        "id": "mod:services/user.py",
        "label": "user",
        "type": "module",
        "file": "services/user.py",
        "line": 1
      },
      "classes": "module"
    }
  ],
  "edges": [
    {
      "data": {
        "id": "mod:services/user.py->class:services/user.py:UserService",
        "source": "mod:services/user.py",
        "target": "class:services/user.py:UserService",
        "relationship": "contains"
      }
    }
  ]
}
```

### Step 4: JSON → Visual Graph

Cytoscape.js maps the `classes` field on each node to stylesheet selectors, applying colors and shapes. The COSE layout algorithm positions nodes automatically based on their connections.
