'use server'

import { createClient } from '@/utils/supabase/server'
import { geminiFlash } from '@/utils/gemini'
import { generateEmbedding } from '@/utils/embeddings'
import { TaskType } from '@google/generative-ai'
import { Database } from '@/types/supabase'

export async function generateItemDescriptions(itemId: string, currentName: string, currentNotes?: string | null, imageUrl?: string | null) {
    const supabase = await createClient()

    try {
        let prompt = ''
        let contentParts: (string | { inlineData: { data: string; mimeType: string } })[] = []
        let source = 'name' // name, notes, or image

        // 1. Prioritize User Description (Notes) if available
        if (currentNotes && currentNotes.trim().length > 5) {
            source = 'notes'
            prompt = `
            Przeanalizuj poniższy opis rekwizytu teatralnego (Nazwa: "${currentName}").
            Opis użytkownika: "${currentNotes}"

            Twoim zadaniem jest wygenerowanie metadanych dla inteligentnego wyszukiwania na podstawie tego opisu.
            
            Zwróć obiekt JSON z następującymi polami:
            - ai_description: Zbiór słów kluczowych i atrybutów oddzielonych przecinkami. Tylko konkretne cechy fizyczne, materiały, style, kolory. (np. "walizka, skóra, brązowy, vintage")
            - attributes: Obiekt JSON z konkretnymi cechami wyciągniętymi z opisu (np. era, materiał, kolor).
            
            Nie generuj pola 'description', ponieważ użyjemy istniejącego opisu użytkownika.

            Output ONLY the JSON object.
            `

            // If image is also present, we can add it for context, but primarily rely on text for specific attributes mentioned by user
            if (imageUrl) {
                const response = await fetch(imageUrl)
                const arrayBuffer = await response.arrayBuffer()
                const base64Data = Buffer.from(arrayBuffer).toString('base64')
                const mimeType = response.headers.get('content-type') || 'image/jpeg'

                contentParts = [
                    prompt + "\n(Załączam też zdjęcie pomocniczo, ale priorytet ma opis tekstowy użytkownika).",
                    { inlineData: { data: base64Data, mimeType } }
                ]
            } else {
                contentParts = [prompt]
            }

        }
        // 2. Use Image if no notes
        else if (imageUrl) {
            source = 'image'
            // Fetch image and convert to base64
            const response = await fetch(imageUrl)
            const arrayBuffer = await response.arrayBuffer()
            const base64Data = Buffer.from(arrayBuffer).toString('base64')
            const mimeType = response.headers.get('content-type') || 'image/jpeg'

            prompt = `
            Przeanalizuj to zdjęcie rekwizytu teatralnego (Nazwa robocza: "${currentName}").
            
            Zwróć obiekt JSON z następującymi polami:
            - description: Szczegółowy opis po polsku uwzględniający materiał, kolor, styl, epokę, stan i cechy charakterystyczne. Pełne zdania, język naturalny.
            - ai_description: Zbiór słów kluczowych i atrybutów oddzielonych przecinkami. Tylko konkretne cechy fizyczne, materiały, style, kolory.
            - attributes: Obiekt JSON z konkretnymi cechami.
            
            Output ONLY the JSON object.
            `

            contentParts = [
                prompt,
                {
                    inlineData: {
                        data: base64Data,
                        mimeType: mimeType
                    }
                }
            ]
        }
        // 3. Fallback to Name
        else {
            source = 'name'
            prompt = `
            Jesteś ekspertem od rekwizytów teatralnych.
            Wygeneruj opis dla przedmiotu o nazwie: "${currentName}".
            
            Zwróć obiekt JSON z następującymi polami:
            - description: Szczegółowy, prawdopodobny opis po polsku.
            - ai_description: Zbiór słów kluczowych i atrybutów oddzielonych przecinkami.
            - attributes: Obiekt JSON z typowymi cechami.

            Output ONLY the JSON object.
            `
            contentParts = [prompt]
        }

        const result = await geminiFlash.generateContent(contentParts)
        const responseText = result.response.text()

        // Log Token Usage
        const usage = result.response.usageMetadata
        if (usage) {
            await supabase.from('ai_usage_logs').insert({
                operation_type: 'generate_description',
                tokens_input: usage.promptTokenCount,
                tokens_output: usage.candidatesTokenCount,
                total_tokens: usage.totalTokenCount,
                model_name: 'gemini-2.0-flash',
                details: { itemId, itemName: currentName, source }
            })
        }

        const jsonString = responseText.replace(/```json\n?|\n?```/g, '').trim()
        const analysis = JSON.parse(jsonString)

        // Generate Embedding from new AI description
        // If we used existing notes, analysis.description might be undefined, so use currentNotes
        const descriptionToEmbed = analysis.ai_description || analysis.description || currentNotes || currentName
        const embedding = await generateEmbedding(descriptionToEmbed, TaskType.RETRIEVAL_DOCUMENT)

        // Prepare update object
        const updateData: Database['public']['Tables']['items']['Update'] = {
            ai_description: analysis.ai_description,
            attributes: analysis.attributes,
            embedding: JSON.stringify(embedding)
        }

        // Only update notes if we generated them (i.e. source was NOT 'notes')
        if (source !== 'notes' && analysis.description) {
            updateData.notes = analysis.description
        }

        // Update item in database
        const { error } = await supabase
            .from('items')
            .update(updateData)
            .eq('id', itemId)

        if (error) throw error

        return { success: true, data: { ...analysis, source } }

    } catch (error) {
        console.error('Error generating descriptions:', error)
        return { error: 'Failed to generate descriptions' }
    }
}
