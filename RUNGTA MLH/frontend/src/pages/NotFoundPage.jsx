import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">404</p>
      <h1 className="mt-3 text-4xl font-bold text-primary-text">Page not found</h1>
      <p className="mt-3 text-sm text-muted-text">The route you requested does not exist or was moved to another workspace section.</p>
      <Link className="vx-btn-primary mt-7" to="/app/dashboard">Return to Dashboard</Link>
    </div>
  )
}
