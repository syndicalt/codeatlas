from enum import Enum

from pydantic import BaseModel


class IngestGitHubRequest(BaseModel):
    url: str
    branch: str | None = None


class IngestResponse(BaseModel):
    project_id: str
    status: str  # "processing" | "ready" | "error"
    node_count: int = 0
    edge_count: int = 0


class GraphNode(BaseModel):
    id: str
    label: str
    type: str
    file: str
    line: int
    directory: str = ""
    connections: int = 0


class GraphEdge(BaseModel):
    source: str
    target: str
    relationship: str
    weight: int = 1


class GraphResponse(BaseModel):
    project_id: str
    elements: dict


class TaskStatusResponse(BaseModel):
    project_id: str
    status: str
    progress: int = 0
    error_message: str = ""
    node_count: int = 0
    edge_count: int = 0


class DependencyScope(str, Enum):
    all = "all"
    internal = "internal"
    external = "external"


class ExportFormat(str, Enum):
    json = "json"
    png = "png"
    svg = "svg"


class CallChainDirection(str, Enum):
    callers = "callers"
    callees = "callees"
