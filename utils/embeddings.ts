import { embeddingModel } from './gemini'
import { TaskType } from '@google/generative-ai'

// In-memory cache for query embeddings (RETRIEVAL_QUERY only)
// This dramatically speeds up repeated searches
const queryEmbeddingCache = new Map<string, number[]>()
const MAX_CACHE_SIZE = 100 // Limit cache size to prevent memory issues

export async function generateEmbedding(text: string, taskType: TaskType = TaskType.RETRIEVAL_DOCUMENT): Promise<number[]> {
    if (!embeddingModel) {
        throw new Error('Gemini embedding model not available - GEMINI_API_KEY may be missing')
    }

    // Only cache RETRIEVAL_QUERY (user searches), not RETRIEVAL_DOCUMENT (data embeddings)
    const cacheKey = taskType === TaskType.RETRIEVAL_QUERY ? text.toLowerCase().trim() : null

    // Check cache for query embeddings
    if (cacheKey && queryEmbeddingCache.has(cacheKey)) {
        console.log('⚡ Cache hit for query:', text)
        return queryEmbeddingCache.get(cacheKey)!
    }

    try {
        const result = await embeddingModel.embedContent({
            content: { role: 'user', parts: [{ text }] },
            taskType
        })

        const embedding = result.embedding.values

        // Cache query embeddings
        if (cacheKey) {
            // Implement simple LRU: if cache is full, remove oldest entry
            if (queryEmbeddingCache.size >= MAX_CACHE_SIZE) {
                const firstKey = queryEmbeddingCache.keys().next().value
                if (firstKey) {
                    queryEmbeddingCache.delete(firstKey)
                }
            }
            queryEmbeddingCache.set(cacheKey, embedding)
            console.log('💾 Cached embedding for query:', text)
        }

        // Log AI usage asynchronously (don't block return)
        (async () => {
            try {
                const { createClient } = await import('@/utils/supabase/server')
                const supabase = await createClient()
                const estimatedTokens = Math.ceil(text.length / 4)

                // Determine operation type based on task type
                const operationType = taskType === TaskType.RETRIEVAL_QUERY
                    ? 'smart_search'  // User searching
                    : 'embedding_indexing'  // Indexing data (groups, items, etc.)

                await supabase.from('ai_usage_logs').insert({
                    model_name: 'text-embedding-004',
                    tokens_input: estimatedTokens,
                    tokens_output: 0,
                    total_tokens: estimatedTokens,
                    operation_type: operationType,
                    details: {
                        taskType,
                        textLength: text.length,
                        cached: false
                    }
                })
            } catch (err) {
                console.error('Failed to log embedding usage:', err)
            }
        })()

        return embedding
    } catch (error) {
        console.error('Error generating embedding:', error)
        throw new Error('Failed to generate embedding')
    }
}

// Export function to clear cache if needed
export function clearEmbeddingCache() {
    queryEmbeddingCache.clear()
    console.log('🗑️ Embedding cache cleared')
}
