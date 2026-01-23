/**
 * Automatyczne tworzenie tabel/kolekcji w PocketBase
 * Używa PocketBase SDK do programatycznego tworzenia kolekcji
 * 
 * Usage:
 *   npx tsx scripts/create-pocketbase-tables.ts
 */

import PocketBase from 'pocketbase'

const pb = new PocketBase('http://localhost:8090')

// Dane logowania admina
const ADMIN_EMAIL = 'admin@test.local'
const ADMIN_PASSWORD = 'admin123456'

async function createTables() {
    console.log('🗄️  Tworzenie tabel w PocketBase...\n')

    try {
        // Zaloguj się jako admin
        console.log('🔐 Logowanie jako admin...')
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD)
        console.log('  ✓ Zalogowano\n')

        // 1. Tabela: groups
        console.log('1️⃣  Tworzenie tabeli "groups"...')
        try {
            await pb.collections.create({
                name: 'groups',
                type: 'base',
                schema: [
                    { name: 'original_id', type: 'text', required: false },
                    { name: 'name', type: 'text', required: true },
                    { name: 'description', type: 'text', required: false },
                    { name: 'color', type: 'text', required: false },
                    { name: 'icon', type: 'text', required: false },
                    { name: 'performance_id', type: 'text', required: false },
                    { name: 'location_id', type: 'text', required: false },
                    { name: 'short_id', type: 'text', required: false },
                    { name: 'embeddings', type: 'json', required: false },
                    { name: 'deleted_at', type: 'date', required: false }
                ]
            })
            console.log('  ✓ Utworzono\n')
        } catch (e: any) {
            if (e.status === 400) {
                console.log('  ℹ️  Już istnieje\n')
            } else {
                throw e
            }
        }

        // 2. Tabela: embedding_regeneration_jobs
        console.log('2️⃣  Tworzenie tabeli "embedding_regeneration_jobs"...')
        try {
            await pb.collections.create({
                name: 'embedding_regeneration_jobs',
                type: 'base',
                schema: [
                    { name: 'status', type: 'text', required: true },
                    { name: 'embedding_model', type: 'text', required: true },
                    { name: 'enrichment_model', type: 'text', required: true },
                    { name: 'use_sample_groups', type: 'bool', required: false },
                    { name: 'total_groups', type: 'number', required: true },
                    { name: 'processed_groups', type: 'number', required: false },
                    { name: 'current_group_id', type: 'text', required: false },
                    { name: 'current_group_name', type: 'text', required: false },
                    { name: 'current_enrichment', type: 'json', required: false },
                    { name: 'error_message', type: 'text', required: false },
                    { name: 'failed_groups', type: 'json', required: false },
                    { name: 'total_tokens', type: 'number', required: false }
                ]
            })
            console.log('  ✓ Utworzono\n')
        } catch (e: any) {
            if (e.status === 400) {
                console.log('  ℹ️  Już istnieje\n')
            } else {
                throw e
            }
        }

        // 3. Tabela: embedding_test_queue
        console.log('3️⃣  Tworzenie tabeli "embedding_test_queue"...')
        try {
            await pb.collections.create({
                name: 'embedding_test_queue',
                type: 'base',
                schema: [
                    { name: 'position', type: 'number', required: true },
                    { name: 'status', type: 'text', required: true },
                    { name: 'config', type: 'json', required: true },
                    { name: 'run_id', type: 'text', required: false },
                    { name: 'error_message', type: 'text', required: false }
                ]
            })
            console.log('  ✓ Utworzono\n')
        } catch (e: any) {
            if (e.status === 400) {
                console.log('  ℹ️  Już istnieje\n')
            } else {
                throw e
            }
        }

        // 4. Tabela: embedding_test_results
        console.log('4️⃣  Tworzenie tabeli "embedding_test_results"...')
        try {
            await pb.collections.create({
                name: 'embedding_test_results',
                type: 'base',
                schema: [
                    { name: 'run_id', type: 'text', required: false },
                    { name: 'test_id', type: 'text', required: false },
                    { name: 'config', type: 'json', required: true },
                    { name: 'metrics', type: 'json', required: false },
                    { name: 'precision_at_1', type: 'number', required: false },
                    { name: 'precision_at_5', type: 'number', required: false },
                    { name: 'precision_at_10', type: 'number', required: false },
                    { name: 'recall_at_1', type: 'number', required: false },
                    { name: 'recall_at_5', type: 'number', required: false },
                    { name: 'recall_at_10', type: 'number', required: false },
                    { name: 'mrr', type: 'number', required: false },
                    { name: 'ndcg_at_10', type: 'number', required: false },
                    { name: 'completed_query_count', type: 'number', required: false }
                ]
            })
            console.log('  ✓ Utworzono\n')
        } catch (e: any) {
            if (e.status === 400) {
                console.log('  ℹ️  Już istnieje\n')
            } else {
                throw e
            }
        }

        // 5. Tabela: embedding_test_runs
        console.log('5️⃣  Tworzenie tabeli "embedding_test_runs"...')
        try {
            await pb.collections.create({
                name: 'embedding_test_runs',
                type: 'base',
                schema: [
                    { name: 'status', type: 'text', required: true },
                    { name: 'config', type: 'json', required: true },
                    { name: 'embedding_model', type: 'text', required: true },
                    { name: 'enrichment_model', type: 'text', required: true },
                    { name: 'use_sample_groups', type: 'bool', required: false },
                    { name: 'total_tests', type: 'number', required: false },
                    { name: 'completed_tests', type: 'number', required: false },
                    { name: 'failed_tests', type: 'number', required: false },
                    { name: 'avg_precision_at_1', type: 'number', required: false },
                    { name: 'avg_precision_at_5', type: 'number', required: false },
                    { name: 'avg_precision_at_10', type: 'number', required: false },
                    { name: 'avg_recall_at_1', type: 'number', required: false },
                    { name: 'avg_recall_at_5', type: 'number', required: false },
                    { name: 'avg_recall_at_10', type: 'number', required: false },
                    { name: 'avg_mrr', type: 'number', required: false },
                    { name: 'avg_ndcg_at_10', type: 'number', required: false },
                    { name: 'completed_query_count', type: 'number', required: false },
                    { name: 'requires_reembedding', type: 'bool', required: false },
                    { name: 'error_message', type: 'text', required: false },
                    { name: 'use_dynamic_weights', type: 'bool', required: false },
                    { name: 'total_search_tokens', type: 'number', required: false },
                    { name: 'total_tester_tokens', type: 'number', required: false }
                ]
            })
            console.log('  ✓ Utworzono\n')
        } catch (e: any) {
            if (e.status === 400) {
                console.log('  ℹ️  Już istnieje\n')
            } else {
                throw e
            }
        }

        // 6. Tabela: intent_test_data
        console.log('6️⃣  Tworzenie tabeli "intent_test_data"...')
        try {
            await pb.collections.create({
                name: 'intent_test_data',
                type: 'base',
                schema: [
                    { name: 'test_result_id', type: 'text', required: true },
                    { name: 'expected_dominant_vector', type: 'text', required: true },
                    { name: 'detected_dominant_vector', type: 'text', required: false },
                    { name: 'intent_identity_weight', type: 'number', required: false },
                    { name: 'intent_physical_weight', type: 'number', required: false },
                    { name: 'vector_match', type: 'bool', required: false },
                    { name: 'classifier_source', type: 'text', required: false }, // 'rules' | 'llm' | 'hybrid'
                    { name: 'classifier_confidence', type: 'number', required: false },
                    { name: 'classifier_latency_ms', type: 'number', required: false }
                ]
            })
            console.log('  ✓ Utworzono\n')
        } catch (e: any) {
            if (e.status === 400) {
                console.log('  ℹ️  Już istnieje\n')
            } else {
                throw e
            }
        }

        console.log('✅ Wszystkie tabele utworzone!')
        console.log('\n📊 Utworzone tabele:')
        console.log('   • groups')
        console.log('   • embedding_regeneration_jobs')
        console.log('   • embedding_test_queue')
        console.log('   • embedding_test_results')
        console.log('   • embedding_test_runs')
        console.log('   • intent_test_data')
        console.log('\n💡 Możesz teraz zaimportować dane:')
        console.log('   npm run import:pocketbase')

    } catch (error) {
        console.error('\n❌ Błąd:', error)
        if (error instanceof Error && error.message.includes('401')) {
            console.log('\n💡 Upewnij się że utworzyłeś konto admina:')
            console.log('   docker exec -it rekwizytor-pocketbase-test /usr/local/bin/pocketbase superuser upsert admin@test.local admin123456')
        }
        process.exit(1)
    }
}

// Sprawdź czy PocketBase działa
async function checkPocketBase() {
    try {
        await fetch('http://localhost:8090/api/health')
    } catch (error) {
        console.error('❌ PocketBase nie jest uruchomiony!')
        console.log('\n💡 Uruchom PocketBase: npm run test:start')
        process.exit(1)
    }
}

checkPocketBase().then(createTables)
