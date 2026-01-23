/**
 * Clean all PocketBase collections - remove all records
 * Use before full import to avoid duplicates
 * 
 * Usage:
 *   npx tsx scripts/clean-pocketbase.ts
 *   npx tsx scripts/clean-pocketbase.ts --confirm  # Skip confirmation
 */

import PocketBase from 'pocketbase'
import readline from 'readline'

const pb = new PocketBase('http://localhost:8090')
const ADMIN_EMAIL = 'admin@test.local'
const ADMIN_PASSWORD = 'admin123456'

const COLLECTIONS = [
    'groups',
    'embedding_regeneration_jobs',
    'embedding_test_queue',
    'embedding_test_results',
    'embedding_test_runs',
    'intent_test_data'
]

async function askConfirmation(): Promise<boolean> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    })

    return new Promise((resolve) => {
        rl.question('\n⚠️  To usunie WSZYSTKIE rekordy z kolekcji testowych!\nCzy na pewno chcesz kontynuować? (tak/nie): ', (answer) => {
            rl.close()
            resolve(answer.toLowerCase() === 'tak')
        })
    })
}

async function cleanCollections() {
    console.log('🧹 Czyszczenie kolekcji PocketBase...\n')

    // Login as admin
    try {
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD)
        console.log('✓ Zalogowano jako admin\n')
    } catch (error) {
        console.error('❌ Błąd logowania:', error)
        process.exit(1)
    }

    let totalDeleted = 0

    for (const collectionName of COLLECTIONS) {
        try {
            // Get all records
            const records = await pb.collection(collectionName).getFullList()

            if (records.length === 0) {
                console.log(`⏭️  ${collectionName}: już pusta`)
                continue
            }

            console.log(`🗑️  ${collectionName}: usuwam ${records.length} rekordów...`)

            // Delete all records
            for (const record of records) {
                await pb.collection(collectionName).delete(record.id)
            }

            totalDeleted += records.length
            console.log(`   ✓ Usunięto ${records.length} rekordów\n`)

        } catch (error: any) {
            console.error(`   ❌ Błąd dla ${collectionName}:`, error.message)
        }
    }

    console.log(`\n✅ Czyszczenie zakończone!`)
    console.log(`   Łącznie usunięto: ${totalDeleted} rekordów\n`)
    console.log('💡 Teraz możesz uruchomić pełny import:')
    console.log('   npm run export:supabase  # bez --limit')
    console.log('   npm run import:pocketbase')
}

async function main() {
    const args = process.argv.slice(2)
    const skipConfirmation = args.includes('--confirm')

    if (!skipConfirmation) {
        const confirmed = await askConfirmation()
        if (!confirmed) {
            console.log('\n❌ Anulowano')
            process.exit(0)
        }
    }

    await cleanCollections()
}

main().catch(console.error)
