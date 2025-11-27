'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Camera, SwitchCamera, Loader2 } from 'lucide-react'

interface CameraCaptureProps {
    onCapture: (file: File) => void
    onClose: () => void
}

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [isStreaming, setIsStreaming] = useState(false)
    const [error, setError] = useState<string>('')
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
    const [hasMultipleCameras, setHasMultipleCameras] = useState(false)

    // Check for multiple cameras
    useEffect(() => {
        async function checkCameras() {
            if (!navigator?.mediaDevices?.enumerateDevices) {
                console.log('enumerateDevices not supported')
                return
            }

            try {
                const devices = await navigator.mediaDevices.enumerateDevices()
                const videoDevices = devices.filter(device => device.kind === 'videoinput')
                setHasMultipleCameras(videoDevices.length > 1)
            } catch (e) {
                console.error('Error enumerating devices:', e)
            }
        }
        checkCameras()
    }, [])

    // Start camera stream
    const startStream = useCallback(async () => {
        if (!navigator?.mediaDevices?.getUserMedia) {
            setError('Camera access is not supported in this browser or context. If you are on mobile, you might need to use HTTPS.')
            setIsStreaming(false)
            return
        }

        try {
            if (videoRef.current && videoRef.current.srcObject) {
                const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
                tracks.forEach(track => track.stop())
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: facingMode,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false
            })

            if (videoRef.current) {
                videoRef.current.srcObject = stream
                setIsStreaming(true)
                setError('')
            }
        } catch (err) {
            console.error('Error accessing camera:', err)
            setError('Could not access camera. Please ensure you have granted camera permissions.')
            setIsStreaming(false)
        }
    }, [facingMode])

    useEffect(() => {
        startStream()

        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
                tracks.forEach(track => track.stop())
            }
        }
    }, [startStream])

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current
            const canvas = canvasRef.current

            // Set canvas dimensions to match video
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight

            // Draw video frame to canvas
            const context = canvas.getContext('2d')
            if (context) {
                // Flip if using front camera
                if (facingMode === 'user') {
                    context.translate(canvas.width, 0)
                    context.scale(-1, 1)
                }

                context.drawImage(video, 0, 0, canvas.width, canvas.height)

                // Convert to blob/file
                canvas.toBlob((blob) => {
                    if (blob) {
                        const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' })
                        onCapture(file)

                        // Visual feedback
                        const flash = document.createElement('div')
                        flash.className = 'absolute inset-0 bg-white opacity-50 z-50 pointer-events-none transition-opacity duration-200'
                        document.body.appendChild(flash)
                        setTimeout(() => {
                            flash.style.opacity = '0'
                            setTimeout(() => document.body.removeChild(flash), 200)
                        }, 50)
                    }
                }, 'image/jpeg', 0.9)
            }
        }
    }

    const toggleCamera = () => {
        setFacingMode(prev => prev === 'user' ? 'environment' : 'user')
    }

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/50 to-transparent">
                <button
                    onClick={onClose}
                    className="p-2 rounded-full bg-black/20 backdrop-blur-md text-white hover:bg-black/40 transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>

                {hasMultipleCameras && (
                    <button
                        onClick={toggleCamera}
                        className="p-2 rounded-full bg-black/20 backdrop-blur-md text-white hover:bg-black/40 transition-colors"
                    >
                        <SwitchCamera className="w-6 h-6" />
                    </button>
                )}
            </div>

            {/* Video Viewport */}
            <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-black">
                {error ? (
                    <div className="text-white text-center p-6 max-w-md">
                        <p className="text-red-400 mb-2">Camera Error</p>
                        <p className="text-sm text-neutral-400">{error}</p>
                    </div>
                ) : (
                    <>
                        {!isStreaming && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Loader2 className="w-8 h-8 text-white animate-spin" />
                            </div>
                        )}
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                            onLoadedMetadata={() => {
                                if (videoRef.current) videoRef.current.play().catch(e => console.error("Play error", e))
                            }}
                        />
                    </>
                )}
            </div>

            {/* Controls */}
            <div className="h-32 bg-black flex items-center justify-center pb-safe">
                <button
                    onClick={handleCapture}
                    disabled={!isStreaming}
                    className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center group active:scale-95 transition-transform"
                >
                    <div className="w-16 h-16 rounded-full bg-white group-active:bg-neutral-300 transition-colors" />
                </button>
            </div>

            {/* Hidden Canvas for capture */}
            <canvas ref={canvasRef} className="hidden" />
        </div>
    )
}
