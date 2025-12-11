'use client'

import { useState, useEffect } from 'react'
import { LayoutGrid, List, Sparkles, Layers } from 'lucide-react'
import NextImage from 'next/image'
import { Database } from '@/types/supabase'
import { ItemIcon } from '@/components/ui/ItemIcon'
import { useTranslations } from 'next-intl'
import { getItems } from '@/app/actions/get-items'
import { EditItemDialog } from './EditItemDialog'
import { ItemDetailsDialog } from './ItemDetailsDialog'
import { MorphingSearchBar } from '@/components/search/MorphingSearchBar'
import { Button } from '@/components/ui/Button'
import { FilterBar } from '@/components/ui/FilterBar'
import { Box } from 'lucide-react'

type Item = Database['public']['Tables']['items']['Row']
type ItemStatus = Database['public']['Enums']['item_performance_status_enum']



type Props = {
    initialItems: Item[]
    totalCount: number
    locations: Database['public']['Tables']['locations']['Row'][]
    groups: Database['public']['Tables']['groups']['Row'][]
    initialCategoryId?: string
    initialViewItemId?: string
}

export function ItemsList({ initialItems, totalCount, locations, groups, initialCategoryId, initialViewItemId }: Props) {
    const t = useTranslations('ItemsList')

    const [view, setView] = useState<'grid' | 'list'>('grid')

    // Pagination State
    const [items, setItems] = useState<Item[]>(initialItems)
    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(initialItems.length < totalCount)
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const [isFiltering, setIsFiltering] = useState(false)

    // Edit Dialog State
    const [selectedItem, setSelectedItem] = useState<Item | null>(null)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)

    // Handle initial view item from URL
    useEffect(() => {
        if (initialViewItemId) {
            const item = initialItems.find(i => i.id === initialViewItemId)
            if (item) {
                setSelectedItem(item)
                setIsDetailsDialogOpen(true)
            }
        }
    }, [initialViewItemId, initialItems])

    const handleItemClick = (item: Item) => {
        setSelectedItem(item)
        setIsDetailsDialogOpen(true)
    }

    const handleEditClick = (item: Item) => {
        setSelectedItem(item)
        setIsDetailsDialogOpen(false)
        setIsEditDialogOpen(true)
    }




    // Simplified Pagination (no filters)
    useEffect(() => {
        // Reset items on initial render or if needed
    }, [])

    const loadMore = async () => {
        if (isLoadingMore || !hasMore) return

        setIsLoadingMore(true)
        try {
            const nextPage = page + 1
            const { items: newItems, count } = await getItems({
                page: nextPage,
                limit: 50,
                search: '',
            })

            setItems(prev => [...prev, ...newItems])
            setPage(nextPage)
            setHasMore(items.length + newItems.length < count)
        } catch (error) {
            console.error('Failed to load more items:', error)
        } finally {
            setIsLoadingMore(false)
        }
    }



    const displayItems = items

    return (
        <div className="space-y-8">
            <FilterBar>
                {/* Search Bar & Toggle */}
                <div className="flex-1 w-full xl:w-auto min-w-[300px]">
                    <MorphingSearchBar mode="trigger" context="item" className="w-full" />
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                    {/* View Toggle */}
                    <div className="flex bg-white/5 border border-white/5 rounded-xl p-1 ml-auto">
                        <button
                            onClick={() => setView('grid')}
                            className={`p-2 rounded-lg transition-all ${view === 'grid' ? 'bg-white/10 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setView('list')}
                            className={`p-2 rounded-lg transition-all ${view === 'list' ? 'bg-white/10 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}
                        >
                            <List className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </FilterBar>

            {isFiltering ? (
                view === 'grid' ? (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="rounded-xl border border-neutral-800 bg-neutral-900/40 h-[300px] overflow-hidden">
                                <div className="h-2/3 bg-neutral-800/50 animate-pulse" />
                                <div className="p-4 space-y-3">
                                    <div className="h-6 bg-neutral-800/50 rounded w-3/4 animate-pulse" />
                                    <div className="h-4 bg-neutral-800/50 rounded w-1/2 animate-pulse" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="flex items-center gap-4 rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 h-24">
                                <div className="h-16 w-16 rounded-lg bg-neutral-800/50 animate-pulse flex-shrink-0" />
                                <div className="flex-1 space-y-3">
                                    <div className="h-5 bg-neutral-800/50 rounded w-1/3 animate-pulse" />
                                    <div className="h-4 bg-neutral-800/50 rounded w-1/4 animate-pulse" />
                                </div>
                            </div>
                        ))}
                    </div>
                )
            ) : view === 'grid' ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {displayItems.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => handleItemClick(item)}
                            className="group relative h-[320px] overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/40 backdrop-blur-sm transition-all duration-300 hover:border-blue-500/30 hover:scale-[1.02] shadow-xl cursor-pointer"
                        >
                            <div className="absolute inset-x-0 top-0 bottom-24 bg-neutral-800 z-0 overflow-hidden">
                                {item.image_url ? (
                                    <div className="relative w-full h-full">
                                        <NextImage
                                            src={item.image_url}
                                            alt={item.name}
                                            fill
                                            className="object-cover object-center transition-transform duration-700 group-hover:scale-110 opacity-100"
                                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                        />
                                    </div>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-neutral-800 text-neutral-500">
                                        <div className="p-4 rounded-full bg-neutral-900/50">
                                            <ItemIcon name={item.name} className="h-12 w-12 opacity-70" />
                                        </div>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-transparent to-transparent opacity-80" />

                                <div className="absolute bottom-2 left-2 flex gap-1 flex-wrap">
                                    <StatusBadge status={item.status} />
                                </div>
                            </div>

                            <div className="absolute inset-x-0 bottom-0 p-5 bg-neutral-900/90 backdrop-blur-md border-t border-white/5 h-24 flex flex-col justify-center transition-colors group-hover:bg-neutral-900">
                                <h3 className="text-lg font-bold text-white truncate group-hover:text-blue-200 transition-colors">
                                    {item.name}
                                </h3>
                                <p className="mt-1 text-sm text-neutral-400 line-clamp-1">
                                    {item.notes || t('noNotes')}
                                </p>

                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-3">
                    {displayItems.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => handleItemClick(item)}
                            className="group flex items-center gap-6 rounded-xl border border-neutral-800 bg-neutral-900/40 backdrop-blur-sm p-3 transition-all duration-300 hover:bg-neutral-900/60 hover:border-blue-500/30 hover:scale-[1.005] cursor-pointer shadow-sm hover:shadow-md"
                        >
                            <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-neutral-800 shadow-inner">
                                {item.image_url ? (
                                    <NextImage
                                        src={item.image_url}
                                        alt={item.name}
                                        fill
                                        className="object-cover object-center transition-transform duration-500 group-hover:scale-110"
                                        sizes="64px"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-neutral-500">
                                        <ItemIcon name={item.name} className="h-8 w-8" />
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                                <div>
                                    <h3 className="text-base font-bold text-white truncate group-hover:text-blue-200 transition-colors">{item.name}</h3>
                                    <p className="text-xs text-neutral-400 truncate mt-0.5">
                                        {item.notes}
                                    </p>
                                </div>
                                <div className="hidden md:flex items-center gap-2 justify-end">
                                    <StatusBadge status={item.status} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!isFiltering && displayItems.length === 0 && (
                <div className="text-center py-20 bg-neutral-900/20 rounded-2xl border border-neutral-800/50 border-dashed">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neutral-800/50 mb-4 text-neutral-600">
                        <Box className="w-8 h-8" />
                    </div>
                    <p className="text-lg font-medium text-neutral-500">{t('noItemsFound')}</p>
                    <p className="text-sm text-neutral-600 mt-1">Adjust filters or create a new item.</p>
                </div>
            )}

            {/* Load More Button */}
            {hasMore && !isFiltering && (
                <div className="flex justify-center pt-8 pb-12">
                    <Button
                        onClick={loadMore}
                        disabled={isLoadingMore}
                        variant="secondary"
                        isLoading={isLoadingMore}
                        className="rounded-full px-8 py-6 text-base"
                    >
                        {t('loadMore')}
                    </Button>
                </div>
            )}

            <EditItemDialog
                item={selectedItem}
                isOpen={isEditDialogOpen}
                onClose={() => setIsEditDialogOpen(false)}
                locations={locations}
                groups={groups}
            />

            <ItemDetailsDialog
                item={selectedItem}
                isOpen={isDetailsDialogOpen}
                onClose={() => setIsDetailsDialogOpen(false)}
                onEdit={handleEditClick}
                locations={locations}
                groups={groups}
            />
        </div>
    )
}

function StatusBadge({ status }: { status: string | null }) {
    const t = useTranslations('ItemsList.statuses')
    if (!status) return null

    const styles = {
        active: 'bg-green-400/10 text-green-400 ring-green-400/20',
        upcoming: 'bg-yellow-400/10 text-yellow-400 ring-yellow-400/20',
        archived: 'bg-neutral-400/10 text-neutral-400 ring-neutral-400/20',
        unassigned: 'bg-burgundy-main/10 text-burgundy-light ring-burgundy-main/20',
        in_maintenance: 'bg-orange-400/10 text-orange-400 ring-orange-400/20',
    }

    const style = styles[status as keyof typeof styles] || styles.unassigned
    const label = t(status as ItemStatus) || status.replace('_', ' ')

    return (
        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${style}`}>
            {label}
        </span>
    )
}
