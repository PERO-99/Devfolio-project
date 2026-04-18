export const STATUS_STYLES = {
  safe: {
    badge: 'vx-status-safe',
    dot: 'bg-emerald-400',
    glow: 'shadow-[0_0_30px_rgba(16,185,129,0.32)]',
  },
  suspicious: {
    badge: 'vx-status-suspicious',
    dot: 'bg-amber-400',
    glow: 'shadow-[0_0_30px_rgba(245,158,11,0.3)]',
  },
  danger: {
    badge: 'vx-status-danger',
    dot: 'bg-red-400',
    glow: 'shadow-[0_0_30px_rgba(239,68,68,0.38)]',
  },
}

export function normalizeStatus(status) {
  if (!status) return 'suspicious'
  const s = String(status).toLowerCase()
  if (s === 'safe' || s === 'suspicious' || s === 'danger') return s
  return 'suspicious'
}
