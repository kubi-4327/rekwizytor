import { GoogleGenerativeAI } from '@google/generative-ai'

if (!process.env.GEMINI_API_KEY) {
    throw new Error('Missing GEMINI_API_KEY environment variable')
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

// Export model instances
export const geminiFlash = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
export const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' })
