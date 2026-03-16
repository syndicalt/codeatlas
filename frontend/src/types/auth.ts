export interface UserProfile {
  id: string
  email: string
  name: string
  avatar_url: string
  oauth_provider: string
  preferred_model: string
  preferred_provider: string
  created_at: string
}

export interface ApiKeyEntry {
  id: string
  provider: string
  created_at: string
}

export interface AtlasHistoryEntry {
  id: string
  project_id: string
  source_url: string
  name: string
  node_count: number
  edge_count: number
  created_at: string
}

export interface AuthTokenResponse {
  token: string
  user: UserProfile
}
