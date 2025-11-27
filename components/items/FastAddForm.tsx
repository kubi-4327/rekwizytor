'use client'

import { useState, useRef } from 'react'
import { Camera, Upload, X, Loader2, MapPin } from 'lucide-react'
import NextImage from 'next/image'
import { useRouter } from 'next/navigation'
import { uploadAndAnalyzeImages } from '@/app/actions/fast-mode'
import { compressImage } from '@/utils/image-processing'
import { CameraCapture } from './CameraCapture'

type Location = {
    id: string
    name: string
}

type Group = {
    id: string
    name: string
}

type Props = {
    locations: Location[]
    groups: Group[]
}

export function FastAddForm({ locations }: Props) {
    const [images, setImages] = useState<File[]>([])
    const [previews, setPreviews] = useState<string[]>([])
    const [locationId, setLocationId] = useState<string>('')
    const [isProcessing, setIsProcessing] = useState(false)
    const [isCameraOpen, setIsCameraOpen] = useState(false)

    const cameraInputRef = useRef<HTMLInputElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const router = useRouter()

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files)
            await processFiles(newFiles)
            // Reset input so same files can be selected again if needed (though unlikely for camera)
            e.target.value = ''
        }
    }

    const processFiles = async (newFiles: File[]) => {
        // Create previews immediately for better UX
        const newPreviews = newFiles.map(file => URL.createObjectURL(file))
        setPreviews(prev => [...prev, ...newPreviews])

        // Compress images
        const compressedFiles = await Promise.all(newFiles.map(async (file) => {
            try {
                const blob = await compressImage(file)
                // Convert blob back to file to keep the name
                return new File([blob], file.name, { type: 'image/jpeg' })
            } catch (error) {
                console.error('Compression failed for', file.name, error)
                return file // Fallback to original
            }
        }))

        setImages(prev => [...prev, ...compressedFiles])
    }

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index))
        setPreviews(prev => {
            // Revoke the URL to avoid memory leaks
            URL.revokeObjectURL(prev[index])
            return prev.filter((_, i) => i !== index)
        })
    }

    const handleSubmit = async () => {
        if (images.length === 0) return
        if (!locationId) {
            alert('Please select a location')
            return
        }

        setIsProcessing(true)
        try {
            const formData = new FormData()
            images.forEach(image => {
                formData.append('images', image)
            })
            formData.append('locationId', locationId)
            // Group ID is no longer sent, AI will determine it

            await uploadAndAnalyzeImages(formData)

            // Redirect to review page
            router.push('/items/review')
        } catch (error) {
            console.error('Error processing images:', error)
            alert('Failed to process images. Please try again.')
        } finally {
            setIsProcessing(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Session Settings */}
            <div className="bg-neutral-900/50 p-4 rounded-xl border border-neutral-800 space-y-4">
                <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider">Session Settings</h2>

                <div>
                    <label className="block text-sm font-medium text-white mb-2 flex items-center">
                        <MapPin className="w-4 h-4 mr-2 text-blue-400" />
                        Default Location <span className="text-red-400">*</span>
                    </label>
                    <select
                        value={locationId}
                        onChange={(e) => setLocationId(e.target.value)}
                        className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-3 text-white focus:border-blue-500 focus:outline-none"
                    >
                        <option value="">Select Location...</option>
                        {locations.map(loc => (
                            <option key={loc.id} value={loc.id}>{loc.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Image Capture */}
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => setIsCameraOpen(true)}
                        className="flex flex-col items-center justify-center p-6 bg-neutral-800 rounded-xl border-2 border-dashed border-neutral-700 hover:border-neutral-500 hover:bg-neutral-750 transition-all group"
                    >
                        <div className="p-3 bg-neutral-700 rounded-full mb-3 group-hover:bg-neutral-600 transition-colors">
                            <Camera className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-sm text-neutral-300 font-medium">Take Photos</span>
                        <span className="text-xs text-neutral-500 mt-1">Use Camera</span>
                    </button>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex flex-col items-center justify-center p-6 bg-neutral-800 rounded-xl border-2 border-dashed border-neutral-700 hover:border-neutral-500 hover:bg-neutral-750 transition-all group"
                    >
                        <div className="p-3 bg-neutral-700 rounded-full mb-3 group-hover:bg-neutral-600 transition-colors">
                            <Upload className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-sm text-neutral-300 font-medium">Upload Files</span>
                        <span className="text-xs text-neutral-500 mt-1">From Device</span>
                    </button>
                </div>

                {/* Hidden Inputs */}
                <input
                    type="file"
                    ref={cameraInputRef}
                    onChange={handleFileSelect}
                    accept="image/*"
                    capture="environment" // Forces camera on mobile
                    className="hidden"
                />
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    multiple
                    accept="image/*"
                    className="hidden"
                />
            </div>

            {/* Previews - Masonry-like Grid */}
            {previews.length > 0 && (
                <div className="columns-2 md:columns-3 gap-4 space-y-4">
                    {previews.map((src, index) => (
                        <div key={index} className="relative break-inside-avoid rounded-lg overflow-hidden bg-neutral-900 border border-neutral-800 group">
                            <NextImage
                                src={src}
                                alt={`Preview ${index}`}
                                width={500}
                                height={500}
                                className="w-full h-auto object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button
                                    onClick={() => removeImage(index)}
                                    className="p-2 bg-red-500/80 rounded-full text-white hover:bg-red-600 transition-colors transform hover:scale-110"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 rounded text-xs text-white font-mono">
                                #{index + 1}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Action Button */}
            <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 right-0 p-4 bg-neutral-950 border-t border-neutral-900 md:static md:bg-transparent md:border-0 md:p-0 z-40">
                <button
                    onClick={handleSubmit}
                    disabled={isProcessing || images.length === 0 || !locationId}
                    className="w-full flex items-center justify-center py-4 rounded-xl bg-white text-black font-bold text-lg hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-white/10"
                >
                    {isProcessing ? (
                        <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Processing {images.length} items...
                        </>
                    ) : (
                        `Process ${images.length > 0 ? images.length : ''} Items`
                    )}
                </button>
            </div>

            {/* Spacer for fixed bottom button on mobile */}
            <div className="h-24 md:hidden" />

            {isCameraOpen && (
                <CameraCapture
                    onCapture={(file) => processFiles([file])}
                    onClose={() => setIsCameraOpen(false)}
                />
            )}
        </div>
    )
}
