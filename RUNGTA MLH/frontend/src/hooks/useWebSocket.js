import { useRealtimeData } from '../contexts/RealtimeContext'

export function useWebSocket() {
  return useRealtimeData()
}
