
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { createPocketBaseAdmin } from '../lib/pocketbase/client'
import { cleanupOrphanedResults } from '../app/actions/embedding-tests-cleanup'

async function main() {
    try {
        const pb = await createPocketBaseAdmin()
        console.log('🔍 Connecting to delete small test runs...')

        // Get all runs using getList without sort
        const result = await pb.collection('embedding_test_runs').getList(1, 500)
        const runs = result.items

        // Filter in memory to be safe against API quirks
        const smallRuns = runs.filter(r => r.target_query_count <= 10)

        if (smallRuns.length === 0) {
            console.log('✅ No small tests found to delete.')
            return
        }

        console.log(`📊 Found ${smallRuns.length} tests to delete:`)
        smallRuns.forEach((r: any) => {
            console.log(`- DELETING: [${r.id}] "${r.name}" (${r.target_query_count} queries)`)
        })

        console.log('\n🗑️  Starting deletion...')

        for (const run of smallRuns) {
            try {
                await pb.collection('embedding_test_runs').delete(run.id)
                console.log(`✅ Deleted run: ${run.id}`)
            } catch (e: any) {
                console.error(`❌ Failed to delete ${run.id}:`, e.message)
            }
        }

        console.log('\n🧹 Running orphaned results cleanup...')
        const cleanupResult = await cleanupOrphanedResults()

        if (cleanupResult.success) {
            console.log(`✅ Cleanup finished. Deleted ${cleanupResult.deletedCount} orphaned results.`)
        } else {
            console.error('❌ Cleanup failed:', cleanupResult.error)
        }

    } catch (error) {
        console.error('💥 Error:', error)
    }
}

main()
