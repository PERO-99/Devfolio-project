import { motion } from 'framer-motion'
import { AlertTriangle, Globe2, ShieldAlert } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import { geoToRegion, inferThreatType } from '../../services/api'
import Badge from '../ui/Badge'

function feedTitle(detection) {
  if (detection.reasons?.length) return detection.reasons[0]
  try {
    return `Suspicious activity from ${new URL(detection.url || '').hostname}`
  } catch {
    return 'Suspicious campaign detected'
  }
}

export default function ThreatFeed({ detections = [], onSelect }) {
  const feed = detections
    .filter((d) => d.status === 'danger' || d.status === 'suspicious')
    .slice(0, 14)

  const newestKey = useMemo(() => {
    const first = feed[0]
    return first ? `${first.url || 'unknown'}-${first.timestamp || 'now'}` : ''
  }, [feed])

  const lastNewestRef = useRef('')
  const scrollRef = useRef(null)

  useEffect(() => {
    if (!newestKey) return
    if (scrollRef.current && newestKey !== lastNewestRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
    lastNewestRef.current = newestKey
  }, [newestKey])

  if (!feed.length) {
    return (
      <div className="vx-card p-6">
        <p className="text-sm text-muted-text">No global threat activity yet. New detections will stream here in real time.</p>
      </div>
    )
  }

  return (
    <div ref={scrollRef} className="max-h-[520px] space-y-3 overflow-auto pr-1">
      {feed.map((d, index) => {
        const title = feedTitle(d)
        const type = inferThreatType(d)
        const region = geoToRegion(d.geo)
        const itemKey = `${d.url || 'unknown'}-${d.timestamp}-${index}`
        const isNewest = itemKey.startsWith(newestKey)
        return (
          <motion.button
            key={itemKey}
            className={`vx-card w-full cursor-pointer p-4 text-left transition hover:border-blue-400/40 ${isNewest ? 'vx-alert-flash border-red-400/40' : ''}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.02 }}
            onClick={() => onSelect?.(d)}
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-primary-text">{title}</p>
              <Badge status={d.status}>{d.status.toUpperCase()}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-text">
              <span className="inline-flex items-center gap-1"><Globe2 className="h-3.5 w-3.5" />{region}</span>
              <span className="inline-flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" />{type}</span>
              <span className="inline-flex items-center gap-1"><ShieldAlert className="h-3.5 w-3.5" />risk {Math.round(d.risk_score || 0)}</span>
              <span>{d.timestamp ? new Date(d.timestamp).toLocaleString() : 'just now'}</span>
            </div>
          </motion.button>
        )
      })}
    </div>
  )
}
