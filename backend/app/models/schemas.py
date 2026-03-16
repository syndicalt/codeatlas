from enum import Enum

from pydantic import BaseModel


class IngestGitHubRequest(BaseModel):
    url: str
    branch: str | None = None
    analyze_history: bool = False


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


# --- History schemas ---

class CommitInfoSchema(BaseModel):
    sha: str
    short_sha: str
    message: str
    author_name: str
    author_email: str
    timestamp: int
    files_changed: list[str] = []


class HistoryTimelineResponse(BaseModel):
    project_id: str
    commits: list[CommitInfoSchema]
    total_commits: int
    sampled_commits: int


class GraphDeltaSchema(BaseModel):
    added_nodes: list[str] = []
    removed_nodes: list[str] = []
    modified_nodes: list[str] = []


class GraphAtCommitResponse(BaseModel):
    project_id: str
    commit_sha: str
    elements: dict
    delta: GraphDeltaSchema | None = None


class ChurnEntrySchema(BaseModel):
    path: str
    additions: int
    deletions: int
    commit_sha: str


class ChurnResponse(BaseModel):
    project_id: str
    churn: dict  # path -> list[ChurnEntrySchema]


class ContributorSchema(BaseModel):
    name: str
    files: list[str]
    commit_count: int


class ContributorResponse(BaseModel):
    project_id: str
    contributors: dict  # email -> ContributorSchema


class DiffResponse(BaseModel):
    project_id: str
    from_sha: str
    to_sha: str
    delta: GraphDeltaSchema
    elements: dict
