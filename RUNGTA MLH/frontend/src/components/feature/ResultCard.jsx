import { motion } from 'framer-motion'
import { AlertTriangle, Link2, ShieldAlert, ShieldCheck, Sparkles } from 'lucide-react'
import { normalizeStatus, STATUS_STYLES } from '../../lib/status'

function statusIcon(status) {
  if (status === 'safe') return <ShieldCheck className="h-4 w-4 text-emerald-300" />
  if (status === 'danger') return <ShieldAlert className="h-4 w-4 text-red-300" />
  return <AlertTriangle className="h-4 w-4 text-amber-300" />
}

export default function ResultCard({ result }) {
  if (!result) {
    return (
      <div className="vx-card p-6 text-sm text-muted-text">
        No result yet. Submit a scan to see evidence-backed verdicts.
      </div>
    )
  }

  const status = normalizeStatus(result.status)
  const style = STATUS_STYLES[status]
  const score = Math.max(0, Math.min(100, Math.round(result.risk_score || 0)))

  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className={`vx-card p-6 ${style.glow}`}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${style.badge}`}>{statusIcon(status)} {status.toUpperCase()}</span>
          <h3 className="mt-2 text-lg font-bold text-primary-text">Scan Verdict</h3>
          <p className="mt-1 text-sm text-muted-text">{result.summary || result.reasoning || 'No explanation provided.'}</p>
        </div>
        <div className="rounded-xl border border-border bg-panel px-3 py-2 text-right">
          <p className="text-[11px] uppercase tracking-widest text-muted-text">Score</p>
          <p className="text-xl font-bold text-primary-text">{score}</p>
        </div>
      </div>

      <div className="mb-5 h-2.5 overflow-hidden rounded-full bg-panel">
        <motion.div initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ duration: 0.6 }} className="h-full bg-gradient-to-r from-cyan-400 to-violet-500" />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-panel p-3">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-text"><Sparkles className="h-3.5 w-3.5" />Explanation</p>
          <p className="text-sm text-body-text">{result.advice || 'Verify through official channels when risk is non-safe.'}</p>
        </div>
        <div className="rounded-xl border border-border bg-panel p-3">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-text"><Link2 className="h-3.5 w-3.5" />Sources</p>
          <ul className="space-y-1.5 text-sm text-body-text">
            {(result.sources || []).slice(0, 3).map((source, index) => (
              <li key={index} className="truncate">{source.title || source.url}</li>
            ))}
            {(!result.sources || result.sources.length === 0) && <li className="text-muted-text">No source links available.</li>}
          </ul>
        </div>
      </div>
    </motion.div>
  )
}
