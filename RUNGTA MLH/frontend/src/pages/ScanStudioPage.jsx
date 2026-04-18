import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import ResultCard from '../components/feature/ResultCard'
import ScanPanel from '../components/feature/ScanPanel'
import Loader from '../components/ui/Loader'
import { api } from '../services/api'

export default function ScanStudioPage() {
  const [mode, setMode] = useState('url')
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [imageName, setImageName] = useState('')
  const [videoName, setVideoName] = useState('')
  const [imageB64, setImageB64] = useState('')
  const [videoFile, setVideoFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const onPickImage = async (file) => {
    if (!file) return
    setImageName(file.name)
    const reader = new FileReader()
    reader.onload = () => {
      const val = String(reader.result || '')
      const encoded = val.includes(',') ? val.split(',')[1] : val
      setImageB64(encoded)
    }
    reader.readAsDataURL(file)
  }

  const onPickVideo = (file) => {
    if (!file) return
    setVideoName(file.name)
    setVideoFile(file)
  }

  const canAnalyze =
    (mode === 'url' && (Boolean(url.trim()) || Boolean(text.trim()))) ||
    (mode === 'text' && Boolean(text.trim())) ||
    (mode === 'image' && Boolean(imageB64)) ||
    (mode === 'video' && (Boolean(videoUrl.trim()) || Boolean(videoFile)))

  const analyze = async () => {
    if (!canAnalyze) return
    setLoading(true)
    setResult(null)

    try {
      let responseData

      if (mode === 'image') {
        responseData = await api.analyzeImage({
          image_b64: imageB64,
          url: url || 'manual://image',
          user_id: 'studio-user',
          mode: 'sync',
        })
      } else if (mode === 'video') {
        const fallbackVideoUrl = videoUrl || (videoFile ? `upload://${videoFile.name}` : 'manual://video')
        responseData = await api.analyzeVideo({
          video_url: fallbackVideoUrl,
          url: url || fallbackVideoUrl,
          user_id: 'studio-user',
          mode: 'sync',
        })
      } else {
        responseData = await api.analyzeText({
          url: url || `manual://${mode}`,
          text,
          headings: [],
          captions: [],
          links: [],
          images: [],
          videos: mode === 'video' ? [videoUrl] : [],
          user_id: 'studio-user',
          mode: 'sync',
        })
      }

      setResult(responseData?.result || null)
    } catch (error) {
      setResult({
        status: 'suspicious',
        risk_score: 50,
        summary: error.message || 'Request failed. Check backend service and try again.',
        advice: 'Ensure API is reachable and retry with valid input.',
        sources: [],
      })
    } finally {
      setLoading(false)
    }
  }

  const runScenario = (scenario) => {
    if (scenario === 'otp') {
      setMode('text')
      setUrl('https://verify-gateway-alert.xyz')
      setText('Your OTP verification code is required immediately. Share code now and click link to avoid account suspension.')
      return
    }
    if (scenario === 'upi') {
      setMode('text')
      setUrl('https://paytm-secure-check.xyz')
      setText('URGENT KYC UPDATE. Your UPI account is blocked. Click link now and pay Rs 1 to reactivate instantly.')
      return
    }
    setMode('text')
    setUrl('https://www.example.org/safety-guide')
    setText('This is a public awareness article about online safety best practices and secure password hygiene.')
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1.1fr_1fr]">
      <ScanPanel
        mode={mode}
        onMode={setMode}
        url={url}
        onUrl={setUrl}
        text={text}
        onText={setText}
        imageName={imageName}
        onImagePick={onPickImage}
        videoName={videoName}
        onVideoPick={onPickVideo}
        videoUrl={videoUrl}
        onVideoUrl={setVideoUrl}
        loading={loading}
        onAnalyze={analyze}
        onDemoScenario={runScenario}
      />

      <div>
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Loader label="Running multimodal verification..." />
            </motion.div>
          ) : (
            <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ResultCard result={result} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
