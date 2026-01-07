'use client'

import { useState } from 'react'
import { Database } from '@/types/supabase'
import { useTranslations } from 'next-intl'
import { Layers, Grid } from 'lucide-react'
import { PropsChecklist } from '@/components/props/PropsChecklist'
import { PerformanceSceneView } from './PerformanceSceneView'

type PerformanceItem = Database['public']['Tables']['performance_items']['Row'] & {
    items: {
        name: string
        image_url: string | null
    } | null
}

type Scene = Database['public']['Tables']['scenes']['Row']

type Prop = {
    id: string
    item_name: string
    is_checked: boolean | null
    created_at: string | null
    performance_id: string
    order: number | null
}

type Props = {
    performanceId: string
    allProps: Prop[]
    propsByAct: Record<number, PerformanceItem[]>
    assignedProps: PerformanceItem[] | null
    scenes: Scene[]
    sceneNote: any | null
    performanceColor?: string | null
}


export function PerformanceContent({ performanceId, allProps, propsByAct, assignedProps, scenes, sceneNote, performanceColor }: Props) {
    const [viewMode, setViewMode] = useState<'scenes' | 'checklist'>('scenes')
    const t = useTranslations('ProductionDetails')

    return (
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl overflow-hidden flex flex-col h-[600px]">
            {/* Header with View Toggle merged or separated? 
                Let's keep the title in a standard header and tabs below for clarity 
            */}
            <div className="p-4 border-b border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-neutral-900/80 shrink-0">
                <h3 className="font-bold text-neutral-200 font-sans text-base leading-none">
                    {t('propsList')}
                </h3>

                {/* View Toggle - compacted */}
                <div className="flex bg-neutral-900 p-1 rounded-lg border border-neutral-800">
                    <button
                        onClick={() => setViewMode('scenes')}
                        className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'scenes'
                            ? 'bg-neutral-800 text-white shadow-sm'
                            : 'text-neutral-500 hover:text-neutral-300'
                            }`}
                        style={viewMode === 'scenes' && performanceColor ? { backgroundColor: `${performanceColor}33`, color: performanceColor } : undefined}
                    >
                        <Layers className="w-3.5 h-3.5" />
                        {t('sceneView')}
                    </button>
                    <button
                        onClick={() => setViewMode('checklist')}
                        className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'checklist'
                            ? 'bg-neutral-800 text-white shadow-sm'
                            : 'text-neutral-500 hover:text-neutral-300'
                            }`}
                        style={viewMode === 'checklist' && performanceColor ? { backgroundColor: `${performanceColor}33`, color: performanceColor } : undefined}
                    >
                        <Grid className="w-3.5 h-3.5" />
                        {t('allItemsView')}
                    </button>
                </div>
            </div>

            <div className="flex-1 p-0 overflow-y-auto">
                {viewMode === 'checklist' ? (
                    <PropsChecklist
                        performanceId={performanceId}
                        initialProps={allProps}
                        variant="checklist"
                    />
                ) : (
                    <PerformanceSceneView
                        performanceId={performanceId}
                        propsByAct={propsByAct}
                        assignedProps={assignedProps}
                        scenes={scenes}
                        sceneNote={sceneNote}
                    />
                )}
            </div>
        </div>
    )
}
