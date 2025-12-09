'use server'

import { createClient } from '@/utils/supabase/server'
import { generateEmbedding } from '@/utils/embeddings'
import { TaskType } from '@google/generative-ai'

/**
 * Generate embedding for a single performance
 */
export async function generatePerformanceEmbedding(performanceId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient()

    // Fetch performance
    const { data: performance, error: fetchError } = await supabase
        .from('performances')
        .select('id, title, notes')
        .eq('id', performanceId)
        .single()

    if (fetchError || !performance) {
        console.error('Failed to fetch performance:', fetchError)
        return { success: false, error: fetchError?.message || 'Performance not found' }
    }

    // Generate text for embedding (title + notes)
    const textForEmbedding = [
        performance.title,
        performance.notes || ''
    ].filter(Boolean).join(' - ')

    try {
        // Generate embedding
        const embedding = await generateEmbedding(textForEmbedding, TaskType.RETRIEVAL_DOCUMENT)

        // Update performance with embedding
        // Note: embedding column will be added by migration 20251205_performance_embeddings.sql
        const { error: updateError } = await supabase
            .from('performances')
            .update({ embedding: JSON.stringify(embedding) } as any)
            .eq('id', performanceId)

        if (updateError) {
            console.error('Failed to update performance embedding:', updateError)
            return { success: false, error: updateError.message }
        }

        return { success: true }
    } catch (embeddingError: any) {
        console.error('Failed to generate embedding:', embeddingError)
        return { success: false, error: embeddingError.message }
    }
}

/**
 * Generate embeddings for all performances without embeddings
 */
export async function generateAllPerformanceEmbeddings(): Promise<{
    success: boolean;
    processed: number;
    failed: number;
    errors: string[]
}> {
    const supabase = await createClient()

    // Fetch performances without embeddings
    const { data: performances, error: fetchError } = await supabase
        .from('performances')
        .select('id, title, notes')
        .is('deleted_at', null)
        .is('embedding', null)

    if (fetchError) {
        console.error('Failed to fetch performances:', fetchError)
        return { success: false, processed: 0, failed: 0, errors: [fetchError.message] }
    }

    if (!performances || performances.length === 0) {
        return { success: true, processed: 0, failed: 0, errors: [] }
    }

    let processed = 0
    let failed = 0
    const errors: string[] = []

    // Process each performance
    for (const performance of performances) {
        const textForEmbedding = [
            performance.title,
            performance.notes || ''
        ].filter(Boolean).join(' - ')

        try {
            const embedding = await generateEmbedding(textForEmbedding, TaskType.RETRIEVAL_DOCUMENT)

            const { error: updateError } = await supabase
                .from('performances')
                .update({ embedding: JSON.stringify(embedding) } as any)
                .eq('id', performance.id)

            if (updateError) {
                failed++
                errors.push(`${performance.title}: ${updateError.message}`)
            } else {
                processed++
            }
        } catch (embeddingError: any) {
            failed++
            errors.push(`${performance.title}: ${embeddingError.message}`)
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
    }

    return {
        success: failed === 0,
        processed,
        failed,
        errors
    }
}
