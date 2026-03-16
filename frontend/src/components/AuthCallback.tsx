import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { githubCallback, googleCallback } from '../api/auth'

export default function AuthCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { login } = useAuth()
  const [error, setError] = useState('')

  useEffect(() => {
    const code = searchParams.get('code')
    // Provider is passed via OAuth 'state' parameter
    const provider = searchParams.get('state')

    if (!code || !provider) {
      setError('Missing OAuth parameters')
      return
    }

    const exchange = provider === 'github' ? githubCallback : googleCallback

    exchange(code)
      .then((res) => {
        login(res.token, res.user)
        navigate('/')
      })
      .catch((err) => {
        setError(err.message)
      })
  }, [searchParams, login, navigate])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-400 text-lg">Authentication failed</p>
          <p className="text-slate-400">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition"
          >
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400">Completing sign in...</p>
      </div>
    </div>
  )
}
