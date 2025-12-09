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
    Command as CommandIcon,
    Zap,
    Brain,
    X,
    ArrowRight,
    ChevronDown
} from 'lucide-react'
import { clsx } from 'clsx'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { unifiedSearch, type SearchResult, type SearchStrategy } from '@/app/actions/unified-search'
import { smartSearch } from '@/app/actions/smart-search'
import { SearchResultCard, getEntityConfig } from '@/components/search/SearchResultCard'
import { SearchFilters } from '@/components/search/SearchFilters'

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

    // Enhanced Filter State
    const initialType = searchParams.get('type')
    const [entityTypeFilter, setEntityTypeFilter] = React.useState<string[]>(
        initialType ? initialType.split(',') : []
    )

    // We consolidate other filters into a single state object for SearchFilters component
    const [detailedFilters, setDetailedFilters] = React.useState<import('@/components/search/SearchFilters').FilterState>({
        status: [],
        sortBy: 'relevance'
    })

    // AI mode state
    const [aiMode, setAiMode] = React.useState(false)
    const [aiLoading, setAiLoading] = React.useState(false)
    const [aiSuggestion, setAiSuggestion] = React.useState<string | null>(null)
    const [aiResults, setAiResults] = React.useState<any[]>([])

    const t = useTranslations('Navigation')

    const entityTypes = React.useMemo(() => [
        { value: 'all', label: 'All', icon: Sparkles }, // Pseudo-type for "All"
        { value: 'performance', label: t('productions'), icon: Layers },
        { value: 'item', label: t('items'), icon: Box },
        { value: 'group', label: t('groups'), icon: Box },
        { value: 'location', label: t('locations'), icon: MapPin },
        { value: 'note', label: t('notes'), icon: StickyNote },
    ], [t])

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
                matchCount: 20,
                entityTypeFilter: entityTypeFilter.length > 0 ? entityTypeFilter : undefined,
                statusFilter: detailedFilters.status.length > 0 ? detailedFilters.status : undefined,
                sortBy: detailedFilters.sortBy,
                filters: {
                    dateFrom: detailedFilters.dateFrom,
                    dateTo: detailedFilters.dateTo,
                    location: detailedFilters.location,
                    category: detailedFilters.category,
                    groupId: detailedFilters.groupId
                }
            })

            setResults(response.results)
            setSearchStrategy(response.strategy)
            setStaleResults([])
        } catch (err) {
            console.error('Search exception:', err)
        } finally {
            setLoading(false)
        }
    }, [entityTypeFilter, detailedFilters])

    // AI Search handler
    const performAiSearch = React.useCallback(async (q: string) => {
        if (!q.trim()) return
        setAiLoading(true)
        setAiSuggestion(null)
        setAiResults([])
        try {
            const response = await smartSearch(q)
            if (response.results) setAiResults(response.results)
            if (response.suggestion) setAiSuggestion(response.suggestion)
        } catch (err) {
            console.error('AI Search error:', err)
        } finally {
            setAiLoading(false)
        }
    }, [])

    // Toggle AI Mode
    const toggleAiMode = () => {
        const newMode = !aiMode
        setAiMode(newMode)
        if (!newMode) {
            // Clear everything when turning off
            setQuery('')
            setResults([])
            setStaleResults([])
            setAiResults([])
            setAiSuggestion(null)
            // Remove query param
            const params = new URLSearchParams(searchParams.toString())
            params.delete('q')
            window.history.replaceState(null, '', `?${params.toString()}`)
        }
        // NOTE: We do NOT auto-trigger AI search on toggle anymore, waiting for user confirmation (Enter/Click)
    }

    // Handle Input Keys
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && aiMode) {
            e.preventDefault()
            performAiSearch(query)
        }
    }

    // Debounce search (Standard Mode ONLY)
    React.useEffect(() => {
        if (aiMode) return // Start AI search only manually

        if (query.trim() === '') {
            setResults([])
            setStaleResults([])
            setLoading(false)
            return
        }

        // Determine which search to run
        setLoading(true)
        const timer = setTimeout(() => {
            search(query, results)
        }, 150)
        return () => clearTimeout(timer)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query, aiMode])

    // Re-search when filters change (only relevant for normal search)
    React.useEffect(() => {
        if (query.trim() && !aiMode) {
            search(query, results)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entityTypeFilter, detailedFilters])

    // Update URL logic to rely on `type` param mapping
    React.useEffect(() => {
        const timer = setTimeout(() => {
            // ... (URL sync logic remains the same)
            const params = new URLSearchParams(searchParams.toString())
            if (query) params.set('q', query)
            else params.delete('q')

            // Sync type param
            if (entityTypeFilter.length > 0) params.set('type', entityTypeFilter.join(','))
            else params.delete('type')

            const newSearch = params.toString()
            const currentSearch = searchParams.toString()

            if (newSearch !== currentSearch) {
                const newUrl = newSearch ? `?${newSearch}` : window.location.pathname
                window.history.replaceState(null, '', newUrl)
            }
        }, 500)
        return () => clearTimeout(timer)
    }, [query, entityTypeFilter, searchParams])

    const displayResults = aiMode ? aiResults : (loading && staleResults.length > 0 ? staleResults : results)
    const grouped = displayResults.reduce((acc, item) => {
        const type = item.entity_type
        if (!acc[type]) acc[type] = []
        acc[type].push(item)
        return acc
    }, {} as Record<string, typeof displayResults>)

    const hasActiveQuery = query.length > 0
    const showStale = loading && staleResults.length > 0

    // Handle Tab Selection
    const handleTypeSelect = (type: string) => {
        if (type === 'all') {
            setEntityTypeFilter([])
        } else {
            setEntityTypeFilter([type])
        }
        // Reset specific filters when switching types
        setDetailedFilters(prev => ({
            ...prev,
            status: [],
            dateFrom: undefined,
            dateTo: undefined,
            location: undefined,
            category: undefined,
            groupId: undefined
        }))
    }

    const currentEntityType = entityTypeFilter.length === 1 ? entityTypeFilter[0] : null

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
                        <motion.div
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.4, ease: "easeInOut", type: "tween" }}
                            className="max-w-4xl mx-auto space-y-4"
                        >
                            {/* Search Input */}
                            <div className="relative group z-30">
                                {/* AI Glow Effect */}
                                <AnimatePresence>
                                    {aiMode && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.8 }}
                                            transition={{ duration: 0.5, ease: "easeOut" }}
                                            className="absolute -inset-20 bg-burgundy-main/30 rounded-full blur-[80px] pointer-events-none z-0"
                                            style={{
                                                background: `radial-gradient(circle, rgba(120, 0, 0, 0.4) 0%, rgba(120, 0, 0, 0) 70%)`
                                            }}
                                        />
                                    )}
                                </AnimatePresence>

                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-20">
                                    <Search className={clsx("h-6 w-6 transition-colors", aiMode ? "text-burgundy-light" : "text-neutral-400 group-focus-within:text-white")} />
                                </div>
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    // Add Enter key listener
                                    onKeyDown={handleKeyDown}
                                    placeholder={aiMode ? "Ask AI anything..." : t('searchPlaceholder')}
                                    className={clsx(
                                        "block w-full rounded-2xl border text-lg placeholder-neutral-500 focus:ring-0 transition-all font-medium shadow-2xl backdrop-blur-xl relative z-10",
                                        "pl-14 pr-14 py-4",
                                        aiMode
                                            ? "bg-black/40 border-burgundy-main/50 text-white focus:border-burgundy-main"
                                            : "bg-neutral-900/50 border-neutral-800 text-white focus:border-white/20 focus:bg-neutral-900"
                                    )}
                                    autoFocus
                                />

                                {/* Right side actions */}
                                <div className="absolute inset-y-0 right-0 pr-4 flex items-center gap-2 z-20">
                                    {/* Loading State */}
                                    {(loading || aiLoading) && (
                                        <Loader2 className={clsx("h-5 w-5 animate-spin", aiMode ? "text-burgundy-light" : "text-neutral-500")} />
                                    )}

                                    {/* Clear Button */}
                                    {!(loading || aiLoading) && query && !aiMode && (
                                        <button
                                            onClick={() => setQuery('')}
                                            className="text-neutral-500 hover:text-white transition-colors"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}

                                    {/* AI Send Button - Explicit Trigger */}
                                    {aiMode && !aiLoading && query.trim().length > 0 && (
                                        <button
                                            onClick={() => performAiSearch(query)}
                                            className="p-1.5 rounded-full bg-burgundy-main text-white hover:bg-burgundy-main/80 transition-all shadow-lg hover:scale-105"
                                            title="Ask AI"
                                        >
                                            <ArrowRight className="h-4 w-4" />
                                        </button>
                                    )}

                                    {/* Search strategy indicator (Standard Mode Only) */}
                                    {hasActiveQuery && !loading && !aiMode && (
                                        <div className={clsx(
                                            "hidden sm:flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded",
                                            searchStrategy === 'hybrid'
                                                ? "bg-purple-500/20 text-purple-300"
                                                : "bg-neutral-700/50 text-neutral-400"
                                        )}>
                                            {searchStrategy === 'hybrid' ? <Zap className="h-2.5 w-2.5" /> : 'FTS'}
                                        </div>
                                    )}

                                    {/* Shortcut Hint */}
                                    <div className="hidden md:flex items-center gap-1 text-xs text-neutral-600 font-mono bg-white/5 px-2 py-1 rounded">
                                        <CommandIcon className="h-3 w-3" /> K
                                    </div>
                                </div>

                                {/* Standard Focused Glow Effect (Blue/Purple) - Only when NOT in AI mode */}
                                {!aiMode && (
                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition duration-500 pointer-events-none" />
                                )}
                            </div>

                            {/* Secondary Row: Entity Dropdown & Filters */}
                            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full relative z-40">

                                {/* Entity Type Dropdown */}
                                <div className="relative group shrink-0">
                                    <button
                                        disabled={aiMode}
                                        className={clsx(
                                            "flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold transition-all shadow-lg",
                                            aiMode
                                                ? "bg-neutral-800 text-neutral-500 cursor-not-allowed opacity-50"
                                                : "bg-white text-black hover:bg-neutral-200"
                                        )}
                                    >
                                        {/* Dynamic Icon based on selection */}
                                        {(() => {
                                            const active = entityTypes.find(t => t.value === (currentEntityType || 'all'))
                                            const Icon = active?.icon || Sparkles
                                            return <Icon className="h-4 w-4" />
                                        })()}

                                        <span>
                                            {entityTypes.find(t => t.value === (currentEntityType || 'all'))?.label}
                                        </span>
                                        {!aiMode && <ChevronDown className="h-3 w-3 ml-1 opacity-50" />}
                                    </button>

                                    {/* Dropdown Menu - Safe Hover Bridge */}
                                    {!aiMode && (
                                        <div className="absolute top-full left-0 pt-2 w-48 hidden group-hover:block z-50 animate-in fade-in slide-in-from-top-2">
                                            <div className="bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden p-1">
                                                {entityTypes.map(({ value, label, icon: Icon }) => (
                                                    <button
                                                        key={value}
                                                        onClick={() => handleTypeSelect(value)}
                                                        className={clsx(
                                                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left",
                                                            (currentEntityType || 'all') === value
                                                                ? "bg-white/10 text-white font-medium"
                                                                : "text-neutral-400 hover:bg-white/5 hover:text-white"
                                                        )}
                                                    >
                                                        <Icon className="h-4 w-4" />
                                                        {label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Dynamic Filters Area (Only show when NOT in AI mode) */}
                                {!aiMode && (
                                    <div className="flex-1 w-full md:w-auto">
                                        <AnimatePresence mode="wait">
                                            <motion.div
                                                key={currentEntityType || 'all'}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -10 }}
                                                transition={{ duration: 0.2 }}
                                                className="flex items-center flex-wrap gap-2"
                                            >
                                                <SearchFilters
                                                    entityType={currentEntityType}
                                                    filters={detailedFilters}
                                                    onChange={setDetailedFilters}
                                                />
                                            </motion.div>
                                        </AnimatePresence>
                                    </div>
                                )}

                                {/* AI Toggle Switch (Far Right) */}
                                <div className="ml-auto pl-4 flex items-center gap-3 shrink-0">
                                    <span className={clsx("text-xs font-bold uppercase tracking-wider transition-colors hidden sm:block", aiMode ? "text-burgundy-light" : "text-neutral-500")}>
                                        AI Mode
                                    </span>
                                    <button
                                        onClick={toggleAiMode}
                                        className={clsx(
                                            "relative h-6 w-11 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-burgundy-main/50 focus:ring-offset-2 focus:ring-offset-black",
                                            aiMode ? "bg-burgundy-main" : "bg-neutral-800"
                                        )}
                                    >
                                        <motion.div
                                            className="absolute top-1 left-1 h-4 w-4 rounded-full bg-white shadow-sm"
                                            animate={{ x: aiMode ? 20 : 0 }}
                                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                        />
                                    </button>
                                </div>
                            </div>

                        </motion.div>
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
                            {displayResults.length === 0 && !loading && !aiLoading && (
                                <div className="text-center py-20">
                                    <p className="text-xl font-bold text-neutral-600">
                                        {aiMode ? "AI couldn't find anything related to that." : `No results found for "${query}"`}
                                    </p>
                                    {!aiMode && (
                                        <button
                                            onClick={() => { toggleAiMode() }}
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
                                const config = getEntityConfig(firstItem)
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
        </div >
    )
}
