import { ImageUp, Link2, PlayCircle, Type, Video } from 'lucide-react'
import Button from '../ui/Button'

const tabs = [
  { key: 'url', label: 'URL', icon: Link2 },
  { key: 'text', label: 'Text', icon: Type },
  { key: 'image', label: 'Image', icon: ImageUp },
  { key: 'video', label: 'Video', icon: Video },
]

export default function ScanPanel({
  mode,
  onMode,
  url,
  onUrl,
  text,
  onText,
  imageName,
  onImagePick,
  videoName,
  onVideoPick,
  videoUrl,
  onVideoUrl,
  loading,
  onAnalyze,
  onDemoScenario,
}) {
  return (
    <div className="vx-card p-5">
      <h3 className="text-lg font-bold text-primary-text">Scan Studio</h3>
      <p className="mt-1 text-sm text-muted-text">Run URL, text, image, and video scans from one analysis hub.</p>

      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const active = mode === tab.key
          return (
            <button
              key={tab.key}
              className={`rounded-xl border px-3 py-2 text-sm transition ${active ? 'border-blue-400/50 bg-blue-500/15 text-primary-text' : 'border-border bg-panel text-muted-text hover:text-primary-text'}`}
              onClick={() => onMode(tab.key)}
            >
              <span className="inline-flex items-center gap-2">
                <Icon className="h-4 w-4" /> {tab.label}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-5 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-xs text-muted-text">Target URL (optional)</span>
          <input className="vx-input" value={url} onChange={(event) => onUrl(event.target.value)} placeholder="https://example.com" />
        </label>

        {mode === 'text' || mode === 'url' ? (
          <label className="block">
            <span className="mb-1.5 block text-xs text-muted-text">Text Content</span>
            <textarea className="vx-input min-h-[180px] resize-y" value={text} onChange={(event) => onText(event.target.value)} placeholder="Paste content for verification..." />
          </label>
        ) : null}

        {mode === 'image' ? (
          <label className="block">
            <span className="mb-1.5 block text-xs text-muted-text">Upload Image</span>
            <label className="vx-btn-secondary flex cursor-pointer items-center justify-center gap-2">
              <ImageUp className="h-4 w-4" /> Select Image
              <input type="file" accept="image/*" className="hidden" onChange={(event) => onImagePick(event.target.files?.[0])} />
            </label>
            <p className="mt-2 text-xs text-muted-text">{imageName || 'No image selected'}</p>
          </label>
        ) : null}

        {mode === 'video' ? (
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-xs text-muted-text">Video URL</span>
              <input className="vx-input" value={videoUrl} onChange={(event) => onVideoUrl(event.target.value)} placeholder="https://video.example/demo.mp4" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs text-muted-text">Upload Video (local)</span>
              <label className="vx-btn-secondary flex cursor-pointer items-center justify-center gap-2">
                <Video className="h-4 w-4" /> Select Video
                <input type="file" accept="video/*" className="hidden" onChange={(event) => onVideoPick(event.target.files?.[0])} />
              </label>
              <p className="mt-2 text-xs text-muted-text">{videoName || 'No video selected'}</p>
            </label>
          </div>
        ) : null}

        <Button className="w-full" onClick={onAnalyze} disabled={loading}>
          <PlayCircle className="mr-2 h-4 w-4" /> {loading ? 'Analyzing...' : 'Analyze'}
        </Button>

        <div className="rounded-xl border border-border bg-panel p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-cyan-300">Demo Scenarios</p>
          <div className="grid gap-2 md:grid-cols-3">
            <button className="vx-btn-secondary px-2 py-2 text-xs" onClick={() => onDemoScenario?.('otp')} type="button">OTP Scam Demo</button>
            <button className="vx-btn-secondary px-2 py-2 text-xs" onClick={() => onDemoScenario?.('upi')} type="button">UPI Fraud Demo</button>
            <button className="vx-btn-secondary px-2 py-2 text-xs" onClick={() => onDemoScenario?.('safe')} type="button">Safe Content Demo</button>
          </div>
        </div>
      </div>
    </div>
  )
}
