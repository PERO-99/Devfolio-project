import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell } from 'recharts'
import { useRealtimeData } from '../contexts/RealtimeContext'

const COLORS = ['#34d399', '#fbbf24', '#f87171']

export default function AnalyticsPage() {
  const { stats } = useRealtimeData()
  const data = [
    { name: 'Safe', value: stats.safe || 0 },
    { name: 'Suspicious', value: stats.suspicious || 0 },
    { name: 'Danger', value: stats.danger || 0 },
  ]

  return (
    <div className="vx-card h-[420px] p-6">
      <h3 className="text-lg font-bold text-primary-text">Detection Distribution</h3>
      <p className="text-sm text-muted-text">Status split across processed scans.</p>
      <div className="mt-4 h-[320px]">
        {stats.total ? (
          <ResponsiveContainer>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" outerRadius={110} innerRadius={65}>
                {data.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 10 }} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="vx-empty h-full">No analytics yet. Process detections to populate this chart.</div>
        )}
      </div>
    </div>
  )
}
