import { embeddingModel } from './gemini'
import { TaskType } from '@google/generative-ai'

export async function generateEmbedding(text: string, taskType: TaskType = TaskType.RETRIEVAL_DOCUMENT): Promise<number[]> {
    if (!embeddingModel) {
        throw new Error('Gemini embedding model not available - GEMINI_API_KEY may be missing')
    }

    try {
        const result = await embeddingModel.embedContent({
            content: { role: 'user', parts: [{ text }] },
            taskType
        })
        return result.embedding.values
    } catch (error) {
        console.error('Error generating embedding:', error)
        throw new Error('Failed to generate embedding')
    }
}

