import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Filter, Radio, ShieldAlert, ShieldCheck } from 'lucide-react'
import ThreatFeed from '../components/feature/ThreatFeed'
import ActivityChart from '../components/charts/ActivityChart'
import DetectionTable from '../components/ui/DetectionTable'
import Modal from '../components/ui/Modal'
import StatCard from '../components/ui/StatCard'
import { useRealtimeData } from '../contexts/RealtimeContext'
import { inferThreatType } from '../services/api'

export default function DashboardPage() {
  const { stats, detections, loading, isConnected } = useRealtimeData()
  const [riskFilter, setRiskFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [timeFilter, setTimeFilter] = useState('24h')
  const [selectedDetection, setSelectedDetection] = useState(null)

  const filteredDetections = useMemo(() => {
    const now = Date.now()
    const maxAge = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      all: Number.POSITIVE_INFINITY,
    }[timeFilter]

    return detections.filter((detection) => {
      const ts = detection.timestamp ? new Date(detection.timestamp).getTime() : now
      const ageMatches = now - ts <= maxAge
      const riskMatches = riskFilter === 'all' || detection.status === riskFilter
      const typeMatches = typeFilter === 'all' || inferThreatType(detection) === typeFilter
      return ageMatches && riskMatches && typeMatches
    })
  }, [detections, riskFilter, timeFilter, typeFilter])

  const duplicateInsight = useMemo(() => {
    const counts = {}
    for (const item of filteredDetections) {
      const key = (item.reasons?.[0] || inferThreatType(item)).slice(0, 60)
      counts[key] = (counts[key] || 0) + 1
    }
    const [title, count] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] || ['No trending campaign yet', 0]
    return { title, count }
  }, [filteredDetections])

  return (
    <div className="space-y-5">
      <div className="vx-card flex items-center justify-between p-3">
        <div>
          <p className="text-sm font-semibold text-primary-text">Command Center Live Monitor</p>
          <p className="text-xs text-muted-text">Realtime intelligence stream for scam and trust incidents.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/35 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-cyan-300">
          <span className="h-2 w-2 rounded-full bg-cyan-300 vx-live-dot" />
          <Radio className="h-3.5 w-3.5" />
          LIVE {isConnected ? 'CONNECTED' : 'SYNCING'}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Scans" value={stats.total || 0} subtitle="All-time processed" icon={ShieldCheck} tone="from-blue-500/15 to-violet-500/10" />
        <StatCard title="Safe" value={stats.safe || 0} subtitle="Low risk verified" icon={CheckCircle2} tone="from-emerald-500/15 to-emerald-700/10" />
        <StatCard title="Suspicious" value={stats.suspicious || 0} subtitle="Needs extra review" icon={AlertTriangle} tone="from-amber-500/15 to-amber-700/10" />
        <StatCard title="Danger" value={stats.danger || 0} subtitle="High-risk blocked" icon={ShieldAlert} tone="from-red-500/15 to-red-700/10" />
      </div>

      <div className="vx-card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-primary-text">Interactive Filters</h3>
            <p className="text-xs text-muted-text">Refine threat stream by time range, risk level, and media type.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-text">
            <Filter className="h-3.5 w-3.5" />
            {filteredDetections.length} matching detections
          </div>
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          <select className="vx-input" value={timeFilter} onChange={(event) => setTimeFilter(event.target.value)}>
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="all">All time</option>
          </select>
          <select className="vx-input" value={riskFilter} onChange={(event) => setRiskFilter(event.target.value)}>
            <option value="all">All risk levels</option>
            <option value="suspicious">Suspicious only</option>
            <option value="danger">Danger only</option>
          </select>
          <select className="vx-input" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="all">All types</option>
            <option value="url">URL</option>
            <option value="text">Text</option>
            <option value="image">Image</option>
            <option value="video">Video</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <ActivityChart detections={filteredDetections} />
        <div className="vx-card p-4">
          <h3 className="text-sm font-semibold text-primary-text">Threat Pulse</h3>
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-border bg-panel p-3">
              <p className="text-xs text-muted-text">Detection Confidence Avg.</p>
              <p className="text-xl font-bold text-cyan-300">{filteredDetections.length ? Math.round(filteredDetections.reduce((sum, item) => sum + (item.confidence || 0), 0) / filteredDetections.length) : 0}%</p>
            </div>
            <div className="rounded-xl border border-border bg-panel p-3">
              <p className="text-xs text-muted-text">Trending Threat Insight</p>
              <p className="text-sm font-semibold text-primary-text">{duplicateInsight.title}</p>
              <p className="mt-1 text-sm font-bold text-amber-300">{duplicateInsight.count > 0 ? `This scam is appearing ${duplicateInsight.count}+ times globally` : 'No duplicate spike detected yet'}</p>
            </div>
            <div className="rounded-xl border border-border bg-panel p-3">
              <p className="text-xs text-muted-text">Realtime Sync</p>
              <p className="text-lg font-semibold text-emerald-300">{loading ? 'Connecting...' : isConnected ? 'Active Live Stream' : 'Reconnecting...'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
        <section>
          <h3 className="mb-2 text-sm font-semibold text-primary-text">Real-time Global Threat Feed</h3>
          <ThreatFeed detections={filteredDetections} onSelect={setSelectedDetection} />
        </section>
        <section>
          <h3 className="mb-2 text-sm font-semibold text-primary-text">Detection Stream</h3>
          <DetectionTable detections={filteredDetections} />
        </section>
      </div>

      <Modal open={Boolean(selectedDetection)} title="Detection Details" onClose={() => setSelectedDetection(null)}>
        {selectedDetection ? (
          <div className="space-y-3 text-sm">
            <p><span className="text-muted-text">URL:</span> <span className="text-primary-text">{selectedDetection.url || 'N/A'}</span></p>
            <p><span className="text-muted-text">Status:</span> <span className="text-primary-text">{selectedDetection.status}</span></p>
            <p><span className="text-muted-text">Risk Score:</span> <span className="text-primary-text">{Math.round(selectedDetection.risk_score || 0)}</span></p>
            <p><span className="text-muted-text">Confidence:</span> <span className="text-primary-text">{Math.round(selectedDetection.confidence || 0)}%</span></p>
            <div>
              <p className="mb-2 text-muted-text">Reasoning Breakdown</p>
              <ul className="space-y-1 text-body-text">
                {(selectedDetection.reasons || ['No detailed reasons available']).map((reason, index) => (
                  <li key={index}>- {reason}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
