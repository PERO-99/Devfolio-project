import { useState } from 'react'
import Button from '../components/ui/Button'
import { useTheme } from '../contexts/ThemeContext'

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const [alerts, setAlerts] = useState(() => localStorage.getItem('vx_setting_alerts') !== 'false')
  const [extensionSync, setExtensionSync] = useState(() => localStorage.getItem('vx_setting_extension_sync') !== 'false')
  const [saved, setSaved] = useState('')

  const save = () => {
    localStorage.setItem('vx_setting_alerts', String(alerts))
    localStorage.setItem('vx_setting_extension_sync', String(extensionSync))
    localStorage.setItem('vx_theme', theme)
    setSaved('Settings saved')
    setTimeout(() => setSaved(''), 1800)
  }

  return (
    <div className="vx-card max-w-2xl p-6">
      <h3 className="text-lg font-bold text-primary-text">Settings</h3>
      <p className="mt-1 text-sm text-muted-text">Control workspace behavior and detection preferences.</p>

      <div className="mt-6 space-y-4">
        <label className="flex items-center justify-between rounded-xl border border-border bg-panel p-4 text-sm text-body-text">
          Dark theme
          <input type="checkbox" checked={theme === 'dark'} onChange={(event) => setTheme(event.target.checked ? 'dark' : 'light')} />
        </label>
        <label className="flex items-center justify-between rounded-xl border border-border bg-panel p-4 text-sm text-body-text">
          Risk notifications
          <input type="checkbox" checked={alerts} onChange={(event) => setAlerts(event.target.checked)} />
        </label>
        <label className="flex items-center justify-between rounded-xl border border-border bg-panel p-4 text-sm text-body-text">
          Extension sync
          <input type="checkbox" checked={extensionSync} onChange={(event) => setExtensionSync(event.target.checked)} />
        </label>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <Button onClick={save}>Save</Button>
        {saved ? <p className="text-xs text-emerald-300">{saved}</p> : null}
      </div>
    </div>
  )
}
