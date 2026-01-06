import { GoogleGenerativeAI } from '@google/generative-ai'
import { getPerformanceContextForGroup } from './performance-group-linking'

const apiKey = process.env.GEMINI_API_KEY

/**
 * Enrich a group name with AI-generated keywords for better semantic search
 * If the group is linked to a performance, uses performance context
 * 
 * @param name - The group name (e.g., "brzytwy" or "School of Rock")
 * @returns Enriched text with keywords
 */
export async function enrichGroupNameForEmbedding(name: string): Promise<string> {
    if (!apiKey) {
        console.warn('GEMINI_API_KEY not set - returning original name')
        return name
    }

    const maxRetries = 3
    let lastError: any = null

    // Check if group is linked to a performance
    const performanceContext = await getPerformanceContextForGroup(name)

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const genAI = new GoogleGenerativeAI(apiKey)
            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

            let prompt: string

            if (performanceContext) {
                // Use performance context for enrichment
                prompt = `Jesteś ekspertem od kategoryzacji przedmiotów teatralnych i rekwizytów.

Grupa przedmiotów "${name}" jest powiązana ze spektaklem:
Tytuł: "${performanceContext.title}"
Opis: "${performanceContext.notes || 'Brak opisu'}"

Wygeneruj 5-10 słów kluczowych które opisują przedmioty z tej grupy, biorąc pod uwagę kontekst spektaklu:
- Typ przedmiotów
- Tematyka spektaklu
- Charakterystyka
- Zastosowanie sceniczne

Odpowiedź w formacie: ${name}: słowo1, słowo2, słowo3, ...

Przykład:
- "School of Rock" (spektakl o rockowym musicallu szkolnym) → "School of Rock: przedmioty ze spektaklu, gitary, mikrofony, instrumenty muzyczne, kostiumy rockowe, sprzęt sceniczny"

Odpowiedź (tylko słowa kluczowe, bez dodatkowych wyjaśnień):`
            } else {
                // Standard enrichment without performance context
                prompt = `Jesteś ekspertem od kategoryzacji przedmiotów teatralnych i rekwizytów.

Dla podanej nazwy grupy przedmiotów, wygeneruj 5-10 słów kluczowych które opisują:
- Typ przedmiotu
- Materiał
- Zastosowanie
- Charakterystykę fizyczną
- Kontekst użycia

Nazwa grupy: "${name}"

Odpowiedź w formacie: nazwa: słowo1, słowo2, słowo3, ...

Przykłady:
- "brzytwy" → "brzytwy: ostre narzędzie, golenie, metalowe, składane, fryzjerskie, niebezpieczne"
- "owoce" → "owoce: jedzenie, dekoracja, kolorowe, świeże, naturalne, organiczne"
- "butelki po winie" → "butelki po winie: szklane, puste, alkohol, dekoracja, pojemniki"

Odpowiedź (tylko słowa kluczowe, bez dodatkowych wyjaśnień):`
            }

            const result = await model.generateContent(prompt)
            const response = result.response.text().trim()

            // Validate response format
            if (response && response.includes(':')) {
                if (performanceContext) {
                    console.log(`✨ Enriched "${name}" with performance context from "${performanceContext.title}"`)
                }
                return response
            }

            // Fallback if format is wrong
            console.warn(`Unexpected AI response format for "${name}": ${response}`)
            return name

        } catch (error: any) {
            lastError = error

            // Check if it's a rate limit error
            if (error?.status === 429) {
                const retryDelay = Math.pow(2, attempt) * 1000 // Exponential backoff: 1s, 2s, 4s
                console.warn(`Rate limit hit for "${name}", retrying in ${retryDelay}ms (attempt ${attempt + 1}/${maxRetries})`)
                await new Promise(resolve => setTimeout(resolve, retryDelay))
                continue
            }

            // For other errors, log and return original name
            console.error('Error enriching group name:', error)
            return name
        }
    }

    // If all retries failed, return original name
    console.error(`Failed to enrich "${name}" after ${maxRetries} attempts:`, lastError)
    return name
}

/**
 * Generate enriched text for a group name (synchronous wrapper for backwards compatibility)
 * Use this when you need to enrich text without async/await
 */
export function getGroupEmbeddingText(name: string): string {
    // For synchronous contexts, just return the name
    // The async enrichment will happen in the embedding generation function
    return name
}
