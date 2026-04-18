const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8010').replace(/\/$/, '')
const API_BASE_PATH = `${API_BASE}/api`
const WS_BASE = (import.meta.env.VITE_WS_BASE_URL || API_BASE.replace(/^http/, 'ws')).replace(/\/$/, '')

async function requestJson(url, options = {}) {
  const response = await fetch(url, options)
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message = data?.detail || data?.error || `Request failed (${response.status})`
    throw new Error(message)
  }

  return data
}

export const api = {
  base: API_BASE,
  ws: `${WS_BASE}/ws`,

  async health() {
    return requestJson(`${API_BASE}/health`)
  },

  async getStats() {
    return requestJson(`${API_BASE_PATH}/stats`)
  },

  async getRecent(limit = 80) {
    return requestJson(`${API_BASE_PATH}/recent?limit=${limit}`)
  },

  async analyzeText(payload) {
    return requestJson(`${API_BASE_PATH}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  },

  async analyzeImage(payload) {
    return requestJson(`${API_BASE_PATH}/analyze-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  },

  async analyzeVideo(payload) {
    return requestJson(`${API_BASE_PATH}/analyze-video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  },
}

export function inferThreatType(detection = {}) {
  const reasons = (detection.reasons || []).join(' ').toLowerCase()
  if (reasons.includes('video')) return 'video'
  if (reasons.includes('image') || reasons.includes('hash') || reasons.includes('ocr')) return 'image'
  if (reasons.includes('link') || reasons.includes('url') || reasons.includes('domain')) return 'url'
  if (reasons.includes('text') || reasons.includes('phrase') || reasons.includes('keyword')) return 'text'
  return detection.type || 'url'
}

export function geoToRegion(geo) {
  if (!geo?.lat || !geo?.lng) return 'Global'
  const { lat, lng } = geo
  if (lat > 35 && lng > -10 && lng < 40) return 'Europe'
  if (lat > 5 && lat < 55 && lng >= 60 && lng <= 150) return 'Asia'
  if (lat > 10 && lng < -50) return 'North America'
  if (lat < -10 && lng < -30) return 'South America'
  if (lat < 15 && lng > 10 && lng < 55) return 'Africa'
  if (lat < -10 && lng > 110) return 'Oceania'
  return 'Global'
}
