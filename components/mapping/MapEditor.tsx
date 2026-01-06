'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { MapPin, ZoomIn, ZoomOut, Save, Sparkles, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { analyzeFloorPlan } from '@/app/actions/mapping-ai'
import { deleteMap } from '@/app/actions/delete-map'
import { SvgMapViewer } from './SvgMapViewer'
import { MapUploader } from './MapUploader'
import { SvgMapEditor } from './SvgMapEditor'

interface MapEditorProps {
    locationId: string
    initialMapUrl: string | null
    initialMapSvg: string | null
    initialPins: any[]
}

export function MapEditor({ locationId, initialMapUrl, initialMapSvg, initialPins }: MapEditorProps) {
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const router = useRouter()

    const handleAnalyze = async () => {
        if (!initialMapUrl) return
        setIsAnalyzing(true)

        try {
            const result = await analyzeFloorPlan(locationId, initialMapUrl)
            if (result.success) {
                toast.success('Plan wygenerowany!')
                router.refresh()
            } else {
                toast.error(result.error || 'Błąd analizy')
            }
        } catch (e) {
            toast.error('Wystąpił błąd')
        } finally {
            setIsAnalyzing(false)
        }
    }

    const handleDeleteMap = async () => {
        if (!confirm('Czy na pewno chcesz usunąć tę mapę? Operacja jest nieodwracalna.')) return

        try {
            const result = await deleteMap(locationId)
            if (result.success) {
                toast.success('Mapa usunięta')
                router.refresh()
            } else {
                toast.error(result.error || 'Błąd usuwania')
            }
        } catch (e) {
            toast.error('Wystąpił błąd')
        }
    }

    // 0. If editing (manually or modifying existing), show Editor always
    if (isEditing) {
        return (
            <SvgMapEditor
                locationId={locationId}
                initialSvgContent={initialMapSvg || '<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg"></svg>'}
                onClose={() => setIsEditing(false)}
            />
        )
    }

    // 1. If SVG exists, show SVG Viewer
    if (initialMapSvg) {
        return (
            <div className="relative group">
                <SvgMapViewer
                    locationId={locationId}
                    svgContent={initialMapSvg}
                    initialPins={initialPins}
                />
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <Button
                        onClick={() => setIsEditing(true)}
                        className="bg-neutral-800/90 hover:bg-neutral-800 text-white border border-neutral-600"
                        size="sm"
                    >
                        Edytuj Mapę
                    </Button>
                    <button
                        onClick={handleDeleteMap}
                        className="bg-red-600/80 hover:bg-red-600 text-white p-2 rounded-md transition-colors"
                        title="Usuń mapę i zacznij od nowa"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        )
    }

    // 2. If no map at all, show placeholder with Uploader
    if (!initialMapUrl) return (
        <div className="flex flex-col items-center justify-center h-96 bg-neutral-900 rounded-lg border border-dashed border-neutral-700 p-6">
            <p className="text-neutral-500 mb-2">Brak mapy dla tej lokalizacji.</p>
            <p className="text-neutral-600 text-sm mb-6 max-w-md text-center">
                Wgraj zdjęcie odręcznego szkicu, aby AI mogło wygenerować interaktywny plan.
            </p>
            <div className="w-full max-w-md space-y-4">
                <MapUploader locationId={locationId} />
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-neutral-700" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-neutral-900 px-2 text-neutral-500">LUB</span>
                    </div>
                </div>
                <Button
                    variant="secondary"
                    className="w-full border-dashed border-neutral-600 hover:border-neutral-500 hover:bg-neutral-800"
                    onClick={() => setIsEditing(true)}
                >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Utwórz plan ręcznie
                </Button>
            </div>
        </div>
    )

    // 3. If Image exists but no SVG, show Image + Analyze Button
    return (
        <div className="relative w-full h-[600px] overflow-hidden bg-neutral-900 rounded-lg border border-neutral-800 flex flex-col items-center justify-center">
            <div className="absolute top-4 right-4 z-10">
                <Button
                    variant="primary"
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="bg-burgundy-main hover:bg-burgundy-hover"
                >
                    {isAnalyzing ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    {isAnalyzing ? 'Analizowanie...' : 'Generuj Plan (AI)'}
                </Button>
                <Button
                    variant="secondary"
                    onClick={handleDeleteMap}
                    className="bg-black/50 hover:bg-red-900/50 text-white border border-neutral-700 ml-2"
                    title="Usuń szkic"
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>

            <Image
                src={initialMapUrl}
                alt="Original Sketch"
                width={800}
                height={600}
                className="object-contain max-h-full opacity-50"
            />

            <p className="absolute bottom-8 text-neutral-400 text-sm">
                Kliknij &quot;Generuj Plan&quot; aby zamienić ten szkic na interaktywną mapę.
            </p>
        </div>
    )
}
