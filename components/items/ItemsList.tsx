'use client'

import { useState, useEffect } from 'react'
import { LayoutGrid, List, Filter, Sparkles, Loader2, Layers } from 'lucide-react'
import NextImage from 'next/image'
import { Database } from '@/types/supabase'
import { ItemIcon } from '@/components/ui/ItemIcon'
import { useTranslations } from 'next-intl'
import { smartSearch } from '@/app/actions/smart-search'
import { getItems } from '@/app/actions/get-items'
import { EditItemDialog } from './EditItemDialog'
import { ItemDetailsDialog } from './ItemDetailsDialog'
import { SearchInput } from '@/components/ui/SearchInput'
import { FilterSelect } from '@/components/ui/FilterSelect'

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
}

export function ItemsList({ initialItems, totalCount, locations, groups }: Props) {
    const t = useTranslations('ItemsList')
    const [view, setView] = useState<'grid' | 'list'>('grid')
    const [searchMode, setSearchMode] = useState<'classic' | 'smart'>('classic')
    const [search, setSearch] = useState('')

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
    const [categoryFilter, setCategoryFilter] = useState<string>('all')
    const [locationFilter, setLocationFilter] = useState<string>('all')
    const [dateSort, setDateSort] = useState<'newest' | 'oldest'>('newest')

    // Smart Search State
    const [smartResults, setSmartResults] = useState<SearchResult[]>([])
    const [smartGroups, setSmartGroups] = useState<{ id: string, name: string }[]>([])
    const [smartSuggestion, setSmartSuggestion] = useState<string | null>(null)
    const [isSmartSearching, setIsSmartSearching] = useState(false)
    const [hasSmartSearched, setHasSmartSearched] = useState(false)

    // Fetch items when filters change (Classic Mode)
    useEffect(() => {
        if (searchMode === 'smart') return

        // Skip initial fetch if we have initial items and no filters
        if (page === 1 && items === initialItems && search === '' && categoryFilter === 'all' && locationFilter === 'all' && statusFilter === 'all' && dateSort === 'newest') {
            return
        }

        const fetchFilteredItems = async () => {
            setIsFiltering(true)
            try {
                const { items: newItems, count } = await getItems({
                    page: 1,
                    limit: 50,
                    search: search,
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
    }, [search, categoryFilter, locationFilter, statusFilter, dateSort, searchMode])

    const loadMore = async () => {
        if (isLoadingMore || !hasMore) return

        setIsLoadingMore(true)
        try {
            const nextPage = page + 1
            const { items: newItems, count } = await getItems({
                page: nextPage,
                limit: 50,
                search: search,
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

    const performSmartSearch = async (query: string) => {
        if (!query.trim()) return

        setIsSmartSearching(true)
        setHasSmartSearched(true)
        setSmartResults([])
        setSmartGroups([])
        setSmartSuggestion(null)

        try {
            const response = await smartSearch(query)
            if (response.results) {
                setSmartResults(response.results)
            }
            if (response.groups) {
                setSmartGroups(response.groups)
            }
            if (response.suggestion) {
                setSmartSuggestion(response.suggestion)
            }
        } catch (error) {
            console.error('Search failed:', error)
        } finally {
            setIsSmartSearching(false)
        }
    }

    const displayItems = searchMode === 'smart' && hasSmartSearched ? smartResults : items

    return (
        <div className="space-y-6">
            <div className="bg-neutral-900/50 p-4 rounded-lg border border-neutral-800 space-y-4">
                {/* Search Bar & Toggle */}
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <SearchInput
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onSearch={(val) => {
                                if (searchMode === 'smart') performSmartSearch(val)
                            }}
                            placeholder={searchMode === 'smart' ? t('searchPlaceholderSmart') : t('searchPlaceholderClassic')}
                            isSmart={searchMode === 'smart'}
                            isSearching={isSmartSearching}
                            onSmartToggle={() => {
                                setSearchMode(prev => prev === 'classic' ? 'smart' : 'classic')
                                setSearch('')
                                setHasSmartSearched(false)
                                setSmartResults([])
                                setSmartSuggestion(null)
                                // Reset filters when switching modes
                                if (searchMode === 'smart') {
                                    setCategoryFilter('all')
                                    setLocationFilter('all')
                                    setStatusFilter('all')
                                }
                            }}
                        />
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
                        disabled={searchMode === 'smart'}
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
                        disabled={searchMode === 'smart'}
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
                        disabled={searchMode === 'smart'}
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
                        disabled={searchMode === 'smart'}
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

            {/* AI Explanation Block & Group Suggestions */}
            {searchMode === 'smart' && hasSmartSearched && (
                <div className="space-y-4">
                    {/* Group Suggestions */}
                    {smartGroups.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {smartGroups.map(group => (
                                <button
                                    key={group.id}
                                    onClick={() => {
                                        setCategoryFilter(group.id)
                                        setSearchMode('classic')
                                        setSearch('')
                                        setHasSmartSearched(false)
                                    }}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-ai-primary/10 border border-ai-primary/30 rounded-full text-sm text-ai-secondary hover:bg-ai-primary/20 transition-colors"
                                >
                                    <Layers className="w-4 h-4" />
                                    {t('searchIn')} <strong>{group.name}</strong>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* AI Results Explanation */}
                    {smartResults.length > 0 && (
                        <div className="bg-ai-primary/10 border border-ai-primary/20 p-4 rounded-lg flex items-start gap-3">
                            <Sparkles className="h-5 w-5 text-ai-secondary flex-shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <h4 className="text-sm font-medium text-white">{t('aiAnalysis')}</h4>
                                <p className="text-sm text-neutral-300">
                                    {smartResults[0].explanation}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {isSmartSearching || isFiltering ? (
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
                                <div className="absolute top-2 right-2">
                                    <StatusBadge status={item.performance_status} />
                                </div>
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
                                                'bg-blue-900/30 text-blue-400 border-blue-900/50'
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
                                <StatusBadge status={item.performance_status} />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!isSmartSearching && displayItems.length === 0 && (
                <div className="text-center py-12 text-neutral-500 bg-neutral-900/30 rounded-lg border border-neutral-800 border-dashed px-4">
                    <p className="mb-2">{t('noItemsFound')}</p>
                    {smartSuggestion && (
                        <div className="mt-4 p-4 bg-ai-secondary/10 border border-ai-secondary/20 rounded-lg text-sm text-ai-secondary inline-flex items-start max-w-lg mx-auto text-left">
                            <Sparkles className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="font-medium mb-1 text-ai-secondary">AI Suggestion:</p>
                                <p className="text-neutral-300">{smartSuggestion}</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Load More Button */}
            {hasMore && searchMode === 'classic' && !isFiltering && (
                <div className="flex justify-center pt-8 pb-4">
                    <button
                        onClick={loadMore}
                        disabled={isLoadingMore}
                        className="px-6 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-full text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                        {isLoadingMore ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                {t('loading')}
                            </>
                        ) : (
                            t('loadMore')
                        )}
                    </button>
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
        unassigned: 'bg-blue-400/10 text-blue-400 ring-blue-400/20',
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
