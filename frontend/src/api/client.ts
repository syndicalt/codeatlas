import type {
  IngestResponse,
  GraphResponse,
  TaskStatus,
  SearchResult,
  DependencyScope,
  HistoryTimeline,
  GraphAtCommit,
  ChurnData,
  ContributorData,
  RagQueryResponse,
  RagIndexStatus,
} from '../types/graph'
import { getAuthHeaders } from './auth'

const BASE = '/api'

export async function ingestGitHub(
  url: string,
  branch?: string,
  analyzeHistory?: boolean,
): Promise<IngestResponse> {
  const res = await fetch(`${BASE}/ingest/github`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({
      url,
      branch: branch || null,
      analyze_history: analyzeHistory || false,
    }),
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
    headers: getAuthHeaders(),
    body: form,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Upload failed')
  }
  return res.json()
}

export async function ingestImportJSON(file: File): Promise<IngestResponse> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${BASE}/ingest/import`, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Import failed')
  }
  return res.json()
}

export async function ingestDemo(): Promise<IngestResponse> {
  const res = await fetch(`${BASE}/ingest/demo`, { method: 'POST', headers: getAuthHeaders() })
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

// --- History API ---

export async function fetchTimeline(projectId: string): Promise<HistoryTimeline> {
  const res = await fetch(`${BASE}/history/${projectId}/timeline`)
  if (!res.ok) throw new Error('History not available')
  return res.json()
}

export async function fetchGraphAtCommit(projectId: string, sha: string): Promise<GraphAtCommit> {
  const res = await fetch(`${BASE}/history/${projectId}/at/${sha}`)
  if (!res.ok) throw new Error('Commit snapshot not found')
  return res.json()
}

export async function fetchDiff(
  projectId: string,
  fromSha: string,
  toSha: string,
): Promise<{ from_sha: string; to_sha: string; delta: import('../types/graph').GraphDelta; elements: import('../types/graph').GraphElements }> {
  const params = new URLSearchParams({ from_sha: fromSha, to_sha: toSha })
  const res = await fetch(`${BASE}/history/${projectId}/diff?${params}`)
  if (!res.ok) throw new Error('Diff not available')
  return res.json()
}

export async function fetchChurn(projectId: string): Promise<ChurnData> {
  const res = await fetch(`${BASE}/history/${projectId}/churn`)
  if (!res.ok) throw new Error('Churn data not available')
  return res.json()
}

export async function fetchContributors(projectId: string): Promise<ContributorData> {
  const res = await fetch(`${BASE}/history/${projectId}/contributors`)
  if (!res.ok) throw new Error('Contributor data not available')
  return res.json()
}

// --- RAG API ---

export async function ragQuery(
  projectId: string,
  message: string,
  conversationId?: string | null,
): Promise<RagQueryResponse> {
  const res = await fetch(`${BASE}/rag/${projectId}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({
      message,
      conversation_id: conversationId || null,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Query failed')
  }
  return res.json()
}

export async function ragIndexStatus(projectId: string): Promise<RagIndexStatus> {
  const res = await fetch(`${BASE}/rag/${projectId}/index-status`)
  if (!res.ok) throw new Error('Index status not available')
  return res.json()
}

export async function ragBuildIndex(projectId: string): Promise<{ indexed: boolean; doc_count: number }> {
  const res = await fetch(`${BASE}/rag/${projectId}/build-index`, { method: 'POST' })
  if (!res.ok) throw new Error('Index build failed')
  return res.json()
}

// --- Share API ---

export async function createShareLink(projectId: string): Promise<{ share_id: string }> {
  const res = await fetch(`${BASE}/share/${projectId}`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to create share link')
  return res.json()
}

export async function fetchSharedGraph(shareId: string): Promise<{ share_id: string; project_id: string; elements: import('../types/graph').GraphElements }> {
  const res = await fetch(`${BASE}/share/${shareId}`)
  if (!res.ok) throw new Error('Shared graph not found')
  return res.json()
}
