export interface GraphNode {
  data: {
    id: string
    label: string
    type: string
    file: string
    line: number
  }
  classes: string
}

export interface GraphEdge {
  data: {
    id: string
    source: string
    target: string
    relationship: string
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
