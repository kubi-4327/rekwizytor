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
    }
): Promise<UnifiedSearchResult> {
    const supabase = await createClient()

    const matchCount = options?.matchCount ?? 30
    const strategy = classifyQuery(query)

    let results: SearchResult[] = []

    if (strategy === 'fts') {
        // Simple FTS search (fast, no AI cost)
        const { data, error } = await supabase.rpc('search_global', {
            query_text: query,
            match_count: matchCount,
            fuzzy_threshold: 0.3
        })

        if (error) {
            console.error('FTS search error:', error)
            return { results: [], strategy, queryClassification: 'fts-only' }
        }

        results = (data as SearchResult[]) || []
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
                    match_count: matchCount
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
                match_count: matchCount
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

    // Apply sorting
    if (options?.sortBy === 'newest') {
        // Note: We don't have updated_at in results, so this would need additional data
        // For now, we keep relevance sorting
    }

    return {
        results,
        strategy,
        queryClassification: strategy === 'fts' ? 'simple-query' : 'semantic-query'
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
