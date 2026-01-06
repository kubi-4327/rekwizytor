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
