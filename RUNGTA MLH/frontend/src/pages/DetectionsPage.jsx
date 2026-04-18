import DetectionTable from '../components/ui/DetectionTable'
import { useRealtimeData } from '../contexts/RealtimeContext'

export default function DetectionsPage() {
  const { detections, loading } = useRealtimeData()

  if (loading) {
    return <div className="vx-skeleton h-48 w-full" />
  }

  return <DetectionTable detections={detections} />
}
