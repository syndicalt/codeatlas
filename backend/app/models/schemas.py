from pydantic import BaseModel


class IngestGitHubRequest(BaseModel):
    url: str
    branch: str | None = None


class IngestResponse(BaseModel):
    project_id: str
    status: str
    node_count: int
    edge_count: int


class GraphNode(BaseModel):
    id: str
    label: str
    type: str  # module, class, function
    file: str
    line: int


class GraphEdge(BaseModel):
    source: str
    target: str
    relationship: str  # imports, contains, inherits, calls


class GraphResponse(BaseModel):
    project_id: str
    elements: dict
