import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { UserProfile } from '../types/auth'
import { fetchMe } from '../api/auth'

interface AuthContextValue {
  user: UserProfile | null
  loading: boolean
  login: (token: string, user: UserProfile) => void
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
  refreshUser: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('codeatlas-token')
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      const profile = await fetchMe()
      setUser(profile)
    } catch {
      // Token invalid or expired
      localStorage.removeItem('codeatlas-token')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  const login = useCallback((token: string, profile: UserProfile) => {
    localStorage.setItem('codeatlas-token', token)
    setUser(profile)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('codeatlas-token')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}
