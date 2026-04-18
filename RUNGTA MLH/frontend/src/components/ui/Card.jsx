export default function Card({ className = '', children }) {
  return <section className={`vx-card p-5 ${className}`.trim()}>{children}</section>
}
