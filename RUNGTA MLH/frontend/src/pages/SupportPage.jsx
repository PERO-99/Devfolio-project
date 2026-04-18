import { useState } from 'react'

export default function SupportPage() {
  const [submitted, setSubmitted] = useState(false)

  const submit = (event) => {
    event.preventDefault()
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 2500)
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.15fr_1fr]">
      <section className="vx-card p-6">
        <h3 className="text-lg font-bold text-primary-text">FAQ</h3>
        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-border bg-panel p-4">
            <p className="font-semibold text-primary-text">Why was content marked suspicious?</p>
            <p className="mt-1 text-sm text-muted-text">Mixed evidence, conflicting source signals, or unresolved contradictions across trusted sources.</p>
          </div>
          <div className="rounded-xl border border-border bg-panel p-4">
            <p className="font-semibold text-primary-text">How do I reduce false positives?</p>
            <p className="mt-1 text-sm text-muted-text">Use Scan Studio with multimodal context and validate against source-backed evidence before escalation.</p>
          </div>
          <div className="rounded-xl border border-border bg-panel p-4">
            <p className="font-semibold text-primary-text">How long are detections retained?</p>
            <p className="mt-1 text-sm text-muted-text">Recent detections are shown in the live feed while historical records remain queryable from backend logs.</p>
          </div>
        </div>
      </section>

      <section className="vx-card p-6">
        <h3 className="text-lg font-bold text-primary-text">Contact Support</h3>
        <form className="mt-4 space-y-3" onSubmit={submit}>
          <input className="vx-input" placeholder="Your email" required />
          <input className="vx-input" placeholder="Subject" required />
          <textarea className="vx-input min-h-[140px]" placeholder="Describe your issue" required />
          <button className="vx-btn-primary w-full" type="submit">Submit Ticket</button>
          {submitted ? <p className="text-xs text-emerald-300">Ticket submitted. Our team will contact you shortly.</p> : null}
        </form>
      </section>
    </div>
  )
}
