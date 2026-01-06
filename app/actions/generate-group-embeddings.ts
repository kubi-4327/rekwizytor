'use server'

import { createClient } from '@/utils/supabase/server'
import { generateEmbedding } from '@/utils/embeddings'
import { TaskType } from '@google/generative-ai'
import { refreshSearchIndex } from '@/app/actions/unified-search'

import { enrichGroupNameForEmbedding } from '@/utils/group-embedding-enrichment'

/**
 * Generate embedding for a single group
 */
export async function generateGroupEmbedding(groupId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient()

    // Fetch group
    const { data: group, error: fetchError } = await supabase
        .from('groups')
        .select('id, name')
        .eq('id', groupId)
        .single()

    if (fetchError || !group) {
        console.error('Failed to fetch group:', fetchError)
        return { success: false, error: fetchError?.message || 'Group not found' }
    }

    try {
        // Enrich group name with AI-generated keywords for better semantic search
        const enrichedText = await enrichGroupNameForEmbedding(group.name)
        console.log(`Enriched "${group.name}" → "${enrichedText}"`)

        // Generate embedding from enriched text
        const embedding = await generateEmbedding(enrichedText, TaskType.RETRIEVAL_DOCUMENT)

        // Update group with embedding
        const { error: updateError } = await supabase
            .from('groups')
            .update({ embedding: JSON.stringify(embedding) } as any)
            .eq('id', groupId)

        if (updateError) {
            console.error('Failed to update group embedding:', updateError)
            return { success: false, error: updateError.message }
        }

        return { success: true }
    } catch (embeddingError: any) {
        console.error('Failed to generate embedding:', embeddingError)
        return { success: false, error: embeddingError.message }
    }
}

/**
 * Generate embeddings for all groups without embeddings
 */
export async function generateAllGroupEmbeddings(): Promise<{
    success: boolean;
    processed: number;
    failed: number;
    errors: string[]
}> {
    const supabase = await createClient()

    // Fetch groups
    const { data: groups, error: fetchError } = await supabase
        .from('groups')
        .select('id, name')
        .is('deleted_at', null)

    if (fetchError) {
        console.error('Failed to fetch groups:', fetchError)
        return { success: false, processed: 0, failed: 0, errors: [fetchError.message] }
    }

    if (!groups || groups.length === 0) {
        return { success: true, processed: 0, failed: 0, errors: [] }
    }

    let processed = 0
    let failed = 0
    const errors: string[] = []

    // Process each group
    for (const group of groups) {
        try {
            // Enrich group name with AI-generated keywords for better semantic search
            const enrichedText = await enrichGroupNameForEmbedding(group.name)
            console.log(`Enriched "${group.name}" → "${enrichedText}"`)

            // Generate embedding from enriched text
            const embedding = await generateEmbedding(enrichedText, TaskType.RETRIEVAL_DOCUMENT)

            const { error: updateError } = await supabase
                .from('groups')
                .update({ embedding: JSON.stringify(embedding) } as any)
                .eq('id', group.id)

            if (updateError) {
                failed++
                errors.push(`${group.name}: ${updateError.message}`)
            } else {
                processed++
            }
        } catch (embeddingError: any) {
            failed++
            errors.push(`${group.name}: ${embeddingError.message}`)
        }

        // Delay to avoid rate limiting (10 requests/min = 6 seconds between requests)
        await new Promise(resolve => setTimeout(resolve, 7000))
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
