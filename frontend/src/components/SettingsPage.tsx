import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  listApiKeys,
  setApiKey,
  deleteApiKey,
  updatePreferences,
  listAtlasHistory,
  deleteAtlasHistory,
} from '../api/auth'
import type { ApiKeyEntry, AtlasHistoryEntry } from '../types/auth'

const PROVIDERS = [
  { id: 'anthropic', name: 'Anthropic (Claude)', placeholder: 'sk-ant-...' },
  { id: 'openai', name: 'OpenAI', placeholder: 'sk-...' },
  { id: 'google', name: 'Google (Gemini)', placeholder: 'AIza...' },
  { id: 'xai', name: 'xAI (Grok)', placeholder: 'xai-...' },
  { id: 'ollama', name: 'Ollama (Local)', placeholder: 'not-needed' },
]

const MODELS: Record<string, string[]> = {
  anthropic: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514', 'claude-haiku-4-5-20251001'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'o3-mini'],
  google: ['gemini-2.0-flash', 'gemini-2.5-pro'],
  xai: ['grok-3-mini', 'grok-3'],
  ollama: ['llama3', 'mistral', 'codellama'],
}

export default function SettingsPage() {
  const { user, logout, refreshUser } = useAuth()
  const navigate = useNavigate()

  const [apiKeys, setApiKeys] = useState<ApiKeyEntry[]>([])
  const [history, setHistory] = useState<AtlasHistoryEntry[]>([])
  const [newKeyProvider, setNewKeyProvider] = useState('anthropic')
  const [newKeyValue, setNewKeyValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const [preferredProvider, setPreferredProvider] = useState(user?.preferred_provider || 'anthropic')
  const [preferredModel, setPreferredModel] = useState(user?.preferred_model || '')

  useEffect(() => {
    if (!user) return
    listApiKeys().then(setApiKeys).catch(() => {})
    listAtlasHistory().then(setHistory).catch(() => {})
  }, [user])

  useEffect(() => {
    if (user) {
      setPreferredProvider(user.preferred_provider || 'anthropic')
      setPreferredModel(user.preferred_model || '')
    }
  }, [user])

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-slate-400 text-lg">Please sign in to access settings</p>
          <Link to="/" className="text-blue-400 hover:text-blue-300">Back to Home</Link>
        </div>
      </div>
    )
  }

  const handleSaveKey = async () => {
    if (!newKeyValue.trim() && newKeyProvider !== 'ollama') return
    setSaving(true)
    setMessage('')
    try {
      await setApiKey(newKeyProvider, newKeyValue.trim() || 'ollama')
      setNewKeyValue('')
      const keys = await listApiKeys()
      setApiKeys(keys)

      // Auto-set preferred provider to match the key just saved
      if (preferredProvider !== newKeyProvider) {
        setPreferredProvider(newKeyProvider)
        setPreferredModel('')
        await updatePreferences('', newKeyProvider)
        await refreshUser()
      }

      setMessage('API key saved')
    } catch (err: any) {
      setMessage(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteKey = async (provider: string) => {
    try {
      await deleteApiKey(provider)
      setApiKeys((prev) => prev.filter((k) => k.provider !== provider))
      setMessage('API key removed')
    } catch (err: any) {
      setMessage(err.message)
    }
  }

  const handleSavePreferences = async () => {
    setSaving(true)
    try {
      await updatePreferences(preferredModel, preferredProvider)
      await refreshUser()
      setMessage('Preferences saved')
    } catch (err: any) {
      setMessage(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteHistory = async (entryId: string) => {
    try {
      await deleteAtlasHistory(entryId)
      setHistory((prev) => prev.filter((h) => h.id !== entryId))
    } catch {}
  }

  const models = MODELS[preferredProvider] || []

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="flex items-center justify-between px-6 py-3 bg-slate-800 border-b border-slate-700">
        <Link to="/" className="text-blue-400 font-medium">CodeAtlas</Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-400">{user.email}</span>
          <button
            onClick={() => { logout(); navigate('/') }}
            className="text-sm text-slate-400 hover:text-white transition"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-8 space-y-10">
        <h1 className="text-2xl font-bold">Settings</h1>

        {message && (
          <div className="px-4 py-2 bg-slate-800 border border-slate-600 rounded text-sm text-slate-300">
            {message}
          </div>
        )}

        {/* Profile */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Profile</h2>
          <div className="flex items-center gap-4 p-4 bg-slate-800 rounded-lg border border-slate-700">
            {user.avatar_url && (
              <img src={user.avatar_url} alt="" className="w-12 h-12 rounded-full" />
            )}
            <div>
              <div className="font-medium">{user.name}</div>
              <div className="text-sm text-slate-400">{user.email}</div>
              <div className="text-xs text-slate-500 mt-1">
                Signed in via {user.oauth_provider}
              </div>
            </div>
          </div>
        </section>

        {/* Model Preferences */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">AI Model Preferences</h2>
          <div className="p-4 bg-slate-800 rounded-lg border border-slate-700 space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Provider</label>
              <select
                value={preferredProvider}
                onChange={(e) => {
                  setPreferredProvider(e.target.value)
                  setPreferredModel('')
                }}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-white"
              >
                {PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Model</label>
              <select
                value={preferredModel}
                onChange={(e) => setPreferredModel(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-white"
              >
                <option value="">Default</option>
                {models.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleSavePreferences}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50
                         text-white rounded text-sm transition"
            >
              Save Preferences
            </button>
          </div>
        </section>

        {/* API Keys */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">API Keys</h2>
          <p className="text-sm text-slate-400">
            Your keys are encrypted and stored securely. They are used for AI-powered queries.
          </p>

          {/* Existing keys */}
          {apiKeys.length > 0 && (
            <div className="space-y-2">
              {apiKeys.map((k) => (
                <div key={k.id} className="flex items-center justify-between p-3 bg-slate-800
                                           rounded-lg border border-slate-700">
                  <div>
                    <span className="text-sm font-medium">
                      {PROVIDERS.find((p) => p.id === k.provider)?.name || k.provider}
                    </span>
                    <span className="text-xs text-slate-500 ml-2">
                      Added {new Date(k.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteKey(k.provider)}
                    className="text-xs text-red-400 hover:text-red-300 transition"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add new key */}
          <div className="p-4 bg-slate-800 rounded-lg border border-slate-700 space-y-3">
            <div className="flex gap-3">
              <select
                value={newKeyProvider}
                onChange={(e) => setNewKeyProvider(e.target.value)}
                className="px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-white"
              >
                {PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <input
                type="password"
                value={newKeyValue}
                onChange={(e) => setNewKeyValue(e.target.value)}
                placeholder={PROVIDERS.find((p) => p.id === newKeyProvider)?.placeholder || 'API key'}
                className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm
                           text-white placeholder-slate-500"
              />
            </div>
            <button
              onClick={handleSaveKey}
              disabled={saving || (!newKeyValue.trim() && newKeyProvider !== 'ollama')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50
                         text-white rounded text-sm transition"
            >
              {apiKeys.some((k) => k.provider === newKeyProvider) ? 'Update Key' : 'Add Key'}
            </button>
          </div>
        </section>

        {/* Atlas History */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Atlas History</h2>
          {history.length === 0 ? (
            <p className="text-sm text-slate-500">No atlases generated yet</p>
          ) : (
            <div className="space-y-2">
              {history.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 bg-slate-800
                                               rounded-lg border border-slate-700">
                  <Link
                    to={`/graph/${entry.project_id}`}
                    className="flex-1 min-w-0"
                  >
                    <div className="text-sm font-medium text-blue-400 hover:text-blue-300 truncate">
                      {entry.name || entry.source_url || entry.project_id.slice(0, 8)}
                    </div>
                    <div className="text-xs text-slate-500">
                      {entry.node_count} nodes, {entry.edge_count} edges
                      {' \u00b7 '}{new Date(entry.created_at).toLocaleDateString()}
                    </div>
                  </Link>
                  <button
                    onClick={() => handleDeleteHistory(entry.id)}
                    className="text-xs text-slate-500 hover:text-red-400 transition ml-3 shrink-0"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
