'use server'

import { createClient } from '@/utils/supabase/server'
import { generateEmbedding } from '@/utils/embeddings'
import { TaskType } from '@google/generative-ai'
import { correctQueryTypos } from '@/utils/query-correction'

// Types for search results
export type SearchResult = {
    entity_type: 'performance' | 'item' | 'group' | 'location' | 'note'
    id: string
    name: string
    description: string | null
    url: string
    image_url: string | null
    metadata: Record<string, any> | null
    score: number
    match_type: 'fts' | 'vector' | 'fuzzy'
}

export type SearchStrategy = 'fts' | 'hybrid' | 'error'

export interface UnifiedSearchOptions {
    matchCount?: number
    entityTypeFilter?: string[]
    statusFilter?: string[]
    sortBy?: 'relevance' | 'date' | 'name'
    filters?: {
        dateFrom?: string
        dateTo?: string
        location?: string
        category?: string
        groupId?: string
    }
}

export interface UnifiedSearchResult {
    results: SearchResult[]
    strategy: SearchStrategy
    totalCount: number
}

/**
 * Unified search that combines FTS, fuzzy, and vector search
 * Returns all results (FTS + semantic) together
 */
export async function unifiedSearch(
    query: string,
    options?: UnifiedSearchOptions
): Promise<UnifiedSearchResult> {
    try {
        const supabase = await createClient()

        const matchCount = options?.matchCount ?? 30

        let results: SearchResult[] = []

        // Execute hybrid search (FTS + Embeddings)
        // Execute hybrid search (FTS + Embeddings) with Multi-Vector Logic
        try {
            // IMPORTANT: Correct typos before generating embedding
            // This allows "szkoła roka" to match "School of Rock"
            const correctedQuery = query.length > 3 ? await correctQueryTypos(query) : query

            // Generate embedding for the corrected query
            const queryEmbedding = await generateEmbedding(correctedQuery, TaskType.RETRIEVAL_QUERY)

            // Determine Intent & Weights
            const intent = classifyQueryIntent(correctedQuery)
            const weights = getWeightsForIntent(intent)

            console.log(`🔍 Search Intent: [${intent.toUpperCase()}] Weights: ID=${weights.identity}, PHYS=${weights.physical}, CTX=${weights.context}`)

            const { data, error } = await supabase.rpc('search_global_hybrid_mv', {
                query_text: query, // Use original for FTS
                query_embedding: JSON.stringify(queryEmbedding), // Use corrected for semantic
                weight_identity: weights.identity,
                weight_physical: weights.physical,
                weight_context: weights.context,
                match_threshold: 0.4,
                match_count: matchCount,
                fuzzy_threshold: 0.3
            })

            if (error) {
                console.error('Hybrid search error:', error)
                // Fallback to FTS only if hybrid fails
                const { data: ftsData } = await supabase.rpc('search_global', {
                    query_text: query,
                    match_threshold: 0.6,
                    match_count: matchCount,
                    fuzzy_threshold: 0.3
                })
                results = (ftsData as SearchResult[]) || []
            } else {
                results = (data as SearchResult[]) || []
            }
        } catch (ftsError) {
            console.error('FTS search error:', ftsError)
        }


        // Apply filters to results
        // Entity type filter
        if (options?.entityTypeFilter && options.entityTypeFilter.length > 0) {
            results = results.filter(r => options.entityTypeFilter!.includes(r.entity_type))
        }

        // Status filter (for performances)
        if (options?.statusFilter && options.statusFilter.length > 0) {
            results = results.filter(r => {
                if (r.entity_type !== 'performance') return true
                const status = r.metadata?.status as string | undefined
                return status && options.statusFilter!.includes(status)
            })
        }

        // Date filters
        if (options?.filters?.dateFrom || options?.filters?.dateTo) {
            results = results.filter(r => {
                if (r.entity_type !== 'performance') return true
                const nextShow = r.metadata?.next_show as string | undefined
                if (!nextShow) return false

                if (options.filters!.dateFrom && nextShow < options.filters!.dateFrom) return false
                if (options.filters!.dateTo && nextShow > options.filters!.dateTo) return false
                return true
            })
        }

        // Location filter
        if (options?.filters?.location) {
            results = results.filter(r => {
                const loc = r.metadata?.location_name || r.metadata?.location
                return loc && typeof loc === 'string' && loc.toLowerCase().includes(options.filters!.location!.toLowerCase())
            })
        }

        // Category filter
        if (options?.filters?.category) {
            results = results.filter(r => {
                const cat = r.metadata?.category
                return cat && typeof cat === 'string' && cat.toLowerCase().includes(options.filters!.category!.toLowerCase())
            })
        }

        // Group ID filter
        if (options?.filters?.groupId) {
            results = results.filter(r => r.metadata?.group_id === options.filters!.groupId)
        }

        // Sort results
        if (options?.sortBy === 'date') {
            results.sort((a, b) => {
                const dateA = a.metadata?.next_show as string | undefined
                const dateB = b.metadata?.next_show as string | undefined
                if (!dateA) return 1
                if (!dateB) return -1
                return dateA.localeCompare(dateB)
            })
        } else if (options?.sortBy === 'name') {
            results.sort((a, b) => a.name.localeCompare(b.name))
        }
        // Default is 'relevance' which is already sorted by score

        return {
            results,
            strategy: 'hybrid',
            totalCount: results.length
        }
    } catch (error) {
        console.error('Unified search error:', error)
        return {
            results: [],
            strategy: 'error',
            totalCount: 0
        }
    }
}

/**
 * Classifies query to determine optimal search strategy
 * - Simple queries (1-2 words, exact names) → FTS only (fast, no AI cost)
 * - Descriptive/semantic queries → Hybrid (FTS + Vector embeddings)
 */
// Weights for different search profiles
interface SearchWeights {
    identity: number
    physical: number
    context: number
}

// Intent Classification Logic
type QueryIntent = 'physical' | 'context' | 'specific' | 'default'

function classifyQueryIntent(query: string): QueryIntent {
    const q = query.toLowerCase()

    // 1. PHYSICAL Intent (Heavy weight on attributes)
    // Keywords: materials, textures, structural properties
    const physicalKeywords = [
        'ostre', 'tępe', 'metalowe', 'drewniane', 'szklane', 'plastikowe', 'papierowe',
        'czerwone', 'zielone', 'niebieskie', 'żółte', 'czarne', 'białe', 'kolorowe',
        'duże', 'małe', 'wysokie', 'niskie', 'długie', 'ciężkie', 'lekkie',
        'stare', 'nowe', 'zardzewiałe', 'zniszczone', 'antyk'
    ]
    if (physicalKeywords.some(k => q.includes(k))) return 'physical'

    // 2. CONTEXT Intent (Heavy weight on situation/location)
    // Keywords: usage, places, occasions
    const contextKeywords = [
        'kuchni', 'kuchenne', 'łazienki', 'salon', 'biuro', 'szkoła', 'klasa',
        'wesele', 'ślub', 'pogrzeb', 'święta', 'boże narodzenie', 'wielkanoc',
        'lata 20', 'lata 30', 'lata 40', 'lata 50', 'lata 60', 'lata 70', 'lata 80', 'lata 90',
        'wojenne', 'średniowieczne', 'futurystyczne',
        'jedzenie', 'picie', 'dekoracja'
    ]
    if (contextKeywords.some(k => q.includes(k))) return 'context'

    // 3. SPECIFIC Intent (Heavy weight on identity)
    // Short queries without intent keywords likely mean specific object search (e.g. "krzesło")
    const wordCount = q.split(/\s+/).length
    if (wordCount <= 2) return 'specific'

    // 4. Default Mixed Intent
    return 'default'
}

function getWeightsForIntent(intent: QueryIntent): SearchWeights {
    switch (intent) {
        case 'physical': // "ostre" -> Look for correct property, ignore context (kitchen)
            return { identity: 0.1, physical: 0.8, context: 0.1 }
        case 'context': // "wesele" -> Look for occasion, ignore if it's a specific knife type
            return { identity: 0.2, physical: 0.1, context: 0.7 }
        case 'specific': // "krzesło" -> I want a chair, not something used ON a chair
            return { identity: 0.8, physical: 0.1, context: 0.1 }
        default: // Balanced approach
            return { identity: 0.5, physical: 0.3, context: 0.2 }
    }
}

/**
 * Classifies query to determine optimal search strategy
 * (Existing function updated to use intent logic if needed, but we focus on unifiedSearch)
 */
function classifyQueryStrategy(query: string): SearchStrategy {
    // ... existing logic ...
    return 'hybrid' // Default to hybrid for now as we want to test MV
}

// ... inside unifiedSearch function ...

// Execute hybrid search (FTS + Embeddings) with Multi-Vector Logic



/**
 * Refresh the search index manually
 * Useful when pg_cron is not available
 */
export async function refreshSearchIndex(): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient()

    // Note: refresh_search_index function will be added by migration 20251205_enhanced_search.sql
    const { error } = await (supabase.rpc as any)('refresh_search_index')

    if (error) {
        console.error('Failed to refresh search index:', error)
        return { success: false, error: error.message }
    }

    return { success: true }
}
