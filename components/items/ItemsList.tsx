'use client'

import { useState, useEffect } from 'react'
import { LayoutGrid, List, Filter, Sparkles, Layers } from 'lucide-react'
import NextImage from 'next/image'
import { Database } from '@/types/supabase'
import { ItemIcon } from '@/components/ui/ItemIcon'
import { useTranslations } from 'next-intl'
import { getItems } from '@/app/actions/get-items'
import { EditItemDialog } from './EditItemDialog'
import { ItemDetailsDialog } from './ItemDetailsDialog'
import { ContextSearchTrigger } from '@/components/search/ContextSearchTrigger'
import { FilterSelect } from '@/components/ui/FilterSelect'
import { Button } from '@/components/ui/Button'

type Item = Database['public']['Tables']['items']['Row']
type ItemStatus = Database['public']['Enums']['item_performance_status_enum']

type SearchResult = Item & {
    explanation?: string
    matchType?: 'exact' | 'close' | 'alternative'
}

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

    // Filters
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [categoryFilter, setCategoryFilter] = useState<string>(initialCategoryId || 'all')
    const [locationFilter, setLocationFilter] = useState<string>('all')
    const [dateSort, setDateSort] = useState<'newest' | 'oldest'>('newest')



    // Fetch items when filters change (Classic Mode)
    useEffect(() => {
        // Skip initial fetch if we have initial items and no filters
        if (page === 1 && items === initialItems && categoryFilter === 'all' && locationFilter === 'all' && statusFilter === 'all' && dateSort === 'newest') {
            return
        }

        const fetchFilteredItems = async () => {
            setIsFiltering(true)
            try {
                const { items: newItems, count } = await getItems({
                    page: 1,
                    limit: 50,
                    search: '',
                    status: statusFilter,
                    categoryId: categoryFilter,
                    locationId: locationFilter,
                    sort: dateSort
                })
                setItems(newItems)
                setPage(1)
                setHasMore(newItems.length < count)
            } catch (error) {
                console.error('Failed to fetch items:', error)
            } finally {
                setIsFiltering(false)
            }
        }

        const debounceTimer = setTimeout(fetchFilteredItems, 300)
        return () => clearTimeout(debounceTimer)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [categoryFilter, locationFilter, statusFilter, dateSort])

    const loadMore = async () => {
        if (isLoadingMore || !hasMore) return

        setIsLoadingMore(true)
        try {
            const nextPage = page + 1
            const { items: newItems, count } = await getItems({
                page: nextPage,
                limit: 50,
                search: '',
                status: statusFilter,
                categoryId: categoryFilter,
                locationId: locationFilter,
                sort: dateSort
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
        <div className="space-y-6">
            <div className="bg-neutral-900/50 p-4 rounded-lg border border-neutral-800 space-y-4">
                {/* Search Bar & Toggle */}
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <ContextSearchTrigger context="item" className="w-full" />
                    </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 items-center">
                    <Filter className="hidden sm:block w-4 h-4 text-neutral-500 mr-2" />

                    {/* Status Filter */}
                    <FilterSelect
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full sm:w-auto"
                    >
                        <option value="all">{t('allStatuses')}</option>
                        <option value="active">{t('statuses.active')}</option>
                        <option value="upcoming">{t('statuses.upcoming')}</option>
                        <option value="archived">{t('statuses.archived')}</option>
                        <option value="unassigned">{t('statuses.unassigned')}</option>
                        <option value="in_maintenance">{t('statuses.in_maintenance')}</option>
                    </FilterSelect>

                    {/* Category Filter */}
                    <FilterSelect
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="w-full sm:w-auto"
                    >
                        <option value="all">{t('allCategories')}</option>
                        {groups.map(g => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                    </FilterSelect>

                    {/* Location Filter */}
                    <FilterSelect
                        value={locationFilter}
                        onChange={(e) => setLocationFilter(e.target.value)}
                        className="w-full sm:w-auto"
                    >
                        <option value="all">{t('allLocations')}</option>
                        {locations.map(l => (
                            <option key={l.id} value={l.id}>{l.name}</option>
                        ))}
                    </FilterSelect>

                    {/* Date Sort */}
                    <FilterSelect
                        value={dateSort}
                        onChange={(e) => setDateSort(e.target.value as 'newest' | 'oldest')}
                        className="w-full sm:w-auto sm:ml-auto"
                    >
                        <option value="newest">{t('newestFirst')}</option>
                        <option value="oldest">{t('oldestFirst')}</option>
                    </FilterSelect>

                    {/* View Toggle */}
                    <div className="col-span-2 sm:col-span-1 flex justify-end sm:justify-start rounded-md border border-neutral-800 bg-neutral-950 p-1 sm:ml-2">
                        <button
                            onClick={() => setView('grid')}
                            className={`p-1 rounded ${view === 'grid' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'}`}
                        >
                            <LayoutGrid className="h-3.5 w-3.5" />
                        </button>
                        <button
                            onClick={() => setView('list')}
                            className={`p-1 rounded ${view === 'list' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'}`}
                        >
                            <List className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>
            </div>



            {isFiltering ? (
                view === 'grid' ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="rounded-lg border border-neutral-800 bg-neutral-900 overflow-hidden">
                                <div className="aspect-square bg-neutral-800 animate-pulse" />
                                <div className="p-4 space-y-2">
                                    <div className="h-6 bg-neutral-800 rounded w-3/4 animate-pulse" />
                                    <div className="h-4 bg-neutral-800 rounded w-1/2 animate-pulse" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="flex items-center gap-4 rounded-lg border border-neutral-800 bg-neutral-900 p-3">
                                <div className="h-12 w-12 rounded-md bg-neutral-800 animate-pulse flex-shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-5 bg-neutral-800 rounded w-1/3 animate-pulse" />
                                    <div className="h-4 bg-neutral-800 rounded w-1/4 animate-pulse" />
                                </div>
                            </div>
                        ))}
                    </div>
                )
            ) : view === 'grid' ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {displayItems.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => handleItemClick(item)}
                            className="group relative overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900 transition-colors hover:border-neutral-700 cursor-pointer"
                        >
                            <div className="aspect-square w-full bg-neutral-800 relative flex items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-900">
                                {item.image_url ? (
                                    <NextImage
                                        src={item.thumbnail_url || item.image_url}
                                        alt={item.name}
                                        fill
                                        className="object-cover transition-transform group-hover:scale-105"
                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                    />
                                ) : (
                                    <ItemIcon name={item.name} className="h-16 w-16 text-neutral-600 group-hover:text-neutral-500 transition-colors" />
                                )}

                            </div>
                            <div className="p-4">
                                <h3 className="text-lg font-bold text-white truncate">
                                    {item.name}
                                </h3>
                                <p className="mt-1 text-sm text-neutral-400 line-clamp-2">
                                    {'explanation' in item ? (item as SearchResult).explanation : (item.notes || t('noNotes'))}
                                </p>
                                {item.ai_description && (
                                    <p className="mt-1 text-xs text-ai-secondary/70 line-clamp-1 font-mono">
                                        AI: {item.ai_description}
                                    </p>
                                )}
                                {'matchType' in item && (
                                    <div className="mt-2">
                                        <span className={`text-xs px-2 py-0.5 rounded-full border ${(item as SearchResult).matchType === 'exact' ? 'bg-green-900/30 text-green-400 border-green-900/50' :
                                            (item as SearchResult).matchType === 'close' ? 'bg-yellow-900/30 text-yellow-400 border-yellow-900/50' :
                                                'bg-burgundy-main/30 text-burgundy-light border-burgundy-main/50'
                                            }`}>
                                            {(item as SearchResult).matchType === 'exact' ? t('bestMatch') : (item as SearchResult).matchType === 'close' ? t('closeMatch') : t('alternative')}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-2">
                    {displayItems.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => handleItemClick(item)}
                            className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-lg border border-neutral-800 bg-neutral-900 p-3 transition-colors hover:border-neutral-700 cursor-pointer"
                        >
                            <div className="flex items-center gap-4 w-full sm:w-auto">
                                <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-neutral-800 flex items-center justify-center">
                                    {item.image_url ? (
                                        <NextImage
                                            src={item.thumbnail_url || item.image_url}
                                            alt={item.name}
                                            fill
                                            className="object-cover"
                                            sizes="48px"
                                        />
                                    ) : (
                                        <ItemIcon name={item.name} className="h-6 w-6 text-neutral-600" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0 sm:hidden">
                                    <h3 className="font-bold text-white truncate">{item.name}</h3>
                                </div>
                            </div>

                            <div className="flex-1 min-w-0 hidden sm:block">
                                <h3 className="font-bold text-white truncate">{item.name}</h3>
                                <p className="text-sm text-neutral-400 truncate">
                                    {'explanation' in item ? (item as SearchResult).explanation : item.notes}
                                </p>
                                {item.ai_description && (
                                    <p className="text-xs text-ai-secondary/70 truncate font-mono">
                                        AI: {item.ai_description}
                                    </p>
                                )}
                            </div>

                            {/* Mobile Description */}
                            <p className="text-sm text-neutral-400 line-clamp-2 sm:hidden">
                                {'explanation' in item ? (item as SearchResult).explanation : item.notes}
                            </p>

                            <div className="flex-shrink-0 flex items-center gap-2 mt-2 sm:mt-0 justify-between sm:justify-end w-full sm:w-auto">
                                {'matchType' in item && (item as SearchResult).matchType === 'exact' && (
                                    <span className="px-2 py-0.5 rounded-full bg-green-900/30 text-green-400 text-xs border border-green-900/50">
                                        {t('bestMatch')}
                                    </span>
                                )}

                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!isFiltering && displayItems.length === 0 && (
                <div className="text-center py-12 text-neutral-500 bg-neutral-900/30 rounded-lg border border-neutral-800 border-dashed px-4">
                    <p className="mb-2">{t('noItemsFound')}</p>

                </div>
            )}

            {/* Load More Button */}
            {hasMore && !isFiltering && (
                <div className="flex justify-center pt-8 pb-4">
                    <Button
                        onClick={loadMore}
                        disabled={isLoadingMore}
                        variant="secondary"
                        isLoading={isLoadingMore}
                        className="rounded-full px-6"
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
