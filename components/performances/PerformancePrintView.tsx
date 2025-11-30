import React, { forwardRef } from 'react'
import { Database } from '@/types/supabase'
import { CheckSquare, Square } from 'lucide-react'

type Scene = Database['public']['Tables']['scenes']['Row']
type PerformanceItem = Database['public']['Tables']['performance_items']['Row'] & {
    items: {
        name: string
        image_url: string | null
    } | null
}

type Props = {
    production: Database['public']['Tables']['performances']['Row']
    assignedProps: PerformanceItem[]
    scenes: Scene[]
    user: {
        name: string
        email: string
    } | null
}

export const PerformancePrintView = forwardRef<HTMLDivElement, Props>(({ production, assignedProps, scenes, user }, ref) => {
    const downloadDate = new Date().toLocaleString('pl-PL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })

    // Helper to get Act number
    const getActNumber = (sceneNum: string | null) => {
        if (!sceneNum) return 1
        const scene = scenes?.find((s: Scene) => s.scene_number.toString() === sceneNum)
        return scene?.act_number || 1
    }

    // Group props by Act and Scene
    const propsByActAndScene: Record<number, Record<string, PerformanceItem[]>> = {}

    assignedProps?.forEach((prop) => {
        const actNum = getActNumber(prop.scene_number)
        const sceneNum = prop.scene_number || 'Unassigned'

        if (!propsByActAndScene[actNum]) propsByActAndScene[actNum] = {}
        if (!propsByActAndScene[actNum][sceneNum]) propsByActAndScene[actNum][sceneNum] = []

        propsByActAndScene[actNum][sceneNum].push(prop)
    })

    return (
        <div ref={ref} className="p-8 bg-white text-black print-content">
            {/* Header */}
            <div className="flex gap-6 mb-8 border-b pb-6 border-neutral-200">
                {/* Poster */}
                {production.image_url && (
                    <div className="w-32 h-48 shrink-0 relative border border-neutral-200">
                        <img
                            src={production.image_url}
                            alt={production.title}
                            className="w-full h-full object-cover"
                        />
                    </div>
                )}

                <div className="flex-1">
                    <h1 className="text-3xl font-bold mb-2">{production.title}</h1>
                    <div className="text-sm text-neutral-500 mb-4 space-y-1">
                        <p>Pobrane przez: {user?.name || user?.email || 'Nieznany użytkownik'}</p>
                        <p>Data pobrania: {downloadDate}</p>
                    </div>
                    {production.notes && (
                        <div className="bg-neutral-50 p-4 rounded border border-neutral-100">
                            <h3 className="font-bold text-sm mb-1 text-neutral-700">Master Note:</h3>
                            <p className="text-sm text-neutral-600 whitespace-pre-wrap">{production.notes}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="space-y-8">
                {Object.entries(propsByActAndScene).sort(([a], [b]) => Number(a) - Number(b)).map(([actNum, scenesInAct]) => (
                    <div key={actNum} className="break-inside-avoid">
                        <h2 className="text-xl font-bold mb-4 border-b border-black pb-2">Akt {actNum}</h2>

                        <div className="space-y-6">
                            {Object.entries(scenesInAct).sort(([a], [b]) => {
                                if (a === 'Unassigned') return -1
                                if (b === 'Unassigned') return 1
                                return Number(a) - Number(b)
                            }).map(([sceneNum, props]) => (
                                <div key={sceneNum} className="ml-4 break-inside-avoid">
                                    <h3 className="font-semibold text-lg mb-3 text-neutral-800">
                                        {sceneNum === 'Unassigned' ? 'Nieprzypisane' : `Scena ${sceneNum}`}
                                    </h3>

                                    <div className="grid grid-cols-1 gap-2">
                                        {props.map((prop) => (
                                            <div key={prop.id} className="flex items-center gap-3 py-1 border-b border-neutral-100 last:border-0">
                                                <div className="w-5 h-5 border-2 border-neutral-300 rounded flex-shrink-0" />
                                                <span className="text-base">{prop.items?.name || 'Unnamed Item'}</span>
                                                {(prop.usage_notes || prop.notes_snapshot) && (
                                                    <span className="text-sm text-neutral-500 italic">({prop.usage_notes || prop.notes_snapshot})</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <style jsx global>{`
                @media print {
                    @page {
                        margin: 20mm;
                    }
                    body {
                        print-color-adjust: exact;
                        -webkit-print-color-adjust: exact;
                    }
                }
            `}</style>
        </div>
    )
})

PerformancePrintView.displayName = 'PerformancePrintView'
