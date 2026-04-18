import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import TrendCard from '../components/feature/TrendCard'
import { useRealtimeData } from '../contexts/RealtimeContext'
import { geoToRegion, inferThreatType } from '../services/api'

function buildTrends(detections) {
  const trendMap = new Map()

  for (const detection of detections) {
    const type = inferThreatType(detection)
    const region = geoToRegion(detection.geo)
    const key = `${region}:${type}:${detection.status}`
    const current = trendMap.get(key) || {
      title: `${type.toUpperCase()} scam campaign spreading in ${region}`,
      region,
      type,
      frequency: 0,
      severity: detection.status,
    }
    current.frequency += 1
    trendMap.set(key, current)
  }

  return [...trendMap.values()]
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 12)
}

export default function TrendsPage() {
  const { detections } = useRealtimeData()
  const trends = buildTrends(detections)

  const graphData = trends.slice(0, 6).map((trend) => ({
    name: `${trend.region.split(' ')[0]}-${trend.type}`,
    frequency: trend.frequency,
  }))

  return (
    <div className="space-y-4">
      <section className="vx-card p-5">
        <h2 className="text-lg font-bold text-primary-text">Global Scam Momentum</h2>
        <p className="mt-1 text-sm text-muted-text">Track top active threat campaigns and duplicate frequency across regions.</p>
        <div className="mt-4 h-[260px]">
          <ResponsiveContainer>
            <BarChart data={graphData}>
              <XAxis dataKey="name" stroke="var(--muted-text)" fontSize={11} />
              <YAxis stroke="var(--muted-text)" fontSize={11} />
              <Tooltip contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 10 }} />
              <Bar dataKey="frequency" fill="#38bdf8" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="grid gap-3">
        {trends.length ? trends.map((trend, index) => <TrendCard key={`${trend.title}-${index}`} trend={trend} />) : (
          <div className="vx-card p-6 text-sm text-muted-text">No trend data yet. Threat trends appear as detections are processed.</div>
        )}
      </section>
    </div>
  )
}
