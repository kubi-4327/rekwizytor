'use client'

import { Fragment } from 'react'
import { Database } from '@/types/supabase'
import { Box } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

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

export function PerformanceSceneView({ performanceId, propsByAct, assignedProps, scenes }: Props) {
    const t = useTranslations('ProductionDetails')

    // Group scenes by Act
    const scenesByAct: Record<number, Scene[]> = {}
    scenes?.forEach(scene => {
        const actNum = scene.act_number || 1
        if (!scenesByAct[actNum]) scenesByAct[actNum] = []
        scenesByAct[actNum].push(scene)
    })

    // Sort acts
    const sortedActs = Object.keys(scenesByAct).map(Number).sort((a, b) => a - b)

    // Calculate layout metrics
    let maxItemsInScene = 0
    let hasAnyItems = false

    Object.values(scenesByAct).forEach(scenes => {
        scenes.forEach(scene => {
            const itemCount = propsByAct[scene.act_number || 1]?.filter(p => p.scene_number?.toString() === scene.scene_number.toString()).length || 0
            if (itemCount > maxItemsInScene) maxItemsInScene = itemCount
            if (itemCount > 0) hasAnyItems = true
        })
    })

    const useFiftyFiftySplit = maxItemsInScene <= 5 && hasAnyItems

    return (
        <div className="space-y-6">
            {/* Desktop Table View */}
            <div className="hidden md:block bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-neutral-800">
                    <thead className="bg-neutral-950">
                        <tr>
                            <th className={`px-6 py-4 text-left text-xs font-medium text-neutral-400 uppercase ${useFiftyFiftySplit ? 'w-1/2' : hasAnyItems ? 'w-32' : 'w-full'}`}>
                                {t('table.scene')}
                            </th>
                            {hasAnyItems && (
                                <th className={`px-6 py-4 text-left text-xs font-medium text-neutral-400 uppercase ${useFiftyFiftySplit ? 'w-1/2' : ''}`}>
                                    {t('table.item')}
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                        {sortedActs.map(actNum => (
                            <Fragment key={actNum}>
                                {/* Act Header */}
                                <tr className="bg-neutral-950/50">
                                    <td colSpan={hasAnyItems ? 2 : 1} className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider border-y border-neutral-800 text-center">
                                        {t('act', { actNum })}
                                    </td>
                                </tr>
                                {scenesByAct[actNum]
                                    .sort((a, b) => a.scene_number - b.scene_number)
                                    .map(scene => {
                                        // Find props for this scene
                                        // Note: propsByAct contains all props for the act, we need to filter for this specific scene
                                        const sceneProps = propsByAct[actNum]?.filter(p => p.scene_number?.toString() === scene.scene_number.toString()) || []

                                        if (sceneProps.length === 0) {
                                            return (
                                                <tr key={scene.id} className="hover:bg-neutral-800/50">
                                                    <td className="px-6 py-4 text-sm text-neutral-300 align-top border-r border-neutral-800/50">
                                                        <div className="font-medium">{scene.scene_number}</div>
                                                        {scene.name && <div className="text-xs text-neutral-500">{scene.name}</div>}
                                                    </td>
                                                    {hasAnyItems && (
                                                        <td className="px-6 py-4 text-sm text-neutral-600 italic align-top">
                                                            {t('noPropsInScene')}
                                                        </td>
                                                    )}
                                                </tr>
                                            )
                                        }

                                        return sceneProps.map((prop, index) => (
                                            <tr key={prop.id} className="hover:bg-neutral-800/50">
                                                <td className="px-6 py-4 text-sm text-neutral-300 align-top border-r border-neutral-800/50">
                                                    {index === 0 && (
                                                        <>
                                                            <div className="font-medium">{scene.scene_number}</div>
                                                            {scene.name && <div className="text-xs text-neutral-500">{scene.name}</div>}
                                                        </>
                                                    )}
                                                </td>
                                                {hasAnyItems && (
                                                    <td className="px-6 py-4 text-sm text-white align-top">
                                                        {prop.items?.name || prop.item_name_snapshot}
                                                    </td>
                                                )}
                                            </tr>
                                        ))
                                    })}
                            </Fragment>
                        ))}

                        {sortedActs.length === 0 && (
                            <tr>
                                <td colSpan={2} className="px-4 py-8 text-center text-sm text-neutral-500">
                                    {t('noScenes')}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-6">
                {sortedActs.map(actNum => (
                    <div key={actNum} className="space-y-4">
                        <div className="flex items-center gap-2 px-2">
                            <div className="h-px flex-1 bg-neutral-800" />
                            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                                {t('act', { actNum })}
                            </span>
                            <div className="h-px flex-1 bg-neutral-800" />
                        </div>

                        <div className="space-y-3">
                            {scenesByAct[actNum]
                                .sort((a, b) => a.scene_number - b.scene_number)
                                .map(scene => {
                                    const sceneProps = propsByAct[actNum]?.filter(p => p.scene_number?.toString() === scene.scene_number.toString()) || []

                                    return (
                                        <div key={scene.id} className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-3">
                                            <div className="flex items-baseline gap-2 pb-2 border-b border-neutral-800 mb-2">
                                                <span className="text-lg font-bold text-white">{scene.scene_number}</span>
                                                {scene.name && <span className="text-sm text-neutral-400">{scene.name}</span>}
                                            </div>

                                            {sceneProps.length > 0 ? (
                                                <div className="space-y-3">
                                                    {sceneProps.map(prop => (
                                                        <div key={prop.id} className="flex items-start justify-between gap-4">
                                                            <div>
                                                                <h4 className="text-sm font-medium text-white mb-1">
                                                                    {prop.items?.name || prop.item_name_snapshot}
                                                                </h4>
                                                            </div>
                                                            {prop.items?.image_url && (
                                                                <div className="relative h-10 w-10 rounded bg-neutral-800 overflow-hidden shrink-0">
                                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                    <img
                                                                        src={prop.items.image_url}
                                                                        alt={prop.items.name}
                                                                        className="object-cover w-full h-full"
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-sm text-neutral-600 italic">
                                                    {t('noPropsInScene')}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
