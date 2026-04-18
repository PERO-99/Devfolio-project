import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { motion } from 'framer-motion'

export default function ActivityChart({ detections = [] }) {
  const points = detections
    .slice(0, 14)
    .reverse()
    .map((d, i) => ({
      name: i + 1,
      risk: Math.round(d.risk_score || 0),
    }))

  return (
    <motion.div className="vx-card h-[320px] p-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32 }}>
      <p className="mb-3 text-sm font-semibold text-white">Risk Activity Trend</p>
      {points.length === 0 ? (
        <div className="vx-empty h-[86%]">Waiting for live detections to draw activity trend.</div>
      ) : (
        <ResponsiveContainer width="100%" height="90%">
          <AreaChart data={points}>
            <defs>
              <linearGradient id="riskFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.65} />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#33415555" />
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
            <YAxis stroke="#94a3b8" fontSize={11} />
            <Tooltip
              contentStyle={{
                background: '#0f172abf',
                border: '1px solid #334155',
                borderRadius: 10,
                color: '#e2e8f0',
              }}
            />
            <Area type="monotone" dataKey="risk" stroke="#38bdf8" fill="url(#riskFill)" strokeWidth={2} isAnimationActive animationDuration={650} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </motion.div>
  )
}
