import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

export default function Loader({ label = 'Analyzing threat signals...' }) {
  const stages = [
    label,
    'Analyzing threat...',
    'Checking signals...',
    'Evaluating risk...',
  ]
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setIdx((prev) => (prev + 1) % stages.length)
    }, 900)
    return () => clearInterval(timer)
  }, [stages.length])

  return (
    <div className="vx-card p-5">
      <div className="flex items-center gap-3">
        <div className="relative h-10 w-10">
          <motion.div
            className="absolute inset-0 rounded-full border border-blue-400/30"
            animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0.2, 0.6] }}
            transition={{ duration: 1.8, repeat: Infinity }}
          />
          <motion.div
            className="absolute inset-2 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-100">VERITAS X Reasoning Engine</p>
          <p className="text-xs text-slate-400">{stages[idx]}</p>
        </div>
      </div>
    </div>
  )
}
