'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { analyzeItemWithGemini } from './generate-description'
import { generateEmbedding } from '@/utils/embeddings'
import { TaskType } from '@google/generative-ai'
import { Database } from '@/types/supabase'

export async function createItem(formData: FormData) {
    const supabase = await createClient()

    const name = formData.get('name') as string
    const notes = formData.get('notes') as string | null
    const groupId = formData.get('group_id') as string | null
    const locationId = formData.get('location_id') as string | null
    const imageFile = formData.get('image') as File | null
    const isDraft = formData.get('is_draft') === 'true'

    if (!name) {
        return { error: 'Name is required' }
    }

    try {
        let imageUrl = null

        // 1. Upload Image if provided
        if (imageFile && imageFile.size > 0) {
            const fileExt = imageFile.name.split('.').pop()
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
            const filePath = `${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('item-images')
                .upload(filePath, imageFile)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('item-images')
                .getPublicUrl(filePath)

            imageUrl = publicUrl
        }

        let aiData: any = {}
        let embedding = null

        // 2. AI Analysis (if not draft)
        if (!isDraft) {
            try {
                // Get groups for context if needed (optional optimization)
                const { data: groups } = await supabase.from('groups').select('name')
                const groupsList = groups?.map(g => g.name).join(', ') || ''

                const { analysis, usage, source } = await analyzeItemWithGemini(name, notes, imageUrl, groupsList)

                aiData = {
                    ai_description: analysis.ai_description,
                    attributes: analysis.attributes,
                    // Use AI description if user didn't provide notes and AI generated one
                    notes: (!notes && analysis.description) ? analysis.description : notes
                }

                // Generate Embedding
                const descriptionToEmbed = analysis.ai_description || analysis.description || notes || name
                embedding = await generateEmbedding(descriptionToEmbed, TaskType.RETRIEVAL_DOCUMENT)

                // Log Usage
                if (usage) {
                    await supabase.from('ai_usage_logs').insert({
                        operation_type: 'create_item',
                        tokens_input: usage.promptTokenCount,
                        tokens_output: usage.candidatesTokenCount,
                        total_tokens: usage.totalTokenCount,
                        model_name: 'gemini-2.0-flash',
                        details: { itemName: name, source }
                    })
                }

            } catch (aiError) {
                console.error('AI Generation failed during create:', aiError)
                // Continue creation even if AI fails, just without AI data
            }
        }

        // 3. Insert Item
        const { data: newItem, error: insertError } = await supabase
            .from('items')
            .insert({
                name,
                notes: aiData.notes || notes || null,
                group_id: groupId || null,
                location_id: locationId || null,
                image_url: imageUrl,
                performance_status: 'unassigned',
                status: isDraft ? 'draft' : 'active',
                ai_description: aiData.ai_description || null,
                attributes: aiData.attributes || {},
                embedding: embedding ? JSON.stringify(embedding) : null
            })
            .select()
            .single()

        if (insertError) throw insertError

        revalidatePath('/items')
        return { success: true, item: newItem }

    } catch (error: any) {
        console.error('Create Item Error:', error)
        return { error: error.message || 'Failed to create item' }
    }
}
