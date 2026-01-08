'use server'

import { generateAllGroupEmbeddings } from './generate-group-embeddings'
import { generateAllLocationEmbeddings } from './generate-location-embeddings'
import { generateAllNoteEmbeddings } from './generate-note-embeddings'
import { generateAllPerformanceEmbeddings } from './generate-performance-embeddings'
import { refreshSearchIndex } from './unified-search'
import { createClient } from '@/utils/supabase/server'
import { generateEmbedding } from '@/utils/embeddings'
import { TaskType } from '@google/generative-ai'
import { enrichGroupNameForEmbedding } from '@/utils/group-embedding-enrichment'

export type MigrationProgress = {
    current: number
    total: number
    currentName: string
    status: 'pending' | 'enriching' | 'embedding' | 'saving' | 'done' | 'error'
    enrichedText?: string
    error?: string
}

/**
 * Process a single group embedding with detailed logging
 * Returns result for streaming to client
 */
export async function processSingleGroupEmbedding(groupId: string, groupName: string): Promise<{
    success: boolean
    enrichedText?: string
    error?: string
}> {
    const supabase = await createClient()

    try {
        // Step 1: Enrich
        console.log(`   🔤 [STEP 1] Enriching "${groupName}"...`)
        const enrichedText = await enrichGroupNameForEmbedding(groupName)
        const wasEnriched = enrichedText !== groupName && enrichedText.includes(':')
        console.log(`   ${wasEnriched ? '✅' : '⚠️'} [STEP 1] ${wasEnriched ? 'Enriched' : 'Not enriched'}: "${enrichedText}"`)

        // Step 2: Generate embedding
        console.log(`   🔢 [STEP 2] Generating embedding...`)
        const embedding = await generateEmbedding(enrichedText, TaskType.RETRIEVAL_DOCUMENT)
        console.log(`   ✅ [STEP 2] Embedding generated (${embedding.length} dimensions)`)

        // Step 3: Save
        console.log(`   💾 [STEP 3] Saving to Supabase...`)
        const { data: updateData, error: updateError } = await supabase
            .from('groups')
            .update({ embedding: JSON.stringify(embedding) } as any)
            .eq('id', groupId)
            .select('id')

        if (updateError) {
            console.error(`   ❌ [STEP 3] FAILED: ${updateError.message}`)
            return { success: false, error: updateError.message }
        }

        const rowsAffected = updateData?.length || 0
        if (rowsAffected === 0) {
            console.log(`   ⚠️ [STEP 3] 0 rows affected (RLS issue?)`)
            return { success: false, error: '0 rows affected - possible RLS policy issue' }
        }

        console.log(`   ✅ [STEP 3] SAVED successfully`)
        return { success: true, enrichedText }

    } catch (error: any) {
        console.error(`   ❌ [ERROR] ${error.message}`)
        return { success: false, error: error.message }
    }
}

/**
 * Get list of groups to process
 */
export async function getGroupsForMigration(): Promise<{ id: string; name: string }[]> {
    const supabase = await createClient()

    const { data: groups, error } = await supabase
        .from('groups')
        .select('id, name')
        .is('deleted_at', null)
        .order('name')

    if (error) {
        console.error('Failed to fetch groups:', error)
        return []
    }

    return groups || []
}

/**
 * Migrate all existing data to have embeddings
 * This is a one-time operation to generate embeddings for all existing entities
 */
export async function migrateAllEmbeddings(): Promise<{
    success: boolean;
    totals: {
        groups: number;
        locations: number;
        notes: number;
        performances: number;
    };
    errors: string[];
}> {
    console.log('🚀 Starting embedding migration for all entities...')

    const allErrors: string[] = []

    // Groups
    console.log('📦 Generating embeddings for groups...')
    const groupsResult = await generateAllGroupEmbeddings()
    console.log(`✅ Groups: ${groupsResult.processed} processed, ${groupsResult.failed} failed`)
    allErrors.push(...groupsResult.errors)

    // Locations
    console.log('📍 Generating embeddings for locations...')
    const locationsResult = await generateAllLocationEmbeddings()
    console.log(`✅ Locations: ${locationsResult.processed} processed, ${locationsResult.failed} failed`)
    allErrors.push(...locationsResult.errors)

    // Notes
    console.log('📝 Generating embeddings for notes...')
    const notesResult = await generateAllNoteEmbeddings()
    console.log(`✅ Notes: ${notesResult.processed} processed, ${notesResult.failed} failed`)
    allErrors.push(...notesResult.errors)

    // Performances
    console.log('🎭 Generating embeddings for performances...')
    const perfsResult = await generateAllPerformanceEmbeddings()
    console.log(`✅ Performances: ${perfsResult.processed} processed, ${perfsResult.failed} failed`)
    allErrors.push(...perfsResult.errors)

    // Refresh search index
    console.log('🔄 Refreshing search index...')
    try {
        await refreshSearchIndex()
        console.log('✅ Search index refreshed')
    } catch (e) {
        console.error('❌ Failed to refresh search index:', e)
        allErrors.push(`Search index refresh: ${e}`)
    }

    const totals = {
        groups: groupsResult.processed,
        locations: locationsResult.processed,
        notes: notesResult.processed,
        performances: perfsResult.processed
    }

    const totalProcessed = Object.values(totals).reduce((a, b) => a + b, 0)
    const totalFailed = allErrors.length

    console.log(`\n🎉 Migration complete!`)
    console.log(`   Total processed: ${totalProcessed}`)
    console.log(`   Total failed: ${totalFailed}`)

    return {
        success: totalFailed === 0,
        totals,
        errors: allErrors
    }
}

