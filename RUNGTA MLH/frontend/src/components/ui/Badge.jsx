import { STATUS_STYLES, normalizeStatus } from '../../lib/status'

export default function Badge({ status = 'suspicious', children }) {
  const normalized = normalizeStatus(status)
  const style = STATUS_STYLES[normalized]
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${style.badge}`}>{children || normalized}</span>
}
