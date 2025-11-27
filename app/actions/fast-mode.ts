'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

import { geminiFlash } from '@/utils/gemini'
import { generateEmbedding } from '@/utils/embeddings'
import { TaskType } from '@google/generative-ai'
import { Database } from '@/types/supabase'

export async function uploadAndAnalyzeImages(formData: FormData) {
    const supabase = await createClient()
    const images = formData.getAll('images') as File[]
    const locationId = formData.get('locationId') as string
    const groupId = formData.get('groupId') as string | null

    if (!images.length || !locationId) {
        throw new Error('Missing required fields')
    }

    const results = []

    const { data: groups } = await supabase.from('groups').select('id, name')
    const groupsList = groups?.map(g => g.name).join(', ') || ''

    for (const image of images) {
        // 1. Upload to Supabase Storage
        const fileExt = image.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `fast-mode/${fileName}`

        const { error: uploadError } = await supabase.storage
            .from('items')
            .upload(filePath, image)

        if (uploadError) {
            console.error('Upload error:', uploadError)
            continue
        }

        const { data: { publicUrl } } = supabase.storage
            .from('items')
            .getPublicUrl(filePath)

        // 2. AI Analysis with Gemini Vision
        try {
            // Convert file to base64 for Gemini
            const arrayBuffer = await image.arrayBuffer()
            const base64Data = Buffer.from(arrayBuffer).toString('base64')

            const prompt = `
            Przeanalizuj to zdjęcie rekwizytu teatralnego.
            Zidentyfikuj główny obiekt. Zignoruj tło, jeśli to możliwe.
            
            Dostępne kategorie (grupy): ${groupsList}

            Zwróć obiekt JSON z następującymi polami:
            - name: Krótka, opisowa nazwa po polsku (np. "Stara brązowa walizka")
            - description: Szczegółowy opis po polsku uwzględniający materiał, kolor, styl, epokę, stan i cechy charakterystyczne. Pełne zdania, język naturalny.
            - ai_description: Zbiór słów kluczowych i atrybutów oddzielonych przecinkami. Tylko konkretne cechy fizyczne, materiały, style, kolory. Bez zbędnych słów łączących. (np. "walizka, skóra, brązowy, metalowe klamry, vintage, lata 70, zniszczona")
            - tags: Tablica stringów po polsku (np. ["walizka", "vintage", "skóra", "lata 70."])
            - category: Sugerowana nazwa kategorii z listy dostępnych (lub najbardziej pasująca nowa, jeśli żadna nie pasuje).
            - attributes: Obiekt JSON z konkretnymi cechami, np. { "era": "lata 70", "material": "skóra", "color": "brązowy", "condition": "dobry" }. Klucze mogą być po angielsku lub polsku, ale trzymaj się konwencji.
            - confidence: Liczba od 0.0 do 1.0 oznaczająca pewność identyfikacji.

            Output ONLY the JSON object.
            `

            const result = await geminiFlash.generateContent([
                prompt,
                {
                    inlineData: {
                        data: base64Data,
                        mimeType: image.type
                    }
                }
            ])

            // Log Token Usage
            const usage = result.response.usageMetadata
            if (usage) {
                await supabase.from('ai_usage_logs').insert({
                    operation_type: 'fast_add',
                    tokens_input: usage.promptTokenCount,
                    tokens_output: usage.candidatesTokenCount,
                    total_tokens: usage.totalTokenCount,
                    model_name: 'gemini-2.0-flash',
                    details: { fileName }
                })
            }

            const responseText = result.response.text()
            // Clean up code blocks if present
            const jsonString = responseText.replace(/```json\n?|\n?```/g, '').trim()
            const analysis = JSON.parse(jsonString)

            if (analysis.confidence < 0.6) {
                console.warn(`Low confidence (${analysis.confidence}) for image: ${fileName}`)
            }

            // Find matching group
            let matchedGroupId = groupId
            if (!matchedGroupId && analysis.category && groups) {
                const exactMatch = groups.find(g => g.name.toLowerCase() === analysis.category.toLowerCase())
                if (exactMatch) {
                    matchedGroupId = exactMatch.id
                } else {
                    // Simple fuzzy match (case insensitive contains)
                    const fuzzyMatch = groups.find(g => g.name.toLowerCase().includes(analysis.category.toLowerCase()) || analysis.category.toLowerCase().includes(g.name.toLowerCase()))
                    if (fuzzyMatch) {
                        matchedGroupId = fuzzyMatch.id
                    }
                }
            }

            // 3. Generate Embedding
            // Use ai_description for embedding if available, otherwise fallback to name
            const textForEmbedding = analysis.ai_description || analysis.name
            const embedding = await generateEmbedding(textForEmbedding, TaskType.RETRIEVAL_DOCUMENT)

            // 4. Create Draft Item
            const { data: newItem, error: dbError } = await supabase
                .from('items')
                .insert({
                    name: analysis.name,
                    image_url: publicUrl,
                    location_id: locationId,
                    group_id: matchedGroupId || null,
                    status: 'draft' as Database['public']['Enums']['item_status_enum'],
                    notes: analysis.description,
                    ai_description: analysis.ai_description,
                    attributes: analysis.attributes || {},
                    embedding: JSON.stringify(embedding)
                })
                .select()
                .single()

            if (dbError) {
                console.error('Database error:', dbError)
            } else {
                results.push(newItem)
            }

        } catch (error) {
            console.error('AI Processing error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)))
            console.error('AI Processing error:', error)
            // Fallback: Create item without AI data if AI fails
            const { data: newItem } = await supabase
                .from('items')
                .insert({
                    name: `New Item (${new Date().toLocaleTimeString()})`,
                    image_url: publicUrl,
                    location_id: locationId,
                    group_id: groupId || null,
                    status: 'draft' as Database['public']['Enums']['item_status_enum'],
                    notes: "AI Analysis Failed"
                })
                .select()
                .single()

            if (newItem) results.push(newItem)
        }
    }

    revalidatePath('/items')
    revalidatePath('/items/review')

    return { success: true, count: results.length }
}
