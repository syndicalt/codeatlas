from dataclasses import dataclass, field


@dataclass
class FunctionDef:
    name: str
    line: int
    decorators: list[str] = field(default_factory=list)
    calls: list[str] = field(default_factory=list)


@dataclass
class ClassDef:
    name: str
    line: int
    bases: list[str] = field(default_factory=list)
    methods: list[FunctionDef] = field(default_factory=list)


@dataclass
class ImportDef:
    module: str
    names: list[str] = field(default_factory=list)


@dataclass
class ParsedFile:
    path: str  # relative to project root
    language: str
    functions: list[FunctionDef] = field(default_factory=list)
    classes: list[ClassDef] = field(default_factory=list)
    imports: list[ImportDef] = field(default_factory=list)


@dataclass
class CommitInfo:
    sha: str
    short_sha: str
    message: str
    author_name: str
    author_email: str
    timestamp: int  # unix epoch
    files_changed: list[str] = field(default_factory=list)


@dataclass
class ChurnMetric:
    path: str
    additions: int
    deletions: int
    commit_sha: str


@dataclass
class GraphDelta:
    commit_sha: str
    added_nodes: list[str] = field(default_factory=list)
    removed_nodes: list[str] = field(default_factory=list)
    modified_nodes: list[str] = field(default_factory=list)
    added_edges: list[tuple[str, str]] = field(default_factory=list)
    removed_edges: list[tuple[str, str]] = field(default_factory=list)


@dataclass
class HistoryData:
    commits: list[CommitInfo] = field(default_factory=list)
    churn: dict = field(default_factory=dict)  # path -> list[ChurnMetric]
    contributors: dict = field(default_factory=dict)  # email -> {name, files, commit_count}
    deltas: list[GraphDelta] = field(default_factory=list)
    snapshots: dict = field(default_factory=dict)  # sha -> cytoscape_json
    baseline_sha: str = ""


@dataclass
class ProjectData:
    """Holds both the NetworkX graph and the Cytoscape JSON for a project."""
    cytoscape_json: dict
    graph: object  # nx.DiGraph — typed as object to avoid circular import
    history: HistoryData | None = None
