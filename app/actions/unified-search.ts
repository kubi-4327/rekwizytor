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

export type SearchStrategy = 'fts' | 'hybrid'

export type UnifiedSearchResult = {
    results: SearchResult[]
    strategy: SearchStrategy
    queryClassification: string
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
 * Unified search action that automatically selects the best strategy
 */
export async function unifiedSearch(
    query: string,
    options?: {
        matchCount?: number
        entityTypeFilter?: string[]
        statusFilter?: string[]
        sortBy?: 'relevance' | 'newest'
        filters?: {
            dateFrom?: string
            dateTo?: string
            location?: string
            category?: string
            groupId?: string
        }
    }
): Promise<UnifiedSearchResult> {
    try {
        console.log('[unifiedSearch] Starting search with query:', query, 'options:', JSON.stringify(options))

        const supabase = await createClient()
        console.log('[unifiedSearch] Supabase client created')

        const matchCount = options?.matchCount ?? 30
        const strategy = classifyQuery(query)
        console.log('[unifiedSearch] Strategy:', strategy, 'matchCount:', matchCount)

        let results: SearchResult[] = []

        if (strategy === 'fts') {
            // Simple FTS search (fast, no AI cost)
            try {
                console.log('[unifiedSearch] Starting FTS search with query:', query)
                const { data, error } = await supabase.rpc('search_global', {
                    query_text: query,
                    match_threshold: 0.5,
                    match_count: matchCount,
                    fuzzy_threshold: 0.3
                })

                if (error) {
                    console.error('[unifiedSearch] FTS search RPC error:', JSON.stringify(error))
                    return { results: [], strategy, queryClassification: 'fts-only' }
                }

                console.log('[unifiedSearch] FTS search returned', data?.length ?? 0, 'results')
                results = (data as SearchResult[]) || []
            } catch (ftsError) {
                console.error('[unifiedSearch] FTS search exception:', ftsError)
                return { results: [], strategy, queryClassification: 'fts-error' }
            }
        } else {
            // Hybrid search with embeddings
            try {
                const queryEmbedding = await generateEmbedding(query, TaskType.RETRIEVAL_QUERY)

                const { data, error } = await supabase.rpc('search_global_hybrid', {
                    query_text: query,
                    query_embedding: JSON.stringify(queryEmbedding),
                    match_threshold: 0.4,
                    match_count: matchCount,
                    fuzzy_threshold: 0.3
                })

                if (error) {
                    console.error('Hybrid search error:', error)
                    // Fallback to FTS
                    const { data: ftsData } = await supabase.rpc('search_global', {
                        query_text: query,
                        match_threshold: 0.5,
                        match_count: matchCount,
                        fuzzy_threshold: 0.3
                    })
                    results = (ftsData as SearchResult[]) || []
                } else {
                    results = (data as SearchResult[]) || []
                }
            } catch (embeddingError) {
                console.error('Embedding generation error:', embeddingError)
                // Fallback to FTS
                const { data: ftsData } = await supabase.rpc('search_global', {
                    query_text: query,
                    match_threshold: 0.5,
                    match_count: matchCount,
                    fuzzy_threshold: 0.3
                })
                results = (ftsData as SearchResult[]) || []
            }
        }

        // Apply filters
        if (options?.entityTypeFilter?.length) {
            results = results.filter(r => options.entityTypeFilter!.includes(r.entity_type))
        }

        if (options?.statusFilter?.length) {
            results = results.filter(r => {
                const status = r.metadata?.status
                return status && options.statusFilter!.includes(status)
            })
        }

        // Advanced filters
        if (options?.filters) {
            const { dateFrom, dateTo, location, category, groupId } = options.filters

            if (dateFrom || dateTo) {
                results = results.filter(r => {
                    const date = r.metadata?.date || r.metadata?.created_at
                    if (!date) return false
                    const d = new Date(date).getTime()
                    const from = dateFrom ? new Date(dateFrom).getTime() : 0
                    const to = dateTo ? new Date(dateTo).getTime() : Infinity
                    return d >= from && d <= to
                })
            }

            if (location) {
                results = results.filter(r => {
                    const loc = r.metadata?.location_name || r.metadata?.location
                    return loc && typeof loc === 'string' && loc.toLowerCase().includes(location.toLowerCase())
                })
            }

            if (category) {
                results = results.filter(r => {
                    const cat = r.metadata?.category
                    return cat && typeof cat === 'string' && cat.toLowerCase().includes(category.toLowerCase())
                })
            }

            if (groupId) {
                results = results.filter(r => r.metadata?.group_id === groupId)
            }
        }

        // Apply sorting
        if (options?.sortBy === 'newest') {
            results.sort((a, b) => {
                const dateA = new Date(a.metadata?.created_at || 0).getTime()
                const dateB = new Date(b.metadata?.created_at || 0).getTime()
                return dateB - dateA
            })
        }

        console.log('[unifiedSearch] Returning', results.length, 'results')
        return {
            results,
            strategy,
            queryClassification: strategy === 'fts' ? 'simple-query' : 'semantic-query'
        }
    } catch (error) {
        console.error('[unifiedSearch] FATAL ERROR:', error)
        console.error('[unifiedSearch] Error stack:', error instanceof Error ? error.stack : 'No stack')
        console.error('[unifiedSearch] Error message:', error instanceof Error ? error.message : String(error))
        // Return empty results instead of throwing to avoid 500 error
        return {
            results: [],
            strategy: 'fts',
            queryClassification: 'error'
        }
    }
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
