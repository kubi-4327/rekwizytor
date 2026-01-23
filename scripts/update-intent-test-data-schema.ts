/**
 * Update intent_test_data table schema in PocketBase
 * Adds missing columns if table exists but is empty
 * 
 * Usage:
 *   npx tsx scripts/update-intent-test-data-schema.ts
 */

import PocketBase from 'pocketbase'

const pb = new PocketBase('http://localhost:8090')
const ADMIN_EMAIL = 'admin@test.local'
const ADMIN_PASSWORD = 'admin123456'

async function updateSchema() {
    console.log('🔧 Aktualizacja schematu intent_test_data...\n')

    try {
        // Login as admin
        console.log('🔐 Logowanie jako admin...')
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD)
        console.log('  ✓ Zalogowano\n')

        // Get the collection
        const collection = await pb.collections.getOne('intent_test_data')
        console.log('📋 Znaleziono kolekcję:', collection.name)
        console.log('   Obecne pola:', collection.schema?.length || 0)

        // Update schema with all fields
        await pb.collections.update(collection.id, {
            schema: [
                {
                    name: 'test_result_id',
                    type: 'text',
                    required: true,
                    options: {
                        min: null,
                        max: null,
                        pattern: ''
                    }
                },
                {
                    name: 'expected_dominant_vector',
                    type: 'text',
                    required: true,
                    options: {
                        min: null,
                        max: null,
                        pattern: ''
                    }
                },
                {
                    name: 'detected_dominant_vector',
                    type: 'text',
                    required: false,
                    options: {
                        min: null,
                        max: null,
                        pattern: ''
                    }
                },
                {
                    name: 'intent_identity_weight',
                    type: 'number',
                    required: false,
                    options: {
                        min: 0,
                        max: 1,
                        noDecimal: false
                    }
                },
                {
                    name: 'intent_physical_weight',
                    type: 'number',
                    required: false,
                    options: {
                        min: 0,
                        max: 1,
                        noDecimal: false
                    }
                },
                {
                    name: 'vector_match',
                    type: 'bool',
                    required: false
                },
                {
                    name: 'classifier_source',
                    type: 'text',
                    required: false,
                    options: {
                        min: null,
                        max: null,
                        pattern: ''
                    }
                },
                {
                    name: 'classifier_confidence',
                    type: 'number',
                    required: false,
                    options: {
                        min: 0,
                        max: 1,
                        noDecimal: false
                    }
                },
                {
                    name: 'classifier_latency_ms',
                    type: 'number',
                    required: false,
                    options: {
                        min: null,
                        max: null,
                        noDecimal: false
                    }
                }
            ]
        })

        console.log('\n✅ Schemat zaktualizowany!')
        console.log('\n📊 Dodane pola:')
        console.log('   • test_result_id (text, required)')
        console.log('   • expected_dominant_vector (text, required)')
        console.log('   • detected_dominant_vector (text)')
        console.log('   • intent_identity_weight (number, 0-1)')
        console.log('   • intent_physical_weight (number, 0-1)')
        console.log('   • vector_match (bool)')
        console.log('   • classifier_source (text)')
        console.log('   • classifier_confidence (number, 0-1)')
        console.log('   • classifier_latency_ms (number)')

        console.log('\n💡 Możesz teraz używać tabeli intent_test_data!')

    } catch (error) {
        console.error('\n❌ Błąd:', error)
        if (error instanceof Error && error.message.includes('404')) {
            console.log('\n💡 Tabela nie istnieje. Uruchom najpierw:')
            console.log('   npx tsx scripts/create-pocketbase-tables.ts')
        }
        process.exit(1)
    }
}

// Check if PocketBase is running
async function checkPocketBase() {
    try {
        await fetch('http://localhost:8090/api/health')
    } catch (error) {
        console.error('❌ PocketBase nie jest uruchomiony!')
        console.log('\n💡 Uruchom PocketBase: npm run test:start')
        process.exit(1)
    }
}

checkPocketBase().then(updateSchema)
