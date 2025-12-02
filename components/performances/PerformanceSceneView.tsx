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
}

export function PerformanceSceneView({ performanceId, propsByAct, assignedProps }: Props) {
    const t = useTranslations('ProductionDetails')

    return (
        <div className="space-y-6">


            {/* Desktop Table View */}
            <div className="hidden md:block bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-neutral-800">
                    <thead className="bg-neutral-950">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase">{t('table.scene')}</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase">{t('table.item')}</th>

                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                        {Object.entries(propsByAct)
                            .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                            .map(([actNum, props]) => (
                                <Fragment key={actNum}>
                                    {/* Act Header */}
                                    <tr className="bg-neutral-950/50">
                                        <td colSpan={2} className="px-4 py-2 text-xs font-bold text-neutral-500 uppercase tracking-wider border-y border-neutral-800 text-center">
                                            {t('act', { actNum })}
                                        </td>
                                    </tr>
                                    {props.map((prop, index) => {
                                        const isFirstInScene = index === 0 || prop.scene_number !== props[index - 1].scene_number
                                        return (
                                            <tr key={prop.id} className="hover:bg-neutral-800/50">
                                                <td className="px-4 py-3 text-sm text-neutral-300 align-top">
                                                    {isFirstInScene && (
                                                        <>
                                                            <div className="font-medium">{prop.scene_number}</div>
                                                            <div className="text-xs text-neutral-500">{prop.scene_name}</div>
                                                        </>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-white align-top">
                                                    {prop.items?.name || prop.item_name_snapshot}
                                                </td>

                                            </tr>
                                        )
                                    })}
                                </Fragment>
                            ))}

                        {(!assignedProps || assignedProps.length === 0) && (
                            <tr>
                                <td colSpan={2} className="px-4 py-8 text-center text-sm text-neutral-500">
                                    {t('noProps')}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-6">
                {Object.entries(propsByAct)
                    .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                    .map(([actNum, props]) => (
                        <div key={actNum} className="space-y-3">
                            <div className="flex items-center gap-2 px-2">
                                <div className="h-px flex-1 bg-neutral-800" />
                                <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                                    {t('act', { actNum })}
                                </span>
                                <div className="h-px flex-1 bg-neutral-800" />
                            </div>

                            <div className="space-y-3">
                                {props.map((prop, index) => {
                                    const isFirstInScene = index === 0 || prop.scene_number !== props[index - 1].scene_number
                                    return (
                                        <div key={prop.id} className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-3">
                                            {isFirstInScene && (
                                                <div className="flex items-baseline gap-2 pb-2 border-b border-neutral-800 mb-2">
                                                    <span className="text-lg font-bold text-white">{prop.scene_number}</span>
                                                    <span className="text-sm text-neutral-400">{prop.scene_name}</span>
                                                </div>
                                            )}

                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <h4 className="text-sm font-medium text-white mb-1">
                                                        {prop.items?.name || prop.item_name_snapshot}
                                                    </h4>

                                                </div>
                                                {/* Could add item image here if available */}
                                                {prop.items?.image_url && (
                                                    <div className="relative h-10 w-10 rounded bg-neutral-800 overflow-hidden shrink-0">
                                                        {/* Using img for simplicity or NextImage if imported */}
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img
                                                            src={prop.items.image_url}
                                                            alt={prop.items.name}
                                                            className="object-cover w-full h-full"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}

                {(!assignedProps || assignedProps.length === 0) && (
                    <div className="text-center py-12 text-neutral-500 bg-neutral-900/30 rounded-lg border border-neutral-800 border-dashed px-4">
                        <p>{t('noProps')}</p>
                    </div>
                )}
            </div>
        </div>
    )
}
