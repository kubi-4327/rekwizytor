'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

import { geminiFlash } from '@/utils/gemini'
import { sanitizeAIInput, validateAIResponse, FastModeSchema, sanitizeAIOutput } from '@/utils/ai-security'
import { generateEmbedding } from '@/utils/embeddings'
import { TaskType } from '@google/generative-ai'
import { Database } from '@/types/supabase'

export async function uploadAndAnalyzeImages(formData: FormData) {
    const supabase = await createClient()
    const images = formData.getAll('images') as File[]
    const thumbnails = formData.getAll('thumbnails') as File[]
    const locationId = formData.get('locationId') as string | null
    const groupId = formData.get('groupId') as string | null
    const performanceId = formData.get('performanceId') as string | null

    if (!images.length || (!locationId && !performanceId)) {
        throw new Error('Missing required fields')
    }

    const results = []

    const { data: groups } = await supabase.from('groups').select('id, name')
    const groupsList = groups?.map(g => g.name).join(', ') || ''

    for (let i = 0; i < images.length; i++) {
        const image = images[i]
        const thumbnail = thumbnails[i]

        // 1. Upload to Supabase Storage
        const fileExt = image.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `fast-mode/${fileName}`
        const thumbPath = `fast-mode/thumb_${fileName}`

        const { error: uploadError } = await supabase.storage
            .from('items')
            .upload(filePath, image)

        if (uploadError) {
            console.error('Upload error:', uploadError)
            continue
        }

        const { error: thumbUploadError } = await supabase.storage
            .from('items')
            .upload(thumbPath, thumbnail)

        if (thumbUploadError) {
            console.error('Thumbnail upload error:', thumbUploadError)
            // Continue without thumbnail? Or fail? Let's continue.
        }

        const { data: { publicUrl } } = supabase.storage
            .from('items')
            .getPublicUrl(filePath)

        const { data: { publicUrl: thumbnailUrl } } = supabase.storage
            .from('items')
            .getPublicUrl(thumbPath)

        // 2. AI Analysis with Gemini Vision
        try {
            // Convert file to base64 for Gemini
            const arrayBuffer = await image.arrayBuffer()
            const base64Data = Buffer.from(arrayBuffer).toString('base64')

            // 1. SANITIZE INPUTS
            // fileName is used in logging, safe to keep as is or sanitize if displayed
            const safeGroups = sanitizeAIInput(groupsList, 1000)

            const prompt = `
            Przeanalizuj to zdjęcie rekwizytu teatralnego.
            Zidentyfikuj główny obiekt. Zignoruj tło, jeśli to możliwe.
            
            Dostępne kategorie (grupy): ${safeGroups}

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

            if (!geminiFlash) {
                throw new Error('Gemini AI not available - GEMINI_API_KEY may be missing')
            }

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
            const rawAnalysis = JSON.parse(jsonString)

            // 2. VALIDATE OUTPUT
            const validatedAnalysis = validateAIResponse(rawAnalysis, FastModeSchema)

            // 3. SANITIZE OUTPUT TEXT
            const analysis = {
                ...validatedAnalysis,
                name: sanitizeAIOutput(validatedAnalysis.name),
                description: sanitizeAIOutput(validatedAnalysis.description),
                ai_description: sanitizeAIOutput(validatedAnalysis.ai_description),
                category: validatedAnalysis.category ? sanitizeAIOutput(validatedAnalysis.category) : undefined,
                tags: validatedAnalysis.tags.map(t => sanitizeAIOutput(t)),
                // attributes are JSON
            }

            if (analysis.confidence < 0.6) {
                console.warn(`Low confidence (${analysis.confidence}) for image: ${fileName}`)
            }

            // Find matching group
            let matchedGroupId = groupId
            if (!matchedGroupId && analysis.category && groups) {
                let matchedGroup = groups.find(g => g.name.toLowerCase() === (analysis.category?.toLowerCase() || ''))
                if (matchedGroup) {
                    matchedGroupId = matchedGroup.id
                } else {
                    // Simple fuzzy match (case insensitive contains)
                    const fuzzyMatch = groups.find(g => g.name.toLowerCase().includes(analysis.category?.toLowerCase() || '') || (analysis.category?.toLowerCase() || '').includes(g.name.toLowerCase()))
                    if (fuzzyMatch) {
                        matchedGroupId = fuzzyMatch.id
                        matchedGroup = fuzzyMatch // Assign fuzzy match to matchedGroup for later use
                    }
                }

                // If no group was found, create a new one
                if (!matchedGroup && analysis.category) {
                    const { data: newGroup } = await supabase
                        .from('groups')
                        .insert({ name: analysis.category })
                        .select()
                        .single()
                    if (newGroup) {
                        matchedGroupId = newGroup.id

                        // Generate embedding for the new group in background
                        import('./generate-group-embeddings').then(({ generateGroupEmbedding }) => {
                            generateGroupEmbedding(newGroup.id).catch(err =>
                                console.error('Failed to generate group embedding:', err)
                            )
                        })
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
                    thumbnail_url: thumbnailUrl,
                    location_id: locationId || null,
                    group_id: matchedGroupId || null,
                    status: 'draft' as Database['public']['Enums']['item_status_enum'],
                    notes: analysis.description,
                    ai_description: analysis.ai_description,
                    attributes: analysis.attributes as any || {},
                    embedding: JSON.stringify(embedding),
                    performance_status: performanceId ? 'active' : 'unassigned'
                })
                .select()
                .single()

            if (dbError) {
                console.error('Database error:', dbError)
            } else {
                results.push(newItem)

                // If performanceId is present, link item to performance
                if (performanceId && newItem) {
                    const { error: linkError } = await supabase
                        .from('performance_items')
                        .insert({
                            performance_id: performanceId,
                            item_id: newItem.id,
                            notes_snapshot: newItem.notes,
                            item_name_snapshot: newItem.name,
                            image_url_snapshot: newItem.image_url
                        })

                    if (linkError) {
                        console.error('Failed to link item to performance:', linkError)
                    }
                }
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
                    location_id: locationId || null,
                    group_id: groupId || null,
                    status: 'draft' as Database['public']['Enums']['item_status_enum'],
                    notes: "AI Analysis Failed",
                    performance_status: performanceId ? 'active' : 'unassigned'
                })
                .select()
                .single()

            if (newItem) {
                results.push(newItem)

                // If performanceId is present, link item to performance (fallback case)
                if (performanceId) {
                    await supabase
                        .from('performance_items')
                        .insert({
                            performance_id: performanceId,
                            item_id: newItem.id,
                            image_url_snapshot: newItem.image_url
                        })
                }
            }
        }
    }

    revalidatePath('/items')
    revalidatePath('/items/review')

    return { success: true, count: results.length }
}
