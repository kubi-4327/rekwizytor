/**
 * PocketBase Collection Type Definitions
 * 
 * Type-safe interfaces for all PocketBase collections used in embedding tests
 */

/**
 * Groups collection - contains items grouped with AI embeddings
 */
export interface PocketBaseGroup {
    id: string
    original_id: string // UUID from Supabase
    name: string
    description: string | null
    color: string | null
    icon: string | null
    performance_id: string | null
    location_id: string | null
    short_id: string | null
    embeddings: {
        [key: string]: { // e.g. "g25f_gem004"
            identity?: number[]
            physical?: number[]
            context?: number[]
        }
    } | null
    deleted_at: string | null
    created: string
    updated: string
}

/**
 * Test runs - configuration and state of embedding comparison tests
 */
export interface PocketBaseTestRun {
    id: string
    name: string
    status: 'pending' | 'running' | 'completed' | 'failed' | 'aborted'
    embedding_model: string
    embedding_key: string | null  // Composite key like "g25f_gem004"
    use_sample_groups: boolean
    tester_model: string
    tester_temperature: number
    difficulty_mode: string
    mvs_weight_identity: number
    mvs_weight_physical: number
    mvs_weight_context: number
    match_threshold: number
    delay_between_queries_ms: number
    target_query_count: number
    completed_query_count: number
    requires_reembedding: boolean
    error_message: string | null
    use_dynamic_weights: boolean
    total_search_tokens: number
    total_tester_tokens: number
    created: string
    updated: string
}

/**
 * Test results - individual search query results
 */
export interface PocketBaseTestResult {
    id: string
    run_id: string
    source_group_id: string
    source_group_name: string
    generated_query: string
    top_results: Array<{
        id: string
        name: string
        similarity: number
    }>
    correct_rank: number
    error_message: string | null
    query_intent: string
    search_tokens: number
    tester_tokens: number
    similarity_margin: number
    applied_weights: {
        identity: number
        physical: number
        context: number
    }
    // top1_group_id, top1_group_name - REMOVED (use top_results[0] instead)
    created: string
}

/**
 * Test queue - queued test configurations waiting to run
 */
export interface PocketBaseTestQueue {
    id: string
    position: number | null
    status: 'pending' | 'running' | 'completed' | 'failed'
    config: Record<string, any>
    run_id: string | null
    error_message: string | null
    started_at: string | null
    completed_at: string | null
    created: string
}

/**
 * Regeneration jobs - background jobs for regenerating embeddings
 */
export interface PocketBaseRegenerationJob {
    id: string
    status: 'pending' | 'running' | 'completed' | 'failed'
    embedding_model: string
    enrichment_model: string
    use_sample_groups: boolean
    total_groups: number
    processed_groups: number
    current_group_id: string | null
    current_group_name: string | null
    current_enrichment: Record<string, any> | null
    error_message: string | null
    failed_groups: any[] | null
    total_tokens: number
    created: string
    updated: string
}
