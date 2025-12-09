'use server'

import { createClient } from '@/utils/supabase/server'
import { generateEmbedding } from '@/utils/embeddings'
import { geminiFlash } from '@/utils/gemini'
import { TaskType } from '@google/generative-ai'
import { sanitizeAIInput, validateAIResponse, SmartSearchResultSchema, sanitizeAIOutput } from '@/utils/ai-security'

type AIResultItem = {
    id: string
    name: string
    explanation: string
    matchType: 'exact' | 'close' | 'alternative'
}

export async function smartSearch(query: string) {
    const supabase = await createClient()

    // 1. SANITIZE INPUT
    const sanitizedQuery = sanitizeAIInput(query, 500)

    // 1. Generate embedding for the query
    const queryEmbedding = await generateEmbedding(sanitizedQuery, TaskType.RETRIEVAL_QUERY)

    // 1.5 Find matching groups
    const { data: groups } = await supabase
        .from('groups')
        .select('id, name, locations(name)')

    // Simple string match for UI chips
    const matchedGroups = groups?.filter(g =>
        g.name.toLowerCase().includes(sanitizedQuery.toLowerCase()) ||
        sanitizedQuery.toLowerCase().includes(g.name.toLowerCase())
    ).slice(0, 3) || []

    // We pass limited groups to the AI to avoid huge prompts
    const availableGroups = groups?.slice(0, 50) || []

    // 2. Find similar items using vector search
    const { data: matches, error } = await supabase.rpc('match_items', {
        query_embedding: JSON.stringify(queryEmbedding),
        match_threshold: 0.4, // Lowered threshold for better recall
        match_count: 15
    })

    if (error) {
        console.error('Vector search error:', error)
        return { error: 'Search failed' }
    }

    console.log(`Found ${matches?.length || 0} matches for query: "${sanitizedQuery}"`)

    if ((!matches || matches.length === 0) && availableGroups.length === 0) {
        return { message: "Nie znaleziono pasujących przedmiotów ani grup." }
    }

    // Fetch full item details to get ai_description
    const matchIds = matches?.map((m) => m.id) || []
    const { data: fullItems } = await supabase
        .from('items')
        .select('*')
        .in('id', matchIds)

    const richMatches = matches?.map((match) => {
        const fullItem = fullItems?.find(item => item.id === match.id)
        return {
            ...match,
            ...fullItem,
            entity_type: 'item' as const // Force entity_type for SearchResult compatibility
        }
    }) || []

    // 3. Use AI Agent to refine and explain results
    // Use ai_description if available, otherwise fallback to notes/name
    const prompt = `
    Użytkownik szuka: "${sanitizedQuery}"

    Znaleziono te potencjalne pasujące przedmioty w magazynie:
    ${richMatches.map((m) => `- [ID: ${m.id}] ${m.name} | Cechy: ${m.ai_description || m.notes || ''} (Podobieństwo: ${(m.similarity * 100).toFixed(0)}%)`).join('\n') || 'Brak przedmiotów'}

    Dostępne grupy (kategorie) w magazynie (top 50):
    ${availableGroups.map((g: { name: string, locations: { name: string } | null }) => `- ${g.name} (Lokalizacja: ${g.locations?.name || 'Nieznana'})`).join('\n') || 'Brak grup'}

    Zadanie:
    1. Wybierz najlepsze dopasowania (maksymalnie 3).
    2. Wyjaśnij DLACZEGO każdy przedmiot pasuje do zapytania użytkownika. Wyjaśnienie musi być BARDZO KRÓTKIE (maksymalnie jedno zdanie).
    3. Jeśli nie znaleziono idealnych dopasowań, zasugeruj kategorię (grupę) lub lokalizację, gdzie użytkownik może szukać. Wybierz NAJBARDZIEJ PASUJĄCĄ grupę z listy "Dostępne grupy".

    Format wyjściowy:
    Zwróć obiekt JSON z tablicą "results" oraz polem "suggestion" (opcjonalnie).
    
    "results": [
        {
            "id": "UUID",
            "name": "Nazwa",
            "explanation": "Wyjaśnienie",
            "matchType": "exact" | "close" | "alternative"
        }
    ]
    "suggestion": "Jeśli brak dobrych wyników, napisz tutaj sugestię, np. 'Nie znalazłem strzykawki, ale sprawdź w grupie Medyczne (Lokalizacja: Strych).'" (string lub null)

    Output ONLY the JSON object.
    `

    let enrichedResults: any[] = []
    let suggestion = null

    if (richMatches.length > 0) {
        try {
            // 15 seconds timeout for AI generation
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('AI generation timed out')), 15000)
            )

            if (!geminiFlash) {
                throw new Error('Gemini AI not available - GEMINI_API_KEY may be missing')
            }

            const generationPromise = geminiFlash.generateContent(prompt)

            const result: any = await Promise.race([generationPromise, timeoutPromise])

            const responseText = result.response.text()
            console.log('AI Response:', responseText) // Debug log

            // Log Token Usage
            const usage = result.response.usageMetadata
            if (usage) {
                await supabase.from('ai_usage_logs').insert({
                    operation_type: 'smart_search',
                    tokens_input: usage.promptTokenCount,
                    tokens_output: usage.candidatesTokenCount,
                    total_tokens: usage.totalTokenCount,
                    model_name: 'gemini-2.0-flash',
                    details: { query: sanitizedQuery }
                })
            }

            // More robust JSON extraction
            const jsonStart = responseText.indexOf('{')
            const jsonEnd = responseText.lastIndexOf('}')
            let jsonString = ''

            if (jsonStart !== -1 && jsonEnd !== -1) {
                jsonString = responseText.substring(jsonStart, jsonEnd + 1)
            } else {
                jsonString = responseText.replace(/```json\n?|\n?```/g, '').trim()
            }

            const rawResponse = JSON.parse(jsonString)

            // 2. VALIDATE OUTPUT
            const aiResponse = validateAIResponse(rawResponse, SmartSearchResultSchema)

            suggestion = aiResponse.suggestion ? sanitizeAIOutput(aiResponse.suggestion) : null

            // Merge AI explanation with original item data
            enrichedResults = aiResponse.results.map((aiItem) => {
                const originalItem = richMatches.find((m) => m.id === aiItem.id)
                if (!originalItem) return null
                return {
                    ...originalItem,
                    explanation: sanitizeAIOutput(aiItem.explanation), // 3. SANITIZE OUTPUT TEXT
                    matchType: aiItem.matchType
                }
            }).filter(Boolean)

        } catch (aiError) {
            console.error('AI Agent error:', aiError)
            // Fallback: Return raw vector matches (rich data) if AI fails
            enrichedResults = richMatches
            suggestion = "AI nie odpowiedziało w czasie, wyświetlam wyniki surowe."
        }
    }

    return { results: enrichedResults, groups: matchedGroups, suggestion }
}
