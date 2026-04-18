import { Flame, Globe2, Signal } from 'lucide-react'
import Badge from '../ui/Badge'

export default function TrendCard({ trend }) {
  return (
    <article className="vx-card p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-primary-text">{trend.title}</h3>
        <Badge status={trend.severity}>{trend.severity.toUpperCase()}</Badge>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-text">
        <span className="inline-flex items-center gap-1"><Globe2 className="h-3.5 w-3.5" />{trend.region}</span>
        <span className="inline-flex items-center gap-1"><Flame className="h-3.5 w-3.5" />{trend.frequency} reports</span>
        <span className="inline-flex items-center gap-1"><Signal className="h-3.5 w-3.5" />{trend.type}</span>
      </div>
    </article>
  )
}
