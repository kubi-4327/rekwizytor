import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai'

// Gracefully handle missing API key - don't crash at import time
const apiKey = process.env.GEMINI_API_KEY

let genAI: GoogleGenerativeAI | null = null
let geminiFlash: GenerativeModel | null = null
let embeddingModel: GenerativeModel | null = null

if (apiKey) {
    genAI = new GoogleGenerativeAI(apiKey)
    geminiFlash = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' })
} else {
    console.warn('GEMINI_API_KEY not set - AI features will be disabled')
}

// Export model instances (may be null if API key is missing)
export { geminiFlash, embeddingModel }

// Helper to check if Gemini is available
export function isGeminiAvailable(): boolean {
    return genAI !== null && geminiFlash !== null && embeddingModel !== null
}

