'use server'

import { createClient } from '@/utils/supabase/server'
import { generateEmbedding } from '@/utils/embeddings'
import { TaskType } from '@google/generative-ai'

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
        try {
            // Generate embedding for the query
            const queryEmbedding = await generateEmbedding(query, TaskType.RETRIEVAL_QUERY)

            const { data, error } = await supabase.rpc('search_global_hybrid', {
                query_text: query,
                query_embedding: JSON.stringify(queryEmbedding),
                match_threshold: 0.45,
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
function classifyQuery(query: string): SearchStrategy {
    const words = query.trim().split(/\s+/)
    const wordCount = words.length

    // Simple queries: 1-2 words, no descriptive terms
    if (wordCount <= 2) {
        // Check if it contains semantic/descriptive markers
        const semanticMarkers = /jak|coś|podobn|styl|typu|w stylu|do |dla /i
        if (!semanticMarkers.test(query)) {
            return 'fts'
        }
    }

    // Long descriptive queries always benefit from semantic search
    if (wordCount >= 4 || query.length > 30) {
        return 'hybrid'
    }

    // Questions always use hybrid
    if (query.includes('?') || /^(jak|co|gdzie|kiedy|dlaczego|czy)/i.test(query)) {
        return 'hybrid'
    }

    // Semantic descriptors trigger hybrid
    const descriptivePatterns = [
        /kolor|czerwon|niebieski|zielon|żółt|czarn|biał/i,  // colors
        /stary|nowy|vintage|retro|nowoczesn|klasyczn/i,     // style/age
        /duż|mał|wielk|drobny|masywn/i,                     // size
        /elegancki|prosty|ozdobn|minimalist/i,              // aesthetics
        /lata? \d{2}/i,                                     // decade reference
        /podobn|jak|typu|w stylu/i,                         // similarity
    ]

    for (const pattern of descriptivePatterns) {
        if (pattern.test(query)) {
            return 'hybrid'
        }
    }

    // Default to FTS for simple queries
    return 'fts'
}


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
