import type {
  IngestResponse,
  GraphResponse,
  TaskStatus,
  SearchResult,
  DependencyScope,
} from '../types/graph'

const BASE = '/api'

export async function ingestGitHub(url: string, branch?: string): Promise<IngestResponse> {
  const res = await fetch(`${BASE}/ingest/github`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, branch: branch || null }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Ingestion failed')
  }
  return res.json()
}

export async function ingestUpload(file: File): Promise<IngestResponse> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${BASE}/ingest/upload`, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Upload failed')
  }
  return res.json()
}

export async function ingestDemo(): Promise<IngestResponse> {
  const res = await fetch(`${BASE}/ingest/demo`, { method: 'POST' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Demo failed')
  }
  return res.json()
}

export async function getTaskStatus(projectId: string): Promise<TaskStatus> {
  const res = await fetch(`${BASE}/ingest/status/${projectId}`)
  if (!res.ok) throw new Error('Task not found')
  return res.json()
}

export async function fetchGraph(projectId: string): Promise<GraphResponse> {
  const res = await fetch(`${BASE}/graph/${projectId}`)
  if (!res.ok) throw new Error('Graph not found')
  return res.json()
}

export async function searchGraph(
  projectId: string,
  query?: string,
  type?: string,
  file?: string,
): Promise<SearchResult> {
  const params = new URLSearchParams()
  if (query) params.set('q', query)
  if (type) params.set('type', type)
  if (file) params.set('file', file)
  const res = await fetch(`${BASE}/graph/${projectId}/search?${params}`)
  if (!res.ok) throw new Error('Search failed')
  return res.json()
}

export async function filterGraph(
  projectId: string,
  scope: DependencyScope,
): Promise<GraphResponse> {
  const res = await fetch(`${BASE}/graph/${projectId}/filter?scope=${scope}`)
  if (!res.ok) throw new Error('Filter failed')
  return res.json()
}

export async function getCallChain(
  projectId: string,
  nodeId: string,
  direction: 'callers' | 'callees' = 'callees',
  depth: number = 5,
): Promise<GraphResponse> {
  const params = new URLSearchParams({ direction, depth: String(depth) })
  const res = await fetch(`${BASE}/graph/${projectId}/callchain/${encodeURIComponent(nodeId)}?${params}`)
  if (!res.ok) throw new Error('Call chain not found')
  return res.json()
}

export function exportGraphJSON(projectId: string): string {
  return `${BASE}/graph/${projectId}/export?format=json`
}
