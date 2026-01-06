'use server'

import { generateAllGroupEmbeddings } from './generate-group-embeddings'
import { generateAllLocationEmbeddings } from './generate-location-embeddings'
import { generateAllNoteEmbeddings } from './generate-note-embeddings'
import { generateAllPerformanceEmbeddings } from './generate-performance-embeddings'
import { refreshSearchIndex } from './unified-search'

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
