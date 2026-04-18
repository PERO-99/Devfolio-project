import { Bell, LogOut, Moon, Search, Sun } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'

export default function Navbar({ title }) {
  const { theme, toggleTheme } = useTheme()
  const { session, logout } = useAuth()
  const navigate = useNavigate()

  const onLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-primary-text">{title}</h1>
        <p className="text-sm text-muted-text">AI-native threat intelligence and trust verification</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative w-full md:w-[320px]">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-text" />
          <input className="vx-input pl-9" placeholder="Search scans, URLs, users..." />
        </div>

        <button className="vx-btn-ghost relative p-2.5 text-muted-text transition hover:text-primary-text" onClick={toggleTheme}>
          {theme === 'dark' ? <Moon className="h-4.5 w-4.5" /> : <Sun className="h-4.5 w-4.5" />}
          <span className="sr-only">Toggle theme</span>
        </button>

        <button className="vx-btn-ghost relative p-2.5 text-muted-text transition hover:text-primary-text">
          <Bell className="h-4.5 w-4.5" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-red-400" />
        </button>

        <div className="rounded-xl border border-border bg-panel px-3 py-2 text-xs text-muted-text">
          <p className="font-semibold text-primary-text">{session?.username || 'Analyst'}</p>
          <p>{session?.email || 'analyst@veritasx.ai'}</p>
        </div>

        <button className="vx-btn-ghost p-2.5 text-muted-text hover:text-red-300" onClick={onLogout}>
          <LogOut className="h-4.5 w-4.5" />
          <span className="sr-only">Logout</span>
        </button>

        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-blue-400/40 bg-gradient-to-br from-blue-500/30 to-violet-500/30 text-sm font-semibold text-white">
          {session?.username?.[0] || 'V'}
        </div>
      </div>
    </header>
  )
}
