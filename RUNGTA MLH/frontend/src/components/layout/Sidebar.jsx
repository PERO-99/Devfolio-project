import { motion } from 'framer-motion'
import {
  BarChart3,
  CircleUserRound,
  Flame,
  HelpCircle,
  LayoutDashboard,
  LifeBuoy,
  SearchCode,
  Settings,
  Shield,
  ShieldAlert,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/scan', label: 'Scan Studio', icon: SearchCode },
  { to: '/app/detections', label: 'Detections', icon: ShieldAlert },
  { to: '/app/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/app/trends', label: 'Trends', icon: Flame },
  { to: '/app/profile', label: 'Profile', icon: CircleUserRound },
  { to: '/app/settings', label: 'Settings', icon: Settings },
  { to: '/app/support', label: 'Support', icon: HelpCircle },
]

export default function Sidebar({ collapsed, onToggle }) {
  return (
    <motion.aside
      animate={{ width: collapsed ? 88 : 260 }}
      transition={{ type: 'spring', stiffness: 180, damping: 20 }}
      className="vx-glass fixed left-0 top-0 z-30 flex h-screen flex-col p-3"
    >
      <button onClick={onToggle} className="mb-4 flex items-center gap-3 rounded-xl border border-border bg-panel p-2.5 text-left">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-violet-500">
          <Shield className="h-4 w-4 text-white" />
        </div>
        {!collapsed && (
          <div>
            <p className="text-sm font-bold text-primary-text">VERITAS X</p>
            <p className="text-[11px] text-muted-text">Trust Platform</p>
          </div>
        )}
      </button>

      <nav className="space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                isActive
                  ? 'border border-blue-400/30 bg-gradient-to-r from-blue-500/20 to-violet-500/20 text-primary-text'
                  : 'text-muted-text hover:bg-panel hover:text-primary-text'
              }`}
            >
              <Icon className="h-4.5 w-4.5" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          )
        })}
      </nav>

      <div className="mt-auto rounded-xl border border-border bg-panel p-3">
        <div className="flex items-center gap-2 text-xs text-muted-text">
          <LifeBuoy className="h-3.5 w-3.5" />
          {!collapsed && 'SOC Monitoring Active'}
        </div>
      </div>
    </motion.aside>
  )
}
