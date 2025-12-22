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
}


export function PerformanceContent({ performanceId, allProps, propsByAct, assignedProps, scenes, sceneNote }: Props) {
    const [viewMode, setViewMode] = useState<'scenes' | 'checklist'>('scenes')
    const t = useTranslations('ProductionDetails')

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-white">{t('propsList')}</h2>


            {/* View Toggle */}
            <div className="flex justify-start border-b border-neutral-800 overflow-x-auto">
                <button
                    onClick={() => setViewMode('scenes')}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${viewMode === 'scenes'
                        ? 'border-white text-white'
                        : 'border-transparent text-neutral-400 hover:text-white hover:border-neutral-700'
                        }`}
                >
                    <Layers className="w-4 h-4" />
                    {t('sceneView')}
                </button>
                <button
                    onClick={() => setViewMode('checklist')}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${viewMode === 'checklist'
                        ? 'border-white text-white'
                        : 'border-transparent text-neutral-400 hover:text-white hover:border-neutral-700'
                        }`}
                >
                    <Grid className="w-4 h-4" />
                    {t('allItemsView')}
                </button>
            </div>

            {
                viewMode === 'checklist' ? (
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
                )
            }
        </div >
    )
}
