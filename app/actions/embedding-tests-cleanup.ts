'use server'

import { createPocketBaseAdmin } from '@/lib/pocketbase/client'

// ============================================
// CLEANUP & MAINTENANCE FUNCTIONS
// ============================================

/**
 * Clean up orphaned test results (results without existing test run)
 * This can happen if test runs are deleted but results remain
 */
export async function cleanupOrphanedResults(): Promise<{
    success: boolean
    deletedCount: number
    error?: string
}> {
    try {
        const pb = await createPocketBaseAdmin()

        console.log('🧹 [CLEANUP] Starting orphaned results cleanup...')

        // 1. Get all test results
        const allResults = await pb.collection('embedding_test_results').getFullList({
            fields: 'id,run_id'
        })

        console.log(`📊 [CLEANUP] Found ${allResults.length} total results`)

        // 2. Get all valid run IDs
        const allRuns = await pb.collection('embedding_test_runs').getFullList({
            fields: 'id'
        })
        const validRunIds = new Set(allRuns.map((r: any) => r.id))

        console.log(`📊 [CLEANUP] Found ${validRunIds.size} valid test runs`)

        // 3. Find orphaned results (run_id doesn't exist in test_runs)
        const orphanedResults = allResults.filter((r: any) => !validRunIds.has(r.run_id))

        console.log(`🗑️ [CLEANUP] Found ${orphanedResults.length} orphaned results`)

        if (orphanedResults.length === 0) {
            console.log('✅ [CLEANUP] No orphaned results to clean up')
            return { success: true, deletedCount: 0 }
        }

        // 4. Delete orphaned results
        let deletedCount = 0
        for (const result of orphanedResults) {
            try {
                await pb.collection('embedding_test_results').delete(result.id)
                deletedCount++
                console.log(`🗑️ [CLEANUP] Deleted result ${result.id} (orphaned from run ${(result as any).run_id})`)
            } catch (error) {
                console.error(`❌ [CLEANUP] Failed to delete result ${result.id}:`, error)
            }
        }

        console.log(`✅ [CLEANUP] Cleanup completed! Deleted ${deletedCount}/${orphanedResults.length} orphaned results`)

        return {
            success: true,
            deletedCount
        }

    } catch (error: any) {
        console.error('💥 [CLEANUP] Cleanup failed:', error)
        return {
            success: false,
            deletedCount: 0,
            error: error.message
        }
    }
}
