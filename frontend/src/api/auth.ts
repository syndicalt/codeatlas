import type {
  UserProfile,
  ApiKeyEntry,
  AtlasHistoryEntry,
  AuthTokenResponse,
} from '../types/auth'

const BASE = '/api'

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('codeatlas-token')
  if (token) {
    return { Authorization: `Bearer ${token}` }
  }
  return {}
}

// Re-export for use in other API modules
export { getAuthHeaders }

// --- Auth endpoints ---

export async function getGitHubAuthUrl(): Promise<string> {
  const res = await fetch(`${BASE}/auth/github`)
  if (!res.ok) throw new Error('Failed to get GitHub auth URL')
  const data = await res.json()
  return data.url
}

export async function githubCallback(code: string): Promise<AuthTokenResponse> {
  const res = await fetch(`${BASE}/auth/github/callback?code=${encodeURIComponent(code)}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'GitHub auth failed')
  }
  return res.json()
}

export async function getGoogleAuthUrl(): Promise<string> {
  const res = await fetch(`${BASE}/auth/google`)
  if (!res.ok) throw new Error('Failed to get Google auth URL')
  const data = await res.json()
  return data.url
}

export async function googleCallback(code: string): Promise<AuthTokenResponse> {
  const res = await fetch(`${BASE}/auth/google/callback?code=${encodeURIComponent(code)}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Google auth failed')
  }
  return res.json()
}

export async function fetchMe(): Promise<UserProfile> {
  const res = await fetch(`${BASE}/auth/me`, { headers: getAuthHeaders() })
  if (!res.ok) throw new Error('Not authenticated')
  return res.json()
}

// --- User endpoints ---

export async function fetchProfile(): Promise<UserProfile> {
  const res = await fetch(`${BASE}/user/profile`, { headers: getAuthHeaders() })
  if (!res.ok) throw new Error('Not authenticated')
  return res.json()
}

export async function updatePreferences(preferred_model: string, preferred_provider: string): Promise<UserProfile> {
  const res = await fetch(`${BASE}/user/preferences`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ preferred_model, preferred_provider }),
  })
  if (!res.ok) throw new Error('Failed to update preferences')
  return res.json()
}

export async function listApiKeys(): Promise<ApiKeyEntry[]> {
  const res = await fetch(`${BASE}/user/api-keys`, { headers: getAuthHeaders() })
  if (!res.ok) throw new Error('Failed to fetch API keys')
  return res.json()
}

export async function setApiKey(provider: string, key: string): Promise<void> {
  const res = await fetch(`${BASE}/user/api-keys/${provider}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ key }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Failed to set API key')
  }
}

export async function deleteApiKey(provider: string): Promise<void> {
  const res = await fetch(`${BASE}/user/api-keys/${provider}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })
  if (!res.ok) throw new Error('Failed to delete API key')
}

export async function listAtlasHistory(): Promise<AtlasHistoryEntry[]> {
  const res = await fetch(`${BASE}/user/atlas-history`, { headers: getAuthHeaders() })
  if (!res.ok) throw new Error('Failed to fetch atlas history')
  return res.json()
}

export async function deleteAtlasHistory(entryId: string): Promise<void> {
  const res = await fetch(`${BASE}/user/atlas-history/${entryId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })
  if (!res.ok) throw new Error('Failed to delete history entry')
}
