'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/Button'
import { createThumbnail } from '@/utils/image-processing'
import { RefreshCw, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'

type ProcessingStatus = {
    id: string
    title: string
    status: 'pending' | 'processing' | 'success' | 'error'
    message?: string
}

export function ThumbnailRegenerator() {
    // const t = useTranslations('Settings') // Use later when translations are ready
    const [isProcessing, setIsProcessing] = useState(false)
    const [progress, setProgress] = useState(0)
    const [total, setTotal] = useState(0)
    const [statuses, setStatuses] = useState<Record<string, ProcessingStatus>>({})
    const [showLog, setShowLog] = useState(false)
    const supabase = createClient()

    const regenerateThumbnails = async () => {
        setIsProcessing(true)
        setStatuses({})
        setProgress(0)
        setShowLog(true)

        try {
            // 1. Fetch performances
            const { data: performances, error } = await supabase
                .from('performances')
                .select('id, title, image_url')
                .not('image_url', 'is', null)
                .order('title')

            if (error || !performances) throw new Error('Failed to fetch performances')

            setTotal(performances.length)

            // 2. Process sequentially
            for (let i = 0; i < performances.length; i++) {
                const p = performances[i]

                setStatuses(prev => ({
                    ...prev,
                    [p.id]: { id: p.id, title: p.title, status: 'processing' }
                }))

                try {
                    if (!p.image_url) throw new Error('No image URL')

                    // Fetch original
                    const response = await fetch(p.image_url)
                    if (!response.ok) throw new Error('Failed to fetch image')
                    const blob = await response.blob()
                    const file = new File([blob], 'original.jpg', { type: blob.type })

                    // Resize (NO CROP)
                    const thumbnailBlob = await createThumbnail(file, 300, false)
                    const thumbnailName = `thumb_v2_${p.id}_${Date.now()}.jpg`
                    const thumbnailFile = new File([thumbnailBlob], thumbnailName, { type: 'image/jpeg' })

                    // Upload
                    const { error: uploadError } = await supabase.storage
                        .from('posters')
                        .upload(thumbnailName, thumbnailFile, { upsert: true })

                    if (uploadError) throw uploadError

                    const { data: { publicUrl } } = supabase.storage
                        .from('posters')
                        .getPublicUrl(thumbnailName)

                    // Update DB
                    await supabase
                        .from('performances')
                        .update({ thumbnail_url: publicUrl })
                        .eq('id', p.id)

                    setStatuses(prev => ({
                        ...prev,
                        [p.id]: { ...prev[p.id], status: 'success' }
                    }))

                } catch (err) {
                    console.error(err)
                    setStatuses(prev => ({
                        ...prev,
                        [p.id]: {
                            ...prev[p.id],
                            status: 'error',
                            message: err instanceof Error ? err.message : 'Unknown error'
                        }
                    }))
                }

                setProgress(i + 1)
            }

        } catch (error) {
            console.error('Critical error:', error)
            alert('Failed to start regeneration process')
        } finally {
            setIsProcessing(false)
        }
    }

    const successCount = Object.values(statuses).filter(s => s.status === 'success').length
    const errorCount = Object.values(statuses).filter(s => s.status === 'error').length

    return (
        <div className="bg-neutral-900 rounded-lg p-6 border border-neutral-800 h-full flex flex-col">
            <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-blue-500/10 rounded-lg shrink-0">
                    <RefreshCw className={`h-6 w-6 text-blue-400 ${isProcessing ? 'animate-spin' : ''}`} />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-white mb-1">
                        Regenerate Thumbnails
                    </h3>
                    <p className="text-sm text-neutral-400 leading-relaxed">
                        Re-process all performance posters to use the new "full poster" aspect ratio (no cropping).
                    </p>
                </div>
            </div>

            <div className="mt-auto pt-2">
                <Button
                    onClick={regenerateThumbnails}
                    isLoading={isProcessing}
                    className="w-full justify-center bg-blue-600 hover:bg-blue-700 text-white"
                >
                    Start Regeneration
                </Button>
            </div>

            {showLog && (
                <div className="mt-4 bg-neutral-950/50 rounded-lg border border-neutral-800 overflow-hidden text-sm">
                    <div className="p-3 bg-neutral-900 border-b border-neutral-800 flex justify-between items-center text-sm">
                        <span className="text-neutral-300 font-mono">
                            Progress: {progress}/{total}
                        </span>
                        <div className="flex gap-3">
                            <span className="text-emerald-400">{successCount} Success</span>
                            <span className="text-red-400">{errorCount} Errors</span>
                        </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto divide-y divide-neutral-800">
                        {Object.values(statuses).map(status => (
                            <div key={status.id} className="p-3 text-sm flex items-center justify-between">
                                <span className="text-neutral-300">{status.title}</span>
                                {status.status === 'processing' && <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />}
                                {status.status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                                {status.status === 'error' && (
                                    <div className="flex items-center text-red-400 gap-2">
                                        <AlertTriangle className="w-4 h-4" />
                                        <span className="text-xs">{status.message}</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
