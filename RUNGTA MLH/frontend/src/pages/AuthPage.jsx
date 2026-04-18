import { motion } from 'framer-motion'
import { Chrome, Lock, Mail } from 'lucide-react'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const submit = (e) => {
    e.preventDefault()
    login({ email: email || 'analyst@veritasx.ai', username: 'Security Analyst' })
    navigate(location.state?.from || '/app/dashboard', { replace: true })
  }

  return (
    <div className="flex min-h-[calc(100vh-80px)] items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="vx-card w-full max-w-md p-7"
      >
        <h2 className="text-2xl font-bold text-primary-text">Welcome back</h2>
        <p className="mt-1 text-sm text-muted-text">Sign in to access VERITAS X console.</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs text-muted-text">Email</span>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-text" />
              <input className="vx-input pl-9" type="email" required placeholder="you@company.com" value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs text-muted-text">Password</span>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-text" />
              <input className="vx-input pl-9" type="password" required placeholder="********" value={password} onChange={(event) => setPassword(event.target.value)} />
            </div>
          </label>

          <button className="vx-btn-primary w-full" type="submit">Login</button>
          <button className="vx-btn-secondary w-full" type="button">
            <Chrome className="mr-2 h-4 w-4" /> Continue with Google
          </button>
        </form>
      </motion.div>
    </div>
  )
}
