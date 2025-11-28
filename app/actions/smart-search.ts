'use server'

import { createClient } from '@/utils/supabase/server'
import { generateEmbedding } from '@/utils/embeddings'
import { geminiFlash } from '@/utils/gemini'
import { TaskType } from '@google/generative-ai'

type AIResultItem = {
    id: string
    name: string
    explanation: string
    matchType: 'exact' | 'close' | 'alternative'
}

export async function smartSearch(query: string) {
    const supabase = await createClient()

    // 1. Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query, TaskType.RETRIEVAL_QUERY)

    // 1.5 Find matching groups
    const { data: groups } = await supabase
        .from('groups')
        .select('id, name, locations(name)')

    // Simple string match for UI chips
    const matchedGroups = groups?.filter(g =>
        g.name.toLowerCase().includes(query.toLowerCase()) ||
        query.toLowerCase().includes(g.name.toLowerCase())
    ).slice(0, 3) || []

    // We pass ALL groups to the AI so it can semantically match (e.g. "syringe" -> "Medical")
    // instead of relying on strict string matching.
    const availableGroups = groups || []

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

    console.log(`Found ${matches?.length || 0} matches for query: "${query}"`)

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
            ...fullItem
        }
    }) || []

    // 3. Use AI Agent to refine and explain results
    // Use ai_description if available, otherwise fallback to notes/name
    const prompt = `
    Użytkownik szuka: "${query}"

    Znaleziono te potencjalne pasujące przedmioty w magazynie:
    ${richMatches.map((m) => `- [ID: ${m.id}] ${m.name} | Cechy: ${m.ai_description || m.notes || ''} (Podobieństwo: ${(m.similarity * 100).toFixed(0)}%)`).join('\n') || 'Brak przedmiotów'}

    Dostępne grupy (kategorie) w magazynie:
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

    let enrichedResults = []
    let suggestion = null

    if (richMatches.length > 0) {
        try {
            const result = await geminiFlash.generateContent(prompt)
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
                    details: { query }
                })
            }

            const jsonString = responseText.replace(/```json\n?|\n?```/g, '').trim()
            const aiResponse = JSON.parse(jsonString)

            suggestion = aiResponse.suggestion

            // Merge AI explanation with original item data
            enrichedResults = aiResponse.results.map((aiItem: AIResultItem) => {
                const originalItem = richMatches.find((m) => m.id === aiItem.id)
                if (!originalItem) return null
                return {
                    ...originalItem,
                    explanation: aiItem.explanation,
                    matchType: aiItem.matchType
                }
            }).filter(Boolean)

        } catch (aiError) {
            console.error('AI Agent error:', aiError)
            // Fallback: Return raw vector matches if AI fails
            enrichedResults = matches
        }
    }

    return { results: enrichedResults, groups: matchedGroups, suggestion }
}
