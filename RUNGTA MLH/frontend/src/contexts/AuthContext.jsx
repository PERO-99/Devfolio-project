import { createContext, useContext, useMemo, useState } from 'react'

const AuthContext = createContext(null)
const AUTH_KEY = 'vx_auth_session'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => {
    const raw = localStorage.getItem(AUTH_KEY)
    return raw ? JSON.parse(raw) : null
  })

  const login = ({ email = 'analyst@veritasx.ai', username = 'Security Analyst' }) => {
    const payload = { email, username, at: new Date().toISOString() }
    localStorage.setItem(AUTH_KEY, JSON.stringify(payload))
    setSession(payload)
  }

  const logout = () => {
    localStorage.removeItem(AUTH_KEY)
    setSession(null)
  }

  const value = useMemo(() => ({
    session,
    isAuthenticated: Boolean(session),
    login,
    logout,
  }), [session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
