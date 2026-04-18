import { motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react'
import { normalizeStatus, STATUS_STYLES } from '../../lib/status'

function statusIcon(status) {
  if (status === 'safe') return <CheckCircle2 className="h-3.5 w-3.5" />
  if (status === 'danger') return <ShieldAlert className="h-3.5 w-3.5" />
  return <AlertTriangle className="h-3.5 w-3.5" />
}

export default function DetectionTable({ detections = [] }) {
  return (
    <div className="vx-card overflow-hidden">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-primary-text">Recent Detections</h3>
      </div>
      <div className="max-h-[380px] overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-panel text-xs uppercase tracking-wide text-muted-text">
            <tr>
              <th className="px-4 py-3 font-medium">URL</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Score</th>
              <th className="px-4 py-3 font-medium">Time</th>
            </tr>
          </thead>
          <tbody>
            {detections.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-text">No detections yet.</td>
              </tr>
            ) : (
              detections.slice(0, 20).map((d, i) => {
                const status = normalizeStatus(d.status)
                const style = STATUS_STYLES[status]
                return (
                  <motion.tr
                    key={`${d.url}-${i}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-border text-body-text"
                  >
                    <td className="px-4 py-3">
                      <p className="max-w-[360px] truncate text-xs text-body-text">{d.url}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${style.badge}`}>
                        {statusIcon(status)}
                        {status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-primary-text">{Math.round(d.risk_score || 0)}</td>
                    <td className="px-4 py-3 text-xs text-muted-text">
                      {d.timestamp ? new Date(d.timestamp).toLocaleTimeString() : '-'}
                    </td>
                  </motion.tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
