import type { IngestResponse, GraphResponse } from '../types/graph'

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

export async function fetchGraph(projectId: string): Promise<GraphResponse> {
  const res = await fetch(`${BASE}/graph/${projectId}`)
  if (!res.ok) {
    throw new Error('Graph not found')
  }
  return res.json()
}
