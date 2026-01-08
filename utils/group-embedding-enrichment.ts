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
export interface GroupEnrichmentResult {
    identity: string
    physical: string
    context: string
}

/**
 * Enrich a group name with AI-generated keywords segments for Multi-Vector Search
 * 
 * @param name - The group name
 * @returns Structured enrichment data (identity, physical, context)
 */
export async function enrichGroupNameForEmbedding(name: string): Promise<GroupEnrichmentResult> {
    const fallbackResult: GroupEnrichmentResult = {
        identity: name,
        physical: '',
        context: ''
    }

    if (!apiKey) {
        console.warn('GEMINI_API_KEY not set - returning original name')
        return fallbackResult
    }

    const maxRetries = 3
    let lastError: any = null

    // Check if group is linked to a performance
    const performanceContext = await getPerformanceContextForGroup(name)

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const genAI = new GoogleGenerativeAI(apiKey)
            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp', generationConfig: { responseMimeType: "application/json" } })

            let prompt: string

            if (performanceContext) {
                // Performance-aware enrichment
                prompt = `Jesteś ekspertem od kategoryzacji rekwizytów teatralnych.
                
Grupa: "${name}"
Spektakl: "${performanceContext.title}" (${performanceContext.notes || ''})

ZADANIE: Wygeneruj słowa kluczowe w 3 kategoriach (JSON).

1. IDENTITY (Tożsamość): Co to jest? Synonimy, nazwy.
2. PHYSICAL (Fizyczne): Materiał, cechy (ostre, drewniane), kolor, stan.
3. CONTEXT (Kontekst): Użycie w tym spektaklu, epoka, miejsce, skojarzenia.

Odpowiedz TYLKO JSON:
{
  "identity": "string",
  "physical": "string",
  "context": "string"
}`
            } else {
                // Standard enrichment
                prompt = `Jesteś starym rekwizytorem teatralnym. Twoim zadaniem jest opisanie przedmiotu "${name}" dla systemu wyszukiwania.

Musisz rozdzielić opis na 3 precyzyjne kategorie, aby uniknąć błędów wyszukiwania (np. żeby "ostre" nie szukało owoców w kuchni).

KATEGORIE:
1. IDENTITY (Tożsamość): Co to dokładnie jest? Synonimy, nazwy, kategoria główna.
   (np. "Brzytwa: brzytwa, nóż fryzjerski, golarka, ostrze")

2. PHYSICAL (Styl/Fizyczne): Cechy widoczne i namacalne. Materiał, stan, cechy fizyczne.
   (np. "Fizyczne: metalowe, ostre, stalowe, srebrne, składane, zardzewiałe")
   WAŻNE: Tu wpisuj przymiotniki (drewniany, szklany, ostry).

3. CONTEXT (Kontekst/Użycie): Gdzie to występuje? Do czego służy? KONIECZNIE dodaj frazy z "do" i "używane do".
   (np. "Kontekst: fryzjer, salon, golenie, DO GOLENIA, UŻYWANE DO GOLENIA, UŻYWANE PRZEZ FRYZJERA, łazienka, męskie, retro")
   WAŻNE: Dodaj frazy akcji/celu: "do X", "używane do X", "służy do X", "potrzebne do X".

ZADANIE: Wygeneruj JSON dla grupy: "${name}"

Format odpowiedzi JSON:
{
  "identity": "...",
  "physical": "...",
  "context": "..."
}`
            }

            const result = await model.generateContent(prompt)
            const responseText = result.response.text().trim()

            try {
                // Parse JSON response
                const parsed = JSON.parse(responseText)

                // Validate structure
                if (parsed.identity || parsed.physical || parsed.context) {
                    const enriched: GroupEnrichmentResult = {
                        identity: parsed.identity || name,
                        physical: parsed.physical || '',
                        context: parsed.context || ''
                    }
                    if (performanceContext) {
                        console.log(`✨ Enriched "${name}" (MV) with performance context`)
                    }
                    return enriched
                }
            } catch (e) {
                console.warn(`Failed to parse JSON for "${name}": ${responseText}`)
            }

            // Fallback for this attempt
            console.warn(`Invalid AI response format for "${name}"`)

        } catch (error: any) {
            lastError = error

            // Check if it's a rate limit error
            if (error?.status === 429) {
                const retryDelay = Math.pow(2, attempt) * 1000 // Exponential backoff: 1s, 2s, 4s
                console.warn(`Rate limit hit for "${name}", retrying in ${retryDelay}ms (attempt ${attempt + 1}/${maxRetries})`)
                await new Promise(resolve => setTimeout(resolve, retryDelay))
                continue
            }

            console.error('Error enriching group name:', error)
        }
    }

    // If all retries failed, return fallback
    console.error(`Failed to enrich "${name}" after ${maxRetries} attempts:`, lastError)
    return fallbackResult
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
