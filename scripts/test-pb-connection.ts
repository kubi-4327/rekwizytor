
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { createPocketBaseAdmin } from '../lib/pocketbase/client'

async function main() {
    try {
        console.log('🔌 Connecting to PocketBase...')
        const pb = await createPocketBaseAdmin()
        console.log('✅ Connected & Authenticated as Admin')

        // List collections to verify access
        console.log('📂 Fetching collections...')
        const collections = await pb.collections.getFullList()
        console.log(`✅ Collections found: ${collections.length}`)
        collections.forEach(c => console.log(`- ${c.name} (${c.type})`))

        // Check records count
        console.log('\n📊 Checking embedding_test_runs records...')
        try {
            const result = await pb.collection('embedding_test_runs').getList(1, 100)
            console.log(`✅ Records found: ${result.totalItems}`)
            result.items.forEach(item => {
                console.log(`- ${item.id}: ${item.name} (${item.target_query_count})`)
            })
        } catch (e: any) {
            console.error('❌ Failed to fetch runs:', e.message)
            console.error('Response data:', e.response)
        }

    } catch (error) {
        console.error('💥 Fatal error:', error)
    }
}

main()
