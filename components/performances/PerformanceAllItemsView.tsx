'use client'

import { useState } from 'react'
import { Database } from '@/types/supabase'
import { LayoutGrid, List, Box } from 'lucide-react'
import NextImage from 'next/image'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

type PerformanceItem = Database['public']['Tables']['performance_items']['Row'] & {
    items: {
        name: string
        image_url: string | null
    } | null
}

type Props = {
    performanceId: string
    items: PerformanceItem[]
}

export function PerformanceAllItemsView({ performanceId, items }: Props) {
    const t = useTranslations('ProductionDetails')
    const [view, setView] = useState<'grid' | 'list'>('grid')

    // Deduplicate items based on item_id, as one item can be in multiple scenes
    // Actually, the user might want to see unique ITEMS, not unique assignments.
    // Let's deduplicate by item_id.
    const uniqueItemsMap = new Map<string, PerformanceItem>()
    items.forEach(item => {
        if (!uniqueItemsMap.has(item.item_id)) {
            uniqueItemsMap.set(item.item_id, item)
        }
    })
    const uniqueItems = Array.from(uniqueItemsMap.values())

    return (
        <div className="space-y-6">


            {view === 'grid' ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {uniqueItems.map((item) => (
                        <Link
                            key={item.item_id}
                            href={`/items/${item.item_id}`}
                            className="group relative overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900 transition-colors hover:border-neutral-700 block"
                        >
                            <div className="aspect-square w-full bg-neutral-800 relative flex items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-900">
                                {item.items?.image_url || item.image_url_snapshot ? (
                                    <NextImage
                                        src={item.items?.image_url || item.image_url_snapshot || ''}
                                        alt={item.items?.name || item.item_name_snapshot || ''}
                                        fill
                                        className="object-cover transition-transform group-hover:scale-105"
                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                    />
                                ) : (
                                    <Box className="h-16 w-16 text-neutral-600 group-hover:text-neutral-500 transition-colors" />
                                )}
                            </div>
                            <div className="p-4">
                                <h3 className="text-lg font-bold text-white truncate">
                                    {item.items?.name || item.item_name_snapshot}
                                </h3>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="space-y-2">
                    {uniqueItems.map((item) => (
                        <Link
                            key={item.item_id}
                            href={`/items/${item.item_id}`}
                            className="flex items-center gap-4 rounded-lg border border-neutral-800 bg-neutral-900 p-3 transition-colors hover:border-neutral-700 block"
                        >
                            <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-neutral-800 flex items-center justify-center">
                                {item.items?.image_url || item.image_url_snapshot ? (
                                    <NextImage
                                        src={item.items?.image_url || item.image_url_snapshot || ''}
                                        alt={item.items?.name || item.item_name_snapshot || ''}
                                        fill
                                        className="object-cover"
                                        sizes="48px"
                                    />
                                ) : (
                                    <Box className="h-6 w-6 text-neutral-600" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-white truncate">
                                    {item.items?.name || item.item_name_snapshot}
                                </h3>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {uniqueItems.length === 0 && (
                <div className="text-center py-12 text-neutral-500 bg-neutral-900/30 rounded-lg border border-neutral-800 border-dashed px-4">
                    <p>{t('noProps')}</p>
                </div>
            )}
        </div>
    )
}
