'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface CapturedFrame {
  data: string
  timestamp: number
}

export default function Home() {
  const [mode, setMode] = useState<'upload' | 'capture' | null>(null)
  const [frames, setFrames] = useState<CapturedFrame[]>([])
  const [isCapturing, setIsCapturing] = useState(false)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [fps, setFps] = useState(10)
  const [captureInterval, setCaptureInterval] = useState(1000)
  const [isGenerating, setIsGenerating] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => {
      stopCapture()
    }
  }, [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      alert('Camera access denied or not available')
      console.error(err)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    if (!ctx) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)

    const frameData = canvas.toDataURL('image/jpeg', 0.8)
    setFrames(prev => [...prev, { data: frameData, timestamp: Date.now() }])
  }

  const startCapture = async () => {
    await startCamera()
    setIsCapturing(true)

    intervalRef.current = setInterval(() => {
      captureFrame()
    }, captureInterval)
  }

  const stopCapture = () => {
    setIsCapturing(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    stopCamera()
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const imageFiles = Array.from(files).filter(file =>
      file.type.startsWith('image/')
    )

    imageFiles.forEach(file => {
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          setFrames(prev => [...prev, {
            data: event.target!.result as string,
            timestamp: Date.now()
          }])
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const generateTimelapse = async () => {
    if (frames.length < 2) {
      alert('Need at least 2 frames to create a timelapse')
      return
    }

    setIsGenerating(true)

    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Could not get canvas context')

      const firstImage = new Image()
      firstImage.src = frames[0].data
      await new Promise(resolve => firstImage.onload = resolve)

      canvas.width = firstImage.width
      canvas.height = firstImage.height

      const stream = canvas.captureStream(fps)
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 5000000
      })

      const chunks: Blob[] = []
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' })
        const url = URL.createObjectURL(blob)
        setVideoUrl(url)
        setIsGenerating(false)
      }

      mediaRecorder.start()

      for (const frame of frames) {
        const img = new Image()
        img.src = frame.data
        await new Promise(resolve => img.onload = resolve)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        await new Promise(resolve => setTimeout(resolve, 1000 / fps))
      }

      mediaRecorder.stop()
    } catch (err) {
      console.error('Error generating timelapse:', err)
      alert('Error generating timelapse video')
      setIsGenerating(false)
    }
  }

  const downloadVideo = () => {
    if (!videoUrl) return
    const a = document.createElement('a')
    a.href = videoUrl
    a.download = `nature-timelapse-${Date.now()}.webm`
    a.click()
  }

  const reset = () => {
    setFrames([])
    setVideoUrl(null)
    setMode(null)
    stopCapture()
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-bold text-white mb-4 drop-shadow-lg">
            🌿 Nature Timelapse Creator
          </h1>
          <p className="text-xl text-white/90 drop-shadow">
            Capture or upload images to create stunning timelapse videos
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {!mode && (
            <motion.div
              key="mode-select"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="grid md:grid-cols-2 gap-6 mb-8"
            >
              <button
                onClick={() => setMode('capture')}
                className="bg-white/90 backdrop-blur p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:scale-105"
              >
                <div className="text-6xl mb-4">📷</div>
                <h2 className="text-2xl font-bold text-nature-green mb-2">
                  Capture Live
                </h2>
                <p className="text-gray-600">
                  Use your camera to capture frames in real-time
                </p>
              </button>

              <button
                onClick={() => setMode('upload')}
                className="bg-white/90 backdrop-blur p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:scale-105"
              >
                <div className="text-6xl mb-4">📁</div>
                <h2 className="text-2xl font-bold text-nature-green mb-2">
                  Upload Images
                </h2>
                <p className="text-gray-600">
                  Upload a series of images to create a timelapse
                </p>
              </button>
            </motion.div>
          )}

          {mode === 'capture' && (
            <motion.div
              key="capture-mode"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-white/90 backdrop-blur rounded-2xl shadow-xl p-8 mb-8"
            >
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Capture Interval (ms): {captureInterval}
                </label>
                <input
                  type="range"
                  min="500"
                  max="5000"
                  step="500"
                  value={captureInterval}
                  onChange={(e) => setCaptureInterval(Number(e.target.value))}
                  className="w-full"
                  disabled={isCapturing}
                />
              </div>

              <div className="relative bg-black rounded-lg overflow-hidden mb-6" style={{ aspectRatio: '16/9' }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </div>

              <canvas ref={canvasRef} className="hidden" />

              <div className="flex gap-4">
                {!isCapturing ? (
                  <button
                    onClick={startCapture}
                    className="flex-1 bg-nature-green text-white py-3 px-6 rounded-lg font-semibold hover:bg-nature-lightgreen transition-colors"
                  >
                    Start Capturing
                  </button>
                ) : (
                  <button
                    onClick={stopCapture}
                    className="flex-1 bg-red-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-red-700 transition-colors"
                  >
                    Stop Capturing
                  </button>
                )}
                <button
                  onClick={reset}
                  className="bg-gray-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
                >
                  Reset
                </button>
              </div>
            </motion.div>
          )}

          {mode === 'upload' && (
            <motion.div
              key="upload-mode"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-white/90 backdrop-blur rounded-2xl shadow-xl p-8 mb-8"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-4 border-dashed border-nature-green rounded-lg p-12 hover:bg-nature-green/10 transition-colors mb-4"
              >
                <div className="text-6xl mb-4">📸</div>
                <p className="text-xl font-semibold text-nature-green">
                  Click to upload images
                </p>
                <p className="text-gray-600 mt-2">
                  Select multiple images to create your timelapse
                </p>
              </button>

              <button
                onClick={reset}
                className="w-full bg-gray-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
              >
                Reset
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {frames.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/90 backdrop-blur rounded-2xl shadow-xl p-8 mb-8"
          >
            <h3 className="text-2xl font-bold text-nature-green mb-4">
              Captured Frames: {frames.length}
            </h3>

            <div className="grid grid-cols-6 gap-2 mb-6 max-h-64 overflow-y-auto">
              {frames.map((frame, index) => (
                <img
                  key={index}
                  src={frame.data}
                  alt={`Frame ${index + 1}`}
                  className="w-full h-20 object-cover rounded border-2 border-nature-green/30"
                />
              ))}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Timelapse FPS: {fps}
              </label>
              <input
                type="range"
                min="1"
                max="30"
                value={fps}
                onChange={(e) => setFps(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <button
              onClick={generateTimelapse}
              disabled={isGenerating || frames.length < 2}
              className="w-full bg-nature-green text-white py-4 px-6 rounded-lg font-semibold hover:bg-nature-lightgreen transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isGenerating ? 'Generating Timelapse...' : 'Generate Timelapse Video'}
            </button>
          </motion.div>
        )}

        {videoUrl && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/90 backdrop-blur rounded-2xl shadow-xl p-8"
          >
            <h3 className="text-2xl font-bold text-nature-green mb-4">
              🎬 Your Timelapse Video
            </h3>

            <video
              src={videoUrl}
              controls
              loop
              className="w-full rounded-lg mb-4"
            />

            <button
              onClick={downloadVideo}
              className="w-full bg-nature-green text-white py-4 px-6 rounded-lg font-semibold hover:bg-nature-lightgreen transition-colors"
            >
              Download Video
            </button>
          </motion.div>
        )}
      </div>
    </main>
  )
}
