'use server'

import { createClient } from '@/utils/supabase/server'
import { generateEmbedding } from '@/utils/embeddings'
import { TaskType } from '@google/generative-ai'
import { refreshSearchIndex } from '@/app/actions/unified-search'

/**
 * Generate embedding for a single location
 */
export async function generateLocationEmbedding(locationId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient()

    // Fetch location
    const { data: location, error: fetchError } = await supabase
        .from('locations')
        .select('id, name, description')
        .eq('id', locationId)
        .single()

    if (fetchError || !location) {
        console.error('Failed to fetch location:', fetchError)
        return { success: false, error: fetchError?.message || 'Location not found' }
    }

    // Generate text for embedding (name + description)
    const textForEmbedding = [
        location.name,
        location.description || ''
    ].filter(Boolean).join(' - ')

    try {
        // Generate embedding
        const embedding = await generateEmbedding(textForEmbedding, TaskType.RETRIEVAL_DOCUMENT)

        // Update location with embedding
        const { error: updateError } = await supabase
            .from('locations')
            .update({ embedding: JSON.stringify(embedding) } as any)
            .eq('id', locationId)

        if (updateError) {
            console.error('Failed to update location embedding:', updateError)
            return { success: false, error: updateError.message }
        }

        return { success: true }
    } catch (embeddingError: any) {
        console.error('Failed to generate embedding:', embeddingError)
        return { success: false, error: embeddingError.message }
    }
}

/**
 * Generate embeddings for all locations without embeddings
 */
export async function generateAllLocationEmbeddings(): Promise<{
    success: boolean;
    processed: number;
    failed: number;
    errors: string[]
}> {
    const supabase = await createClient()

    // Fetch locations without embeddings
    const { data: locations, error: fetchError } = await supabase
        .from('locations')
        .select('id, name, description')
        .is('deleted_at', null)

    if (fetchError) {
        console.error('Failed to fetch locations:', fetchError)
        return { success: false, processed: 0, failed: 0, errors: [fetchError.message] }
    }

    if (!locations || locations.length === 0) {
        return { success: true, processed: 0, failed: 0, errors: [] }
    }

    let processed = 0
    let failed = 0
    const errors: string[] = []

    // Process each location
    for (const location of locations) {
        const textForEmbedding = [
            location.name,
            location.description || ''
        ].filter(Boolean).join(' - ')

        try {
            const embedding = await generateEmbedding(textForEmbedding, TaskType.RETRIEVAL_DOCUMENT)

            const { error: updateError } = await supabase
                .from('locations')
                .update({ embedding: JSON.stringify(embedding) } as any)
                .eq('id', location.id)

            if (updateError) {
                failed++
                errors.push(`${location.name}: ${updateError.message}`)
            } else {
                processed++
            }
        } catch (embeddingError: any) {
            failed++
            errors.push(`${location.name}: ${embeddingError.message}`)
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
    }

    // Refresh search index after all embeddings are generated
    try {
        await refreshSearchIndex()
    } catch (e) {
        console.error('Failed to refresh search index:', e)
    }

    return {
        success: failed === 0,
        processed,
        failed,
        errors
    }
}
