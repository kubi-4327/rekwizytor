
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { createPocketBaseAdmin } from '../lib/pocketbase/client'

async function main() {
    try {
        const pb = await createPocketBaseAdmin()

        console.log('📊 Checking test runs and queue...\n')

        // Get all test runs
        const runs = await pb.collection('embedding_test_runs').getList(1, 100)
        console.log(`✅ Test Runs: ${runs.totalItems}`)
        runs.items.forEach(r => {
            console.log(`  - [${r.id}] ${r.name} (${r.target_query_count} queries, status: ${r.status})`)
        })

        // Get queue items
        console.log('\n📋 Queue Items:')
        const queue = await pb.collection('embedding_test_queue').getList(1, 100)
        console.log(`✅ Queue Items: ${queue.totalItems}`)
        queue.items.forEach(q => {
            console.log(`  - [${q.id}] run_id: ${q.run_id}, status: ${q.status}`)
        })

        // Check which runs are in queue
        const queueRunIds = queue.items.map(q => q.run_id).filter(Boolean)
        console.log('\n🔍 Queue Run IDs:', queueRunIds)

        const standaloneRuns = runs.items.filter(r => !queueRunIds.includes(r.id))
        console.log(`\n✅ Standalone Runs (not in queue): ${standaloneRuns.length}`)
        standaloneRuns.forEach(r => {
            console.log(`  - [${r.id}] ${r.name}`)
        })

    } catch (error) {
        console.error('Error:', error)
    }
}

main()
