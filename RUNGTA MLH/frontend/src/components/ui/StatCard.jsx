import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'

export default function StatCard({ title, value, subtitle, icon: Icon, tone = 'from-blue-500/20 to-violet-500/10' }) {
  const numericTarget = Number(value) || 0
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const start = performance.now()
    const duration = 850
    const begin = displayValue
    const target = numericTarget

    let raf = 0
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration)
      const eased = 1 - (1 - progress) * (1 - progress)
      const next = Math.round(begin + (target - begin) * eased)
      setDisplayValue(next)
      if (progress < 1) raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [numericTarget])

  const prettyValue = useMemo(() => new Intl.NumberFormat('en-IN').format(displayValue), [displayValue])
  const isDanger = String(title).toLowerCase().includes('danger')
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 220, damping: 18 }}
      className={`vx-card p-4 bg-gradient-to-br ${tone} ${isDanger ? 'vx-danger-pulse' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-muted-text">{title}</p>
          <p className="mt-1 text-2xl font-bold text-primary-text">
            {prettyValue}
          </p>
          <p className="mt-1 text-xs text-muted-text">{subtitle}</p>
        </div>
        <div className="rounded-xl border border-border bg-panel p-2.5">
          {Icon ? <Icon className="h-5 w-5 text-cyan-300" /> : null}
        </div>
      </div>
    </motion.div>
  )
}
