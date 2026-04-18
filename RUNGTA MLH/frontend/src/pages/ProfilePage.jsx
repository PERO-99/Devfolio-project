import { useMemo, useState } from 'react'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import Button from '../components/ui/Button'
import { useAuth } from '../contexts/AuthContext'
import { useRealtimeData } from '../contexts/RealtimeContext'

export default function ProfilePage() {
  const { session } = useAuth()
  const { stats, detections } = useRealtimeData()
  const [username, setUsername] = useState(session?.username || 'Security Analyst')
  const [email, setEmail] = useState(session?.email || 'analyst@veritasx.ai')
  const [saved, setSaved] = useState('')

  const chart = detections.slice(0, 12).reverse().map((d, i) => ({ i: i + 1, risk: Math.round(d.risk_score || 0) }))
  const timeline = useMemo(() => detections.slice(0, 8), [detections])
  const accuracy = stats.total ? Math.max(65, Math.round(100 - ((stats.danger || 0) / stats.total) * 25)) : 98

  const onSave = () => {
    localStorage.setItem('vx_profile', JSON.stringify({ username, email }))
    setSaved('Profile saved locally')
    setTimeout(() => setSaved(''), 1800)
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1.4fr]">
      <section className="vx-card p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/30 to-violet-500/30 text-lg font-bold">VX</div>
          <div>
            <h3 className="text-lg font-bold text-primary-text">{username}</h3>
            <p className="text-xs text-muted-text">{email}</p>
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-sm text-body-text">
            Username
            <input className="vx-input mt-1" value={username} onChange={(event) => setUsername(event.target.value)} />
          </label>
          <label className="block text-sm text-body-text">
            Email
            <input className="vx-input mt-1" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <Button className="w-full" onClick={onSave}>Save Profile</Button>
          {saved ? <p className="text-xs text-emerald-300">{saved}</p> : null}
        </div>

        <div className="mt-5 space-y-2 text-sm text-body-text">
          <p>Total scans: <span className="font-semibold text-primary-text">{stats.total || 0}</span></p>
          <p>Danger detected: <span className="font-semibold text-red-300">{stats.danger || 0}</span></p>
          <p>Accuracy: <span className="font-semibold text-emerald-300">{accuracy}%</span></p>
        </div>
      </section>

      <section className="space-y-4">
        <div className="vx-card p-5">
          <h3 className="mb-3 text-sm font-semibold text-primary-text">Activity Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chart}>
              <XAxis dataKey="i" stroke="var(--text-muted)" fontSize={11} />
              <YAxis stroke="var(--text-muted)" fontSize={11} />
              <Tooltip contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 10 }} />
              <Line dataKey="risk" type="monotone" stroke="#38bdf8" strokeWidth={2.2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="vx-card p-5">
          <h3 className="mb-3 text-sm font-semibold text-primary-text">Recent Activity</h3>
          <div className="space-y-2">
            {timeline.length ? timeline.map((item, index) => (
              <div key={`${item.url}-${item.timestamp}-${index}`} className="rounded-xl border border-border bg-panel p-3 text-sm">
                <p className="font-medium text-primary-text">{item.url || 'manual scan'}</p>
                <p className="text-xs text-muted-text">{item.timestamp ? new Date(item.timestamp).toLocaleString() : 'just now'} | {item.status} | risk {Math.round(item.risk_score || 0)}</p>
              </div>
            )) : <p className="text-sm text-muted-text">No activity yet.</p>}
          </div>
        </div>
      </section>
    </div>
  )
}
