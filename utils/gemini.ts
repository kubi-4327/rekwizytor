import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai'

// Gracefully handle missing API key - don't crash at import time
const apiKey = process.env.GEMINI_API_KEY

let genAI: GoogleGenerativeAI | null = null
let geminiFlash: GenerativeModel | null = null
let geminiFlashLite: GenerativeModel | null = null
let embeddingModel: GenerativeModel | null = null

if (apiKey) {
    genAI = new GoogleGenerativeAI(apiKey)

    // Legacy model (kept for backwards compatibility)
    geminiFlash = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    // Recommended: Fastest and cheapest model for simple tasks
    geminiFlashLite = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })

    embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' })
} else {
    console.warn('GEMINI_API_KEY not set - AI features will be disabled')
}

// Export model instances (may be null if API key is missing)
export { geminiFlash, geminiFlashLite, embeddingModel }

// Helper to check if Gemini is available
export function isGeminiAvailable(): boolean {
    return genAI !== null && geminiFlash !== null && embeddingModel !== null
}


