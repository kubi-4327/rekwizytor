'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
    Search,
    FileText,
    Box,
    Layers,
    MapPin,
    Loader2,
    StickyNote,
    Sparkles,
    ClipboardList,
    Command as CommandIcon,
    MoreHorizontal,
    Zap,
    Brain,
    ChevronDown,
    Check,
    X,
    Filter,
    // Quick action icons
    Calendar,
    Pencil,
    History,
    Link2,
    Copy,
    List,
    QrCode,
    Share2,
    Download,
    Tag,
    Play,
    ArrowRightLeft,
    ExternalLink
} from 'lucide-react'
import { clsx } from 'clsx'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { unifiedSearch, type SearchResult, type SearchStrategy } from '@/app/actions/unified-search'
import { smartSearch } from '@/app/actions/smart-search'
import { SearchResultCard, getEntityConfig } from '@/components/search/SearchResultCard'



export default function SearchPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const initialQuery = searchParams.get('q') || ''

    // Core search state
    const [query, setQuery] = React.useState(initialQuery)
    const [results, setResults] = React.useState<SearchResult[]>([])
    const [staleResults, setStaleResults] = React.useState<SearchResult[]>([])
    const [loading, setLoading] = React.useState(false)
    const [searchStrategy, setSearchStrategy] = React.useState<SearchStrategy>('fts')

    // Filter state
    const initialType = searchParams.get('type')
    const [entityTypeFilter, setEntityTypeFilter] = React.useState<string[]>(
        initialType ? initialType.split(',') : []
    )
    const [statusFilter, setStatusFilter] = React.useState<string[]>([])
    const [sortBy, setSortBy] = React.useState<'relevance' | 'newest'>('relevance')

    // AI mode state
    const [aiMode, setAiMode] = React.useState(false)
    const [aiLoading, setAiLoading] = React.useState(false)
    const [aiSuggestion, setAiSuggestion] = React.useState<string | null>(null)
    const [aiResults, setAiResults] = React.useState<any[]>([])

    // Dropdown state
    const [openDropdown, setOpenDropdown] = React.useState<'entity' | 'status' | 'sort' | null>(null)

    const t = useTranslations('Navigation')
    const tItems = useTranslations('ItemsList')

    const entityTypes = React.useMemo(() => [
        { value: 'performance', label: t('productions'), icon: Layers },
        { value: 'item', label: t('items'), icon: Box },
        { value: 'group', label: t('groups'), icon: Box },
        { value: 'location', label: t('locations'), icon: MapPin },
        { value: 'note', label: t('notes'), icon: StickyNote },
    ], [t])

    const statusOptions = React.useMemo(() => [
        { value: 'active', label: tItems('statuses.active') },
        { value: 'draft', label: tItems('statuses.draft') },
        { value: 'in_maintenance', label: tItems('statuses.in_maintenance') },
    ], [tItems])

    const sortOptions = React.useMemo(() => [
        { value: 'relevance', label: tItems('bestMatch') },
        { value: 'newest', label: tItems('newestFirst') },
    ], [tItems])

    // Search logic using unified search
    const search = React.useCallback(async (q: string, currentResults?: SearchResult[]) => {
        if (!q) {
            setResults([])
            setStaleResults([])
            setLoading(false)
            return
        }

        setLoading(true)
        // Keep previous results visible (stale-while-revalidate)
        if (currentResults && currentResults.length > 0) {
            setStaleResults(currentResults)
        }

        try {
            const response = await unifiedSearch(q, {
                matchCount: 20, // Reduced for faster initial load
                entityTypeFilter: entityTypeFilter.length > 0 ? entityTypeFilter : undefined,
                statusFilter: statusFilter.length > 0 ? statusFilter : undefined,
                sortBy
            })

            setResults(response.results)
            setSearchStrategy(response.strategy)
            setStaleResults([])
        } catch (err) {
            console.error('Search exception:', err)
        } finally {
            setLoading(false)
        }
    }, [entityTypeFilter, statusFilter, sortBy])

    // AI Search handler
    const handleAISearch = React.useCallback(async () => {
        if (!query.trim()) return

        setAiMode(true)
        setAiLoading(true)
        setAiSuggestion(null)
        setAiResults([])

        try {
            const response = await smartSearch(query)
            if (response.results) {
                setAiResults(response.results)
            }
            if (response.suggestion) {
                setAiSuggestion(response.suggestion)
            }
        } catch (err) {
            console.error('AI Search error:', err)
        } finally {
            setAiLoading(false)
        }
    }, [query])

    // Exit AI mode
    const exitAiMode = () => {
        setAiMode(false)
        setAiSuggestion(null)
        setAiResults([])
    }

    // Debounce search - reduced for snappier response
    React.useEffect(() => {
        if (query.trim() === '') {
            setResults([])
            setStaleResults([])
            setLoading(false)
            return
        }

        // Show loading state immediately if query exists
        setLoading(true)

        const timer = setTimeout(() => {
            if (query && !aiMode) search(query, results)
        }, 150) // Faster debounce for snappier UX
        return () => clearTimeout(timer)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query, aiMode])

    // Re-search when filters change
    React.useEffect(() => {
        if (query.trim() && !aiMode) {
            search(query, results)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entityTypeFilter, statusFilter, sortBy])


    // Update URL with DEBOUNCE to prevent SecurityError
    React.useEffect(() => {
        const timer = setTimeout(() => {
            const params = new URLSearchParams(searchParams.toString())
            if (query) {
                params.set('q', query)
            } else {
                params.delete('q')
            }

            const newSearch = params.toString()
            const currentSearch = searchParams.toString()

            // Only update if actually changed to avoid History API loops
            if (newSearch !== currentSearch) {
                // If we have params, add ?, otherwise use just the pathname
                const newUrl = newSearch ? `?${newSearch}` : window.location.pathname
                window.history.replaceState(null, '', newUrl)
            }
        }, 500) // 500ms delay to prevent excessive updates

        return () => clearTimeout(timer)
    }, [query, searchParams])

    // Close dropdowns when clicking outside
    React.useEffect(() => {
        const handleClick = () => setOpenDropdown(null)
        if (openDropdown) {
            document.addEventListener('click', handleClick)
            return () => document.removeEventListener('click', handleClick)
        }
    }, [openDropdown])

    // Group results by entity type
    const displayResults = aiMode ? aiResults : (loading && staleResults.length > 0 ? staleResults : results)
    const grouped = displayResults.reduce((acc, item) => {
        const type = item.entity_type
        if (!acc[type]) acc[type] = []
        acc[type].push(item)
        return acc
    }, {} as Record<string, typeof displayResults>)

    // Helper functions moved to SearchResultCard component but we need `entityTypes` for filters which is defined above.
    // The `getEntityConfig` was used for filters potentially?
    // Wait, the dropdown filter uses `entityTypes` array defined at top of file, so it's fine.
    // However, `extractTextFromTipTap` might be needed if I didn't verify its usage elsewhere?
    // It was only used for description extraction inside the map loop.
    // So we can safely remove `getEntityConfig`, `getEntityActions`, `extractTextFromTipTap` from here as they are in the component now.

    const hasActiveQuery = query.length > 0
    const showStale = loading && staleResults.length > 0

    // Toggle filter value
    const toggleFilter = (filter: string[], setFilter: React.Dispatch<React.SetStateAction<string[]>>, value: string) => {
        if (filter.includes(value)) {
            setFilter(filter.filter(v => v !== value))
        } else {
            setFilter([...filter, value])
        }
    }

    return (
        <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
            {/* Centered Content Container */}
            <div className="flex-1 flex flex-col w-full max-w-5xl mx-auto px-4 md:px-8 relative z-10">

                {/* Search Bar Container - Animates from Center to Top using transform for GPU acceleration */}
                <motion.div
                    initial={false}
                    animate={{
                        y: hasActiveQuery ? 0 : 'calc(35vh - 2rem)',
                        paddingTop: '2rem',
                        paddingBottom: hasActiveQuery ? '2rem' : '0'
                    }}
                    transition={{ type: "tween", duration: 0.2, ease: "easeOut" }}
                    style={{ willChange: 'transform' }}
                    className="w-full flex flex-col items-center z-50"
                >
                    <div className="w-full max-w-3xl relative space-y-3">
                        {/* Main Search Input */}
                        <div className="relative group">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-neutral-700 to-neutral-800 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
                            <div className={clsx(
                                "relative flex items-center bg-[#1e1e1e] border rounded-xl shadow-2xl overflow-hidden transition-all duration-300",
                                aiMode ? "border-burgundy-main/50 ring-1 ring-burgundy-main/30" : "border-white/5 focus-within:border-white/20 focus-within:ring-1 focus-within:ring-white/10"
                            )}>
                                {aiMode ? (
                                    <Brain className="ml-4 h-5 w-5 text-burgundy-light" />
                                ) : (
                                    <Search className="ml-4 h-5 w-5 text-neutral-500" />
                                )}
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(e) => {
                                        setQuery(e.target.value)
                                        if (aiMode) exitAiMode()
                                    }}
                                    placeholder={aiMode ? "Ask AI anything about your props..." : "Search..."}
                                    className="w-full bg-transparent py-3 px-3 text-lg text-white placeholder:text-neutral-600 outline-none font-medium"
                                    autoFocus
                                />
                                <div className="mr-4 flex items-center gap-2">
                                    {(loading || aiLoading) ? (
                                        <Loader2 className="h-4 w-4 animate-spin text-neutral-500" />
                                    ) : aiMode ? (
                                        <button
                                            onClick={exitAiMode}
                                            className="text-xs text-neutral-500 hover:text-white transition-colors"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    ) : (
                                        <>
                                            {query && (
                                                <button
                                                    onClick={() => setQuery('')}
                                                    className="text-neutral-500 hover:text-white transition-colors mr-1"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            )}
                                            {/* Search strategy indicator */}
                                            {hasActiveQuery && !loading && (
                                                <div className={clsx(
                                                    "flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded",
                                                    searchStrategy === 'hybrid'
                                                        ? "bg-purple-500/20 text-purple-300"
                                                        : "bg-neutral-700/50 text-neutral-400"
                                                )}>
                                                    {searchStrategy === 'hybrid' ? (
                                                        <>
                                                            <Zap className="h-2.5 w-2.5" />
                                                            AI
                                                        </>
                                                    ) : (
                                                        'FTS'
                                                    )}
                                                </div>
                                            )}
                                            <div className="hidden md:flex items-center gap-1 text-xs text-neutral-600 font-mono bg-white/5 px-2 py-1 rounded">
                                                <CommandIcon className="h-3 w-3" /> K
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Secondary Row: Filters & AI Button */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                            {/* Entity Type Filter */}
                            <div className="relative">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setOpenDropdown(openDropdown === 'entity' ? null : 'entity')
                                    }}
                                    className={clsx(
                                        "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors whitespace-nowrap",
                                        entityTypeFilter.length > 0
                                            ? "bg-blue-500/10 border-blue-500/30 text-blue-300"
                                            : "bg-neutral-900/50 border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800"
                                    )}
                                >
                                    <Filter className="h-3 w-3" />
                                    <span>{entityTypeFilter.length > 0 ? `${entityTypeFilter.length} Types` : 'All Types'}</span>
                                    <ChevronDown className={clsx("h-3 w-3 transition-transform", openDropdown === 'entity' && "rotate-180")} />
                                </button>

                                {openDropdown === 'entity' && (
                                    <div
                                        className="absolute top-full left-0 mt-1 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl z-50 min-w-[160px] py-1 animate-in fade-in slide-in-from-top-1 duration-150"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {entityTypes.map(({ value, label, icon: Icon }) => (
                                            <button
                                                key={value}
                                                onClick={() => toggleFilter(entityTypeFilter, setEntityTypeFilter, value)}
                                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-neutral-800 transition-colors"
                                            >
                                                <Icon className="h-4 w-4 text-neutral-500" />
                                                <span className="flex-1 text-neutral-300">{label}</span>
                                                {entityTypeFilter.includes(value) && (
                                                    <Check className="h-4 w-4 text-blue-400" />
                                                )}
                                            </button>
                                        ))}
                                        {entityTypeFilter.length > 0 && (
                                            <>
                                                <div className="h-px bg-neutral-800 my-1" />
                                                <button
                                                    onClick={() => setEntityTypeFilter([])}
                                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left text-neutral-500 hover:text-white hover:bg-neutral-800 transition-colors"
                                                >
                                                    Clear all
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Status Filter */}
                            <div className="relative">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setOpenDropdown(openDropdown === 'status' ? null : 'status')
                                    }}
                                    className={clsx(
                                        "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors whitespace-nowrap",
                                        statusFilter.length > 0
                                            ? "bg-green-500/10 border-green-500/30 text-green-300"
                                            : "bg-neutral-900/50 border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800"
                                    )}
                                >
                                    <span>{statusFilter.length > 0 ? `${statusFilter.length} Statuses` : 'All Statuses'}</span>
                                    <ChevronDown className={clsx("h-3 w-3 transition-transform", openDropdown === 'status' && "rotate-180")} />
                                </button>

                                {openDropdown === 'status' && (
                                    <div
                                        className="absolute top-full left-0 mt-1 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl z-50 min-w-[160px] py-1 animate-in fade-in slide-in-from-top-1 duration-150"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {statusOptions.map(({ value, label }) => (
                                            <button
                                                key={value}
                                                onClick={() => toggleFilter(statusFilter, setStatusFilter, value)}
                                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-neutral-800 transition-colors"
                                            >
                                                <span className="flex-1 text-neutral-300">{label}</span>
                                                {statusFilter.includes(value) && (
                                                    <Check className="h-4 w-4 text-green-400" />
                                                )}
                                            </button>
                                        ))}
                                        {statusFilter.length > 0 && (
                                            <>
                                                <div className="h-px bg-neutral-800 my-1" />
                                                <button
                                                    onClick={() => setStatusFilter([])}
                                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left text-neutral-500 hover:text-white hover:bg-neutral-800 transition-colors"
                                                >
                                                    Clear all
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Sort Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setOpenDropdown(openDropdown === 'sort' ? null : 'sort')
                                    }}
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-900/50 border border-neutral-800 text-sm text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors whitespace-nowrap"
                                >
                                    <span>{sortOptions.find(o => o.value === sortBy)?.label}</span>
                                    <ChevronDown className={clsx("h-3 w-3 transition-transform", openDropdown === 'sort' && "rotate-180")} />
                                </button>

                                {openDropdown === 'sort' && (
                                    <div
                                        className="absolute top-full left-0 mt-1 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl z-50 min-w-[140px] py-1 animate-in fade-in slide-in-from-top-1 duration-150"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {sortOptions.map(({ value, label }) => (
                                            <button
                                                key={value}
                                                onClick={() => {
                                                    setSortBy(value as 'relevance' | 'newest')
                                                    setOpenDropdown(null)
                                                }}
                                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-neutral-800 transition-colors"
                                            >
                                                <span className="flex-1 text-neutral-300">{label}</span>
                                                {sortBy === value && (
                                                    <Check className="h-4 w-4 text-white" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="w-px h-6 bg-neutral-800 mx-1"></div>

                            {/* AI Search Button */}
                            <button
                                onClick={handleAISearch}
                                disabled={!query.trim() || aiLoading}
                                className={clsx(
                                    "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-bold uppercase tracking-wider whitespace-nowrap ml-auto transition-all",
                                    aiMode
                                        ? "bg-burgundy-main text-white border-burgundy-main"
                                        : "bg-burgundy-main/10 text-burgundy-light border-burgundy-main/20 hover:bg-burgundy-main hover:text-white",
                                    (!query.trim() || aiLoading) && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                {aiLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Sparkles className="h-4 w-4" />
                                )}
                                <span>{aiMode ? 'AI Active' : 'Ask AI'}</span>
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* AI Suggestion Banner */}
                <AnimatePresence>
                    {aiMode && aiSuggestion && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="w-full max-w-3xl mx-auto mb-6"
                        >
                            <div className="bg-burgundy-main/10 border border-burgundy-main/30 rounded-xl p-4">
                                <div className="flex items-start gap-3">
                                    <Brain className="h-5 w-5 text-burgundy-light shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium text-burgundy-light mb-1">AI Suggestion</p>
                                        <p className="text-sm text-neutral-300">{aiSuggestion}</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Results Container */}
                <AnimatePresence mode="wait">
                    {hasActiveQuery && !(loading && staleResults.length === 0) && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: showStale ? 0.5 : 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            transition={{ duration: 0.2 }}
                            className="w-full pb-20 space-y-8"
                        >
                            {/* No Results State */}
                            {displayResults.length === 0 && !loading && (
                                <div className="text-center py-20">
                                    <p className="text-xl font-bold text-neutral-600">No results found for "{query}"</p>
                                    {!aiMode && (
                                        <button
                                            onClick={handleAISearch}
                                            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-burgundy-main/10 text-burgundy-light border border-burgundy-main/20 hover:bg-burgundy-main hover:text-white transition-colors text-sm font-medium"
                                        >
                                            <Sparkles className="h-4 w-4" />
                                            Try AI Search
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Results Grid */}
                            {(Object.entries(grouped) as [string, (SearchResult | any)[]][]).map(([type, items]) => {
                                // Use the first item to determine config for the group header
                                const firstItem = items[0] as SearchResult
                                const config = getEntityConfig(firstItem) // We need to import this or define it.
                                // Ah, I removed `getEntityConfig` from this file!
                                // I need to import it from SearchResultCard or similar if I exported it.
                                // In `SearchResultCard.tsx`, I exported `getEntityConfig`.
                                // So I need to update the import above as well.
                                const Icon = config.icon

                                return (
                                    <motion.div
                                        key={type}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="space-y-4"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`p-1.5 rounded-md bg-white/5 ${config.colorClass}`}>
                                                <Icon className="h-4 w-4" />
                                            </div>
                                            <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-widest">
                                                {config.label}
                                            </h2>
                                            <div className="h-px flex-1 bg-neutral-800"></div>
                                        </div>

                                        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                                            {items.map((item: any) => (
                                                <SearchResultCard key={item.id} item={item} aiMode={aiMode} />
                                            ))}
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
