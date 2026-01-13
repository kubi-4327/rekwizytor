import { GoogleGenerativeAI } from '@google/generative-ai'
import { getPerformanceContextForGroup } from './performance-group-linking'

const geminiKey = process.env.GEMINI_API_KEY
const openaiKey = process.env.OPENAI_API_KEY
const mistralKey = process.env.MISTRAL_API_KEY

export interface GroupEnrichmentResult {
    identity: string
    physical: string
    context: string
}

/**
 * Enrich a group name with AI-generated keywords segments for Multi-Vector Search
 * 
 * @param name - The group name
 * @param enrichmentModel - The AI model to use for enrichment (default: gemini-2.0-flash-exp)
 * @returns Structured enrichment data (identity, physical, context)
 */
export async function enrichGroupNameForEmbedding(
    name: string,
    enrichmentModel: string = 'gemini-2.0-flash-exp'
): Promise<GroupEnrichmentResult> {
    const fallbackResult: GroupEnrichmentResult = {
        identity: name,
        physical: '',
        context: ''
    }

    const maxRetries = 3
    let lastError: any = null

    // Check if group is linked to a performance
    const performanceContext = await getPerformanceContextForGroup(name)

    // Determine provider from model name
    const provider = enrichmentModel.includes('gpt') ? 'openai' :
        enrichmentModel.includes('mistral') ? 'mistral' : 'gemini'

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            let enriched: GroupEnrichmentResult

            // Route to appropriate provider
            switch (provider) {
                case 'openai':
                    enriched = await enrichWithOpenAI(name, enrichmentModel, performanceContext)
                    break
                case 'mistral':
                    enriched = await enrichWithMistral(name, enrichmentModel, performanceContext)
                    break
                case 'gemini':
                default:
                    enriched = await enrichWithGemini(name, enrichmentModel, performanceContext)
                    break
            }

            console.log(`✅ [ENRICH] Success for "${name}" using ${provider}`)
            if (performanceContext) {
                console.log(`✨ Enriched "${name}" with performance context`)
            }
            return enriched

        } catch (e) {
            lastError = e
            console.error(`❌ [ENRICH] Attempt ${attempt + 1}/${maxRetries} failed:`, e)

            if (attempt < maxRetries - 1) {
                const delay = 1000 * (attempt + 1)
                await new Promise(resolve => setTimeout(resolve, delay))
            }
        }
    }

    console.error(`❌ [ENRICH] All attempts failed for "${name}". Using fallback.`)
    return fallbackResult
}

// Helper: Enrich with Gemini
async function enrichWithGemini(
    name: string,
    model: string,
    performanceContext: any
): Promise<GroupEnrichmentResult> {
    if (!geminiKey) throw new Error('GEMINI_API_KEY not set')

    const genAI = new GoogleGenerativeAI(geminiKey)
    const geminiModel = genAI.getGenerativeModel({
        model: model,
        generationConfig: {
            // responseMimeType: "application/json", // Disable strict JSON to avoid early stops/loops
            maxOutputTokens: 8192
        }
    })

    const prompt = buildPrompt(name, performanceContext)
    const result = await geminiModel.generateContent(prompt)
    const response = result.response
    const responseText = response.text().trim()

    // Debug finish reason
    if (response.candidates && response.candidates.length > 0) {
        const candidate = response.candidates[0]
        console.log(`🏁 [Gemini] Finish Reason: ${candidate.finishReason}`)
        if (candidate.finishReason !== "STOP") {
            console.warn(`⚠️ [Gemini] Abnormal finish! Reason: ${candidate.finishReason}`)
            console.warn(`⚠️ [Gemini] Safety Ratings:`, candidate.safetyRatings)
        }
    }

    console.log(`📄 [Gemini] Response preview: ${responseText.substring(0, 100)}...`)

    return parseEnrichmentResponse(responseText, name)
}

// Helper: Enrich with OpenAI
async function enrichWithOpenAI(
    name: string,
    model: string,
    performanceContext: any
): Promise<GroupEnrichmentResult> {
    if (!openaiKey) throw new Error('OPENAI_API_KEY not set')

    const prompt = buildPrompt(name, performanceContext)

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
            model: model,
            messages: [
                { role: 'system', content: 'You are a theater props expert. Always respond with valid JSON.' },
                { role: 'user', content: prompt }
            ],
            response_format: { type: 'json_object' },
            max_completion_tokens: 4096,
            reasoning_effort: "low",
            temperature: 1
        })
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(`OpenAI API error: ${JSON.stringify(error)}`)
    }

    const result = await response.json()
    console.log(`📦 [OpenAI] Full api response:`, JSON.stringify(result, null, 2))

    const responseText = result.choices?.[0]?.message?.content?.trim() || ''

    console.log(`📄 [OpenAI] Response preview: ${responseText.substring(0, 100)}...`)

    return parseEnrichmentResponse(responseText, name)
}

// Helper: Enrich with Mistral
async function enrichWithMistral(
    name: string,
    model: string,
    performanceContext: any
): Promise<GroupEnrichmentResult> {
    if (!mistralKey) throw new Error('MISTRAL_API_KEY not set')

    const prompt = buildPrompt(name, performanceContext)

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mistralKey}`
        },
        body: JSON.stringify({
            model: model,
            messages: [
                { role: 'system', content: 'You are a theater props expert. Always respond with valid JSON.' },
                { role: 'user', content: prompt }
            ],
            response_format: { type: 'json_object' },
            max_tokens: 1024,
            temperature: 0.7
        })
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(`Mistral API error: ${JSON.stringify(error)}`)
    }

    const result = await response.json()
    const responseText = result.choices[0].message.content.trim()

    console.log(`📄 [Mistral] Response preview: ${responseText.substring(0, 100)}...`)

    return parseEnrichmentResponse(responseText, name)
}

// Helper: Build prompt (shared across providers)
function buildPrompt(name: string, performanceContext: any): string {
    if (performanceContext) {
        return `Jesteś ekspertem od kategoryzacji rekwizytów teatralnych.
                
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
        return `Jesteś starym rekwizytorem teatralnym. Twoim zadaniem jest opisanie przedmiotu "${name}" dla systemu wyszukiwania.

Rozdziel opis na 3 kategorie:

1. IDENTITY: Co to jest? Synonimy, kategorie, alternatywne nazwy.
   Przykład dla "brzytwa": "brzytwa, golarka, nóż fryzjerski, ostrze do golenia"

2. PHYSICAL: Cechy fizyczne - materiał, kolor, rozmiar, stan.
   Przykład: "metalowa, stalowa, ostra, składana, srebrna"
   WAŻNE: Tylko przymiotniki!

3. CONTEXT: Gdzie/kiedy/przez kogo używane? Skojarzenia, miejsca, zawody, epoki.
   Przykład: "fryzjer, salon, łazienka, golenie, retro, męskie, vintage"
   WAŻNE: Różnorodne słowa kluczowe, BEZ powtórzeń typu "do X" i "używane do X" - wybierz jedną formę!

Wygeneruj JSON dla: "${name}"

{
  "identity": "...",
  "physical": "...",
  "context": "..."
}`
    }
}

// Helper: Parse and validate enrichment response
function parseEnrichmentResponse(responseText: string, name: string): GroupEnrichmentResult {
    // Extract JSON from markdown code blocks if present
    let cleanText = responseText.trim()

    console.log(`🔍 [ENRICH] Raw response length: ${cleanText.length}`)

    // Try to extract from markdown code block first
    const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i
    const codeBlockMatch = cleanText.match(codeBlockRegex)
    if (codeBlockMatch) {
        cleanText = codeBlockMatch[1].trim()
        console.log(`📝 [ENRICH] Extracted from markdown block`)
    }

    // Remove any text before the first { or [
    const jsonStart = cleanText.search(/[\{\[]/)

    if (jsonStart === -1) {
        console.error(`❌ [ENRICH] No JSON start ({ or [) found. Response: ${cleanText.substring(0, 100)}`)
        throw new Error('No JSON object found in response')
    }

    if (jsonStart > 0) {
        cleanText = cleanText.substring(jsonStart)
        console.log(`✂️ [ENRICH] Trimmed ${jsonStart} chars before JSON`)
    }

    // Remove any text after the last } or ]
    const jsonEnd = cleanText.lastIndexOf('}')
    const jsonEndArray = cleanText.lastIndexOf(']')
    const actualEnd = Math.max(jsonEnd, jsonEndArray)

    if (actualEnd > -1 && actualEnd < cleanText.length - 1) {
        cleanText = cleanText.substring(0, actualEnd + 1)
        console.log(`✂️ [ENRICH] Trimmed ${cleanText.length - actualEnd - 1} chars after JSON`)
    }

    // console.log(`📦 [ENRICH] Clean JSON preview: ${cleanText.substring(0, 100)}...`)

    let parsed
    try {
        parsed = JSON.parse(cleanText)
    } catch (e) {
        console.error(`❌ [ENRICH] JSON Parse Error. Text preview: ${cleanText.substring(0, 100)}...`)
        throw e
    }

    // Handle case when AI returns array instead of object
    if (Array.isArray(parsed) && parsed.length > 0) {
        parsed = parsed[0]
        console.log(`📦 [ENRICH] Unwrapped array response`)
    }

    // Validate structure
    if (parsed.identity || parsed.physical || parsed.context) {
        return {
            identity: parsed.identity || name,
            physical: parsed.physical || '',
            context: parsed.context || ''
        }
    } else {
        throw new Error('Missing required fields in response')
    }
}
