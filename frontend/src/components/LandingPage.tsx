import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ingestGitHub, ingestUpload, ingestDemo, ingestImportJSON } from '../api/client'
import { useTaskPolling } from '../hooks/useTaskPolling'

export default function LandingPage() {
  const navigate = useNavigate()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [analyzeHistory, setAnalyzeHistory] = useState(false)

  const task = useTaskPolling(pendingId)

  // Navigate when task completes
  useEffect(() => {
    if (task?.status === 'ready') {
      navigate(`/graph/${task.project_id}`)
    } else if (task?.status === 'error') {
      setError(task.error_message || 'Processing failed')
      setLoading(false)
      setPendingId(null)
    }
  }, [task, navigate])

  const startIngest = async (fn: () => Promise<{ project_id: string; status: string }>) => {
    setLoading(true)
    setError('')
    try {
      const res = await fn()
      if (res.status === 'processing') {
        setPendingId(res.project_id)
      } else {
        navigate(`/graph/${res.project_id}`)
      }
    } catch (e: any) {
      setError(e.message)
      setLoading(false)
    }
  }

  const handleGitHub = () => {
    if (!url.trim()) return
    startIngest(() => ingestGitHub(url.trim(), undefined, analyzeHistory))
  }

  const handleFile = useCallback((file: File) => {
    if (file.name.endsWith('.json')) {
      // Import a previously exported CodeAtlas JSON
      startIngest(() => ingestImportJSON(file))
      return
    }
    if (!file.name.endsWith('.zip')) {
      setError('Only .zip or .json files are accepted')
      return
    }
    startIngest(() => ingestUpload(file))
  }, [])

  const handleDemo = () => startIngest(() => ingestDemo())

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const progress = task?.progress ?? 0

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-5xl font-bold mb-2 text-white">CodeAtlas</h1>
      <p className="text-slate-400 mb-12 text-lg">
        Transform codebases into interactive knowledge graphs
      </p>

      <div className="w-full max-w-xl space-y-6">
        {/* GitHub URL input */}
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="https://github.com/owner/repo"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGitHub()}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg
                       text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={handleGitHub}
            disabled={loading || !url.trim()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700
                       disabled:text-slate-500 text-white rounded-lg font-medium transition"
          >
            Parse
          </button>
        </div>

        {/* History option */}
        <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
          <input
            type="checkbox"
            checked={analyzeHistory}
            onChange={(e) => setAnalyzeHistory(e.target.checked)}
            disabled={loading}
            className="rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500"
          />
          Analyze full Git history (slower, enables time slider &amp; contributor views)
        </label>

        <div className="flex items-center gap-4 text-slate-500">
          <div className="flex-1 h-px bg-slate-700" />
          <span>or</span>
          <div className="flex-1 h-px bg-slate-700" />
        </div>

        {/* ZIP drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => {
            if (loading) return
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = '.zip,.json'
            input.onchange = () => {
              if (input.files?.[0]) handleFile(input.files[0])
            }
            input.click()
          }}
          className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition
            ${dragOver
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-slate-600 hover:border-slate-400'
            }`}
        >
          <p className="text-slate-300 text-lg">
            Drop a .zip or exported .json file here, or click to browse
          </p>
        </div>

        {/* Demo button */}
        <div className="text-center">
          <button
            onClick={handleDemo}
            disabled={loading}
            className="px-5 py-2.5 border border-slate-600 hover:border-slate-400
                       text-slate-300 hover:text-white rounded-lg text-sm transition
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Try Demo Project
          </button>
        </div>

        {/* Loading / Progress */}
        {loading && (
          <div className="text-center space-y-3">
            <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400">Analyzing codebase...</p>
            {progress > 0 && (
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        )}
        {error && (
          <p className="text-red-400 text-center">{error}</p>
        )}
      </div>
    </div>
  )
}
