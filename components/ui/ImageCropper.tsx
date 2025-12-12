'use client'

import { useState, useRef, useEffect } from 'react'
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import getCroppedImg from '@/utils/canvasUtils'
import { Button } from '@/components/ui/Button'
import { Check, X, RotateCw } from 'lucide-react'

type Props = {
    imageSrc: string
    onCropComplete: (croppedBlob: Blob) => void
    onCancel: () => void
}

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number) {
    return centerCrop(
        makeAspectCrop(
            {
                unit: '%',
                width: 90,
            },
            aspect,
            mediaWidth,
            mediaHeight,
        ),
        mediaWidth,
        mediaHeight,
    )
}

export function ImageCropper({ imageSrc, onCropComplete, onCancel }: Props) {
    const [crop, setCrop] = useState<Crop>()
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
    const [rotation, setRotation] = useState(0)
    const [processing, setProcessing] = useState(false)
    const imgRef = useRef<HTMLImageElement>(null)

    // Setup initial crop when image loads
    function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
        const { width, height } = e.currentTarget
        // Determine landscape or portrait and set a reasonable default
        const initialCrop = centerCrop(
            makeAspectCrop(
                {
                    unit: '%',
                    width: 50, // Default to 50% width
                },
                16 / 9, // Dummy aspect
                width,
                height
            ),
            width,
            height
        )
        // Unlock aspect
        setCrop(initialCrop)
    }

    const handleSave = async () => {
        if (!completedCrop || !imgRef.current) {
            alert('Please select an area to crop')
            return
        }

        setProcessing(true)
        try {
            // Fix: Scale the crop coordinates to match the natural image size
            // The crop from state is based on the displayed (scaled) image in the UI
            const image = imgRef.current
            const scaleX = image.naturalWidth / image.width
            const scaleY = image.naturalHeight / image.height

            const finalCrop = {
                x: completedCrop.x * scaleX,
                y: completedCrop.y * scaleY,
                width: completedCrop.width * scaleX,
                height: completedCrop.height * scaleY,
            }

            const croppedImage = await getCroppedImg(
                imageSrc,
                finalCrop, // Use scaled crop
                rotation,
                { horizontal: false, vertical: false },
                true // Apply filters
            )
            if (croppedImage) {
                onCropComplete(croppedImage)
            }
        } catch (e) {
            console.error(e)
            alert('Failed to crop image')
        } finally {
            setProcessing(false)
        }
    }

    // Force rotation by recreating the URL or handling in canvas.
    // getCroppedImg handles rotation. But for PREVIEW, standard css rotate is okay.
    // Note: react-image-crop doesn't inherently support rotating the *source* easily without canvas, 
    // so visual rotation might be tricky. We'll rotate the container.

    return (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
            <div className="bg-neutral-900 rounded-xl border border-neutral-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] max-w-5xl w-full">

                {/* Header */}
                <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-900">
                    <h3 className="text-white font-medium">Crop Scene List</h3>
                    <div className="flex gap-2">
                        <Button
                            onClick={() => setRotation(r => r + 90)}
                            className="bg-neutral-800 hover:bg-neutral-700 text-white p-2 h-auto"
                            title="Rotate Image"
                        >
                            <RotateCw className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Editor Area */}
                <div className="flex-1 overflow-auto p-4 bg-neutral-950 flex items-center justify-center relative min-h-[400px]">
                    <div style={{ transform: `rotate(${rotation}deg)`, transition: 'transform 0.3s' }}>
                        <ReactCrop
                            crop={crop}
                            onChange={(_, percentCrop) => setCrop(percentCrop)}
                            onComplete={(c) => setCompletedCrop(c)}
                            aspect={undefined} // Fully freeform
                            ruleOfThirds
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                ref={imgRef}
                                alt="Crop me"
                                src={imageSrc}
                                onLoad={onImageLoad}
                                style={{ maxHeight: '70vh', maxWidth: '100%', objectFit: 'contain' }}
                            />
                        </ReactCrop>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-neutral-800 bg-neutral-900 flex justify-end gap-3">
                    <Button onClick={onCancel} variant="secondary" className="bg-neutral-800 hover:bg-neutral-700 text-white">
                        <X className="w-4 h-4 mr-2" /> Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={processing} className="bg-white text-black hover:bg-neutral-200">
                        {processing ? 'Processing...' : <><Check className="w-4 h-4 mr-2" /> Confirm Crop</>}
                    </Button>
                </div>
            </div>
        </div>
    )
}
