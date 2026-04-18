import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../services/api'

const RealtimeContext = createContext(null)
const RECONNECT_DELAY = 3000
const MAX_DETECTIONS = 300

export function RealtimeProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [stats, setStats] = useState({ total: 0, danger: 0, suspicious: 0, safe: 0 })
  const [detections, setDetections] = useState([])
  const [latestDetection, setLatestDetection] = useState(null)

  const wsRef = useRef(null)
  const reconnectTimerRef = useRef(null)
  const mountedRef = useRef(true)
  const manualCloseRef = useRef(false)

  const refresh = useCallback(async () => {
    try {
      setError('')
      const [statsRes, recentRes] = await Promise.all([api.getStats(), api.getRecent(100)])
      if (!mountedRef.current) return
      if (statsRes.success) {
        const nextStats = statsRes.stats || {}
        setStats({
          total: Number(nextStats.total) || 0,
          danger: Number(nextStats.danger) || 0,
          suspicious: Number(nextStats.suspicious) || 0,
          safe: Number(nextStats.safe) || 0,
        })
      }
      if (recentRes.success) {
        const nextDetections = Array.isArray(recentRes.detections) ? recentRes.detections : []
        setDetections(nextDetections)
        setLatestDetection(nextDetections[0] || null)
      }
    } catch (err) {
      if (mountedRef.current) setError(err.message || 'Failed to fetch initial data')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  const connect = useCallback(() => {
    if (!mountedRef.current) return
    manualCloseRef.current = false

    try {
      const ws = new WebSocket(api.ws)
      wsRef.current = ws

      ws.onopen = () => {
        if (!mountedRef.current) return
        setIsConnected(true)
      }

      ws.onmessage = (event) => {
        if (!mountedRef.current) return
        try {
          const payload = JSON.parse(event.data)

          if (payload.type === 'stats' && payload.stats) {
            setStats(payload.stats)
            return
          }

          const detection = payload.detection || (payload.url ? payload : null)
          if (!detection) return

          setLatestDetection(detection)
          setDetections((prev) => [detection, ...(Array.isArray(prev) ? prev : [])].slice(0, MAX_DETECTIONS))
          setStats((prev) => ({
            total: (Number(prev?.total) || 0) + 1,
            danger: Number(prev?.danger) || 0,
            suspicious: Number(prev?.suspicious) || 0,
            safe: Number(prev?.safe) || 0,
            [detection.status]: (Number(prev?.[detection.status]) || 0) + 1,
          }))
        } catch {
          // Ignore malformed socket messages.
        }
      }

      ws.onclose = () => {
        if (!mountedRef.current) return
        setIsConnected(false)
        if (manualCloseRef.current) return
        reconnectTimerRef.current = setTimeout(connect, RECONNECT_DELAY)
      }

      ws.onerror = () => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close()
        }
      }
    } catch {
      reconnectTimerRef.current = setTimeout(connect, RECONNECT_DELAY)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    refresh()
    connect()

    const poll = setInterval(() => {
      refresh()
    }, 30000)

    return () => {
      mountedRef.current = false
      manualCloseRef.current = true
      clearInterval(poll)
      clearTimeout(reconnectTimerRef.current)
      if (wsRef.current) {
        wsRef.current.onopen = null
        wsRef.current.onmessage = null
        wsRef.current.onerror = null
        wsRef.current.onclose = null
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.close(1000, 'cleanup')
        }
      }
    }
  }, [connect, refresh])

  const value = useMemo(() => ({
    isConnected,
    loading,
    error,
    stats,
    detections,
    latestDetection,
    refresh,
  }), [detections, error, isConnected, latestDetection, loading, refresh, stats])

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
}

export function useRealtimeData() {
  const context = useContext(RealtimeContext)
  if (!context) throw new Error('useRealtimeData must be used inside RealtimeProvider')
  return context
}
