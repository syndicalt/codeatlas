export interface GraphNode {
  data: {
    id: string
    label: string
    type: string
    file: string
    line: number
    directory: string
    connections: number
  }
  classes: string
}

export interface GraphEdge {
  data: {
    id: string
    source: string
    target: string
    relationship: string
    weight: number
  }
}

export interface GraphElements {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export interface IngestResponse {
  project_id: string
  status: string
  node_count: number
  edge_count: number
}

export interface GraphResponse {
  project_id: string
  elements: GraphElements
}

export interface TaskStatus {
  project_id: string
  status: 'queued' | 'processing' | 'ready' | 'error'
  progress: number
  error_message: string
  node_count: number
  edge_count: number
}

export type DependencyScope = 'all' | 'internal' | 'external'

export interface SearchResult {
  project_id: string
  elements: GraphElements
  total_matches: number
}

// --- History types ---

export interface CommitInfo {
  sha: string
  short_sha: string
  message: string
  author_name: string
  author_email: string
  timestamp: number
  files_changed: string[]
}

export interface HistoryTimeline {
  project_id: string
  commits: CommitInfo[]
  total_commits: number
  sampled_commits: number
}

export interface GraphDelta {
  added_nodes: string[]
  removed_nodes: string[]
  modified_nodes: string[]
}

export interface GraphAtCommit {
  project_id: string
  commit_sha: string
  elements: GraphElements
  delta: GraphDelta | null
}

export interface ChurnEntry {
  path: string
  additions: number
  deletions: number
  commit_sha: string
}

export interface ChurnData {
  project_id: string
  churn: Record<string, ChurnEntry[]>
}

export interface ContributorInfo {
  name: string
  files: string[]
  commit_count: number
}

export interface ContributorData {
  project_id: string
  contributors: Record<string, ContributorInfo>
}
