import { AnimatePresence, motion } from 'framer-motion'
import { Outlet, useLocation } from 'react-router-dom'
import { useState } from 'react'
import Navbar from './Navbar'
import Sidebar from './Sidebar'

const routeTitles = {
  '/app/dashboard': 'Threat Command Center',
  '/app/scan': 'Scan Studio',
  '/app/detections': 'Detections',
  '/app/analytics': 'Analytics',
  '/app/trends': 'Global Trends',
  '/app/profile': 'Profile',
  '/app/settings': 'Settings',
  '/app/support': 'Support',
}

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  return (
    <div className="min-h-screen">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />

      <main className="transition-all duration-300" style={{ marginLeft: collapsed ? 92 : 264 }}>
        <div className="p-6">
          <Navbar title={routeTitles[location.pathname] || 'VERITAS X'} />
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
