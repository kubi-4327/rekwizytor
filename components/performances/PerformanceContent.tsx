'use client'

import { useState } from 'react'
import { Database } from '@/types/supabase'
import { PerformanceSceneView } from './PerformanceSceneView'
import { PerformanceAllItemsView } from './PerformanceAllItemsView'
import { useTranslations } from 'next-intl'
import { Layers, Grid, Settings } from 'lucide-react'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/Button'

type PerformanceItem = Database['public']['Tables']['performance_items']['Row'] & {
    items: {
        name: string
        image_url: string | null
    } | null
}

type Scene = Database['public']['Tables']['scenes']['Row']

type Props = {
    performanceId: string
    propsByAct: Record<number, PerformanceItem[]>
    assignedProps: PerformanceItem[] | null
    scenes: Scene[]
}

export function PerformanceContent({ performanceId, propsByAct, assignedProps, scenes }: Props) {
    const [viewMode, setViewMode] = useState<'scenes' | 'all'>('scenes')
    const t = useTranslations('ProductionDetails')

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-xl font-bold text-white">{t('propsList')}</h2>
                <Link
                    href={`/performances/${performanceId}/props`}
                    className={buttonVariants({ variant: "secondary", className: "gap-2 w-full sm:w-auto" })}
                >
                    <Settings className="w-4 h-4" />
                    {t('manageProps')}
                </Link>
            </div>

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
                    onClick={() => setViewMode('all')}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${viewMode === 'all'
                        ? 'border-white text-white'
                        : 'border-transparent text-neutral-400 hover:text-white hover:border-neutral-700'
                        }`}
                >
                    <Grid className="w-4 h-4" />
                    {t('allItemsView')}
                </button>
            </div>

            {viewMode === 'scenes' ? (
                <PerformanceSceneView
                    performanceId={performanceId}
                    propsByAct={propsByAct}
                    assignedProps={assignedProps}
                    scenes={scenes}
                />
            ) : (
                <PerformanceAllItemsView
                    performanceId={performanceId}
                    items={assignedProps || []}
                />
            )}
        </div>
    )
}
