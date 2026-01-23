/**
 * Import data from Supabase export to PocketBase
 * 
 * Usage:
 *   npx tsx scripts/import-to-pocketbase.ts
 *   npx tsx scripts/import-to-pocketbase.ts --update  # Update existing records
 */

import PocketBase from 'pocketbase'
import { readFileSync } from 'fs'
import { join } from 'path'

const POCKETBASE_URL = 'http://localhost:8090'
const ADMIN_EMAIL = 'admin@test.local'
const ADMIN_PASSWORD = 'admin123456'

interface ExportData {
    exported_at: string
    groups: any[]
    intent_test_data: any[]
    // Embedding test tables removed - now in PocketBase only
}

async function importGroups(pb: PocketBase, groups: any[], update: boolean = false) {
    console.log(`\n📥 Importowanie ${groups.length} grup...\n`)

    let imported = 0
    let updated = 0
    let skipped = 0
    let errors = 0

    for (const group of groups) {
        // Debug: show first record
        if (imported === 0) {
            console.log('🔍 Debug - pierwszy rekord z eksportu:')
            console.log('  group.id:', group.id)
            console.log('  group.name:', group.name)
            console.log('  group.embeddings:', group.embeddings ? 'EXISTS' : 'NULL')
            console.log('')
        }

        const recordData = {
            original_id: group.id,
            name: group.name,
            description: group.description || '',
            icon: group.icon || '',
            color: group.color || '',
            performance_id: group.performance_id || '',
            location_id: group.location_id || '',
            short_id: group.short_id || '',
            embeddings: group.embeddings || null,
            deleted_at: group.deleted_at || null
        }

        try {
            // Try to create (PocketBase will generate its own ID)
            await pb.collection('groups').create(recordData)
            imported++
            if (imported % 5 === 0 || imported === groups.length) {
                process.stdout.write(`  Zaimportowano: ${imported}/${groups.length}\r`)
            }
        } catch (error: any) {
            if (error.status === 400 && update) {
                // Record exists, try to update
                try {
                    // When updating, we use the original ID to find the record
                    // Assuming 'original_id' is a unique field in PocketBase for updates
                    // If PocketBase's own ID is used for updates, this logic needs adjustment.
                    // For now, we'll try to find by original_id and then update.
                    // A more robust solution would be to query for the record by original_id first.
                    // For simplicity, if the error is due to ID conflict on create, we assume
                    // the record with 'original_id' exists and try to update it.
                    // This assumes 'original_id' is indexed and unique in PocketBase.
                    const existingRecord = await pb.collection('groups').getFirstListItem(`original_id="${group.id}"`);
                    await pb.collection('groups').update(existingRecord.id, recordData)
                    updated++
                } catch (updateError) {
                    errors++
                    if (errors === 1) {
                        console.log(`\n  ⚠️  Nie udało się zaktualizować "${group.name}":`, updateError)
                    }
                }
            } else {
                skipped++
                if (skipped <= 3) {
                    console.log(`\n  ⚠️  Błąd dla "${group.name}":`)
                    console.log(`     Status: ${error.status}`)
                    console.log(`     Message: ${error.message}`)
                    if (error.response?.data) {
                        console.log(`     Data:`, JSON.stringify(error.response.data, null, 2))
                    }
                }
            }
        }
    }

    console.log(`\n\n✅ Import zakończony!`)
    console.log(`\n📊 Statystyki:`)
    console.log(`   Zaimportowano: ${imported}`)
    if (update) {
        console.log(`   Zaktualizowano: ${updated}`)
    }
    console.log(`   Pominięto: ${skipped}`)
    if (errors > 0) {
        console.log(`   Błędy: ${errors}`)
    }
}

async function importTable(pb: PocketBase, tableName: string, data: any[]) {
    if (!data || data.length === 0) {
        console.log(`\n⏭️  Pomijam ${tableName} (brak danych)\n`)
        return
    }

    console.log(`\n📥 Importowanie ${data.length} rekordów do "${tableName}"...\n`)

    let imported = 0
    let errors = 0

    for (const record of data) {
        try {
            // Remove 'id' field - PocketBase will generate its own
            const { id, ...recordWithoutId } = record

            await pb.collection(tableName).create(recordWithoutId)
            imported++
            if (imported % 5 === 0 || imported === data.length) {
                process.stdout.write(`  Zaimportowano: ${imported}/${data.length}\r`)
            }
        } catch (error: any) {
            errors++
            if (errors <= 2) {
                console.log(`\n  ⚠️  Błąd importu do ${tableName}:`)
                console.log(`     Status: ${error.status}`)
                console.log(`     Message: ${error.message}`)
                if (error.response?.data) {
                    console.log(`     Data:`, JSON.stringify(error.response.data, null, 2))
                }
            }
        }
    }

    console.log(`\n\n✅ Import ${tableName} zakończony!`)
    console.log(`   Zaimportowano: ${imported}`)
    if (errors > 0) {
        console.log(`   Błędy: ${errors}`)
    }
}

async function main() {
    console.log('🚀 Import danych do PocketBase\n')

    // Initialize PocketBase
    const pb = new PocketBase(POCKETBASE_URL)

    // Check if PocketBase is running
    try {
        await fetch(`${POCKETBASE_URL}/api/health`)
    } catch (error) {
        console.error('❌ PocketBase nie jest uruchomiony!')
        console.log('\n💡 Uruchom PocketBase: npm run test:start')
        process.exit(1)
    }

    // Load export data
    const exportPath = join(process.cwd(), 'data', 'supabase-export.json')
    let exportData: ExportData

    try {
        const fileContent = readFileSync(exportPath, 'utf-8')
        exportData = JSON.parse(fileContent)
    } catch (error) {
        console.error('❌ Nie znaleziono pliku eksportu!')
        console.log('\n💡 Najpierw uruchom: npm run export:supabase')
        process.exit(1)
    }

    console.log(`📁 Załadowano eksport z: ${new Date(exportData.exported_at).toLocaleString('pl-PL')}`)
    console.log(`   Groups: ${exportData.groups.length}`)
    console.log(`   Groups z embedingami: ${exportData.groups.filter(g => g.embeddings).length}`)

    // Parse CLI arguments
    const args = process.argv.slice(2)
    const update = args.includes('--update')

    // Login as admin
    console.log('\n🔐 Logowanie jako admin...')
    try {
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD)
        console.log('  ✓ Zalogowano\n')
    } catch (error) {
        console.error('  ✗ Błąd logowania')
        console.log('\n💡 Upewnij się że utworzyłeś konto admina:')
        console.log('   docker exec -it rekwizytor-pocketbase-test /usr/local/bin/pocketbase superuser upsert admin@test.local admin123456')
        process.exit(1)
    }

    // Import groups
    await importGroups(pb, exportData.groups, update)

    // Import intent test data (if exists)
    if (exportData.intent_test_data) {
        await importTable(pb, 'intent_test_data', exportData.intent_test_data)
    }

    console.log(`\n💡 Otwórz PocketBase Admin: ${POCKETBASE_URL}/_/`)
    console.log(`   Login: ${ADMIN_EMAIL}`)
    console.log(`   Hasło: ${ADMIN_PASSWORD}`)
}

main().catch(console.error)
