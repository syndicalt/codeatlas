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

// --- RAG types ---

export interface RagQueryRequest {
  message: string
  conversation_id?: string | null
}

export interface CodeSnippet {
  file: string
  start_line: number
  end_line: number
  label: string
}

export interface RagQueryResponse {
  project_id: string
  message_id: string
  conversation_id: string
  text: string
  highlighted_nodes: string[]
  subgraph_elements: GraphElements | null
  code_snippets: CodeSnippet[]
  confidence: string
  follow_up_suggestions: string[]
  is_local_only: boolean
}

export interface RagIndexStatus {
  project_id: string
  indexed: boolean
  doc_count: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  highlighted_nodes?: string[]
  subgraph_elements?: GraphElements | null
  code_snippets?: CodeSnippet[]
  confidence?: string
  follow_up_suggestions?: string[]
  is_local_only?: boolean
}
