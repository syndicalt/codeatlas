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
