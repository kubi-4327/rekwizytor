
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { createPocketBaseAdmin } from '../lib/pocketbase/client'
import { cleanupOrphanedResults } from '../app/actions/embedding-tests-cleanup'

async function main() {
    try {
        const pb = await createPocketBaseAdmin()

        console.log('🔍 Szukam testów z małą liczbą zapytań (<= 10)...')

        const runs = await pb.collection('embedding_test_runs').getFullList({
            sort: '-created'
        })

        if (runs.length === 0) {
            console.log('✅ Nie znaleziono żadnych testów spełniających kryteria.')
            return
        }

        console.log(`📊 Znaleziono ${runs.length} testów:\n`)

        runs.forEach((run: any) => {
            console.log(`- [${run.id}] "${run.name}" (${run.target_query_count} zapytań) - Status: ${run.status} - Created: ${run.created}`)
        })

        // Uncomment below to actually delete
        /*
        console.log('\n🗑️ Usuwanie...')
        for (const run of runs) {
            await pb.collection('embedding_test_runs').delete(run.id)
            console.log(`Deleted run: ${run.id}`)
        }
        
        // Run cleanup for orphaned results
        await cleanupOrphanedResults()
        */

    } catch (error) {
        console.error('Błąd:', error)
    }
}

main()
