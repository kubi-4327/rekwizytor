'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

import { geminiFlash } from '@/utils/gemini'
import { sanitizeAIInput, validateAIResponse, FastModeSchema, sanitizeAIOutput } from '@/utils/ai-security'
import { Database } from '@/types/supabase'

export async function uploadAndAnalyzeImages(formData: FormData) {
    const supabase = await createClient()
    const images = formData.getAll('images') as File[]
    const thumbnails = formData.getAll('thumbnails') as File[]
    const performanceId = formData.get('performanceId') as string | null

    if (!images.length || !performanceId) {
        throw new Error('Missing required fields: performanceId and images are required now.')
    }

    const results = []

    for (let i = 0; i < images.length; i++) {
        const image = images[i]
        const thumbnail = thumbnails[i]

        // 1. Upload to Supabase Storage
        const fileExt = image.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `fast-mode/${fileName}`
        const thumbPath = `fast-mode/thumb_${fileName}`

        const { error: uploadError } = await supabase.storage
            .from('items') // Keeping the bucket name 'items' as it likely still exists
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
        }

        const { data: { publicUrl } } = supabase.storage
            .from('items')
            .getPublicUrl(filePath)

        // 2. AI Analysis with Gemini Vision
        try {
            const arrayBuffer = await image.arrayBuffer()
            const base64Data = Buffer.from(arrayBuffer).toString('base64')

            const prompt = `
            Przeanalizuj to zdjęcie rekwizytu teatralnego.
            Zidentyfikuj główny obiekt. Zignoruj tło, jeśli to możliwe.
            
            Zwróć obiekt JSON z następującymi polami:
            - name: Krótka, opisowa nazwa po polsku (np. "Stara brązowa walizka")
            - description: Szczegółowy opis po polsku uwzględniający materiał, kolor, styl, epokę, stan i cechy charakterystyczne. Pełne zdania, język naturalny.
            - ai_description: Zbiór słów kluczowych i atrybutów oddzielonych przecinkami. Tylko konkretne cechy fizyczne, materiały, style, kolory. Bez zbędnych słów łączących. (np. "walizka, skóra, brązowy, metalowe klamry, vintage, lata 70, zniszczona")
            - tags: Tablica stringów po polsku (np. ["walizka", "vintage", "skóra", "lata 70."])
            - category: Sugerowana nazwa kategorii.
            - attributes: Obiekt JSON z konkretnymi cechami, np. { "era": "lata 70", "material": "skóra", "color": "brązowy", "condition": "dobry" }.
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
            const jsonString = responseText.replace(/```json\n?|\n?```/g, '').trim()
            const rawAnalysis = JSON.parse(jsonString)

            const validatedAnalysis = validateAIResponse(rawAnalysis, FastModeSchema)
            const analysis = {
                ...validatedAnalysis,
                name: sanitizeAIOutput(validatedAnalysis.name),
            }

            // 4. Create Prop in Performance
            const { data: newProp, error: dbError } = await supabase
                .from('performance_props')
                .insert({
                    performance_id: performanceId,
                    item_name: analysis.name,
                    image_url: publicUrl,
                    is_checked: false,
                    // Note: attributes and description are lost for now unless we add more columns
                })
                .select()
                .single()

            if (dbError) {
                console.error('Database error:', dbError)
            } else {
                results.push(newProp)
            }

        } catch (error) {
            console.error('AI Processing error:', error)
            // Fallback: Create prop without AI data
            const { data: newProp } = await supabase
                .from('performance_props')
                .insert({
                    performance_id: performanceId,
                    item_name: `Nowy rekwizyt (${new Date().toLocaleTimeString()})`,
                    image_url: publicUrl,
                    is_checked: false
                })
                .select()
                .single()

            if (newProp) {
                results.push(newProp)
            }
        }
    }

    revalidatePath(`/performances/${performanceId}`)
    revalidatePath(`/performances/${performanceId}/props`)

    return { success: true, count: results.length }
}
