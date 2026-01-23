/**
 * Fix groups collection - add missing fields
 */

import PocketBase from 'pocketbase'

const pb = new PocketBase('http://localhost:8090')

async function fixGroupsCollection() {
    try {
        await pb.admins.authWithPassword('admin@test.local', 'admin123456')
        console.log('✓ Zalogowano\n')

        // Update groups collection with proper schema
        console.log('📝 Aktualizacja kolekcji "groups" - dodawanie pól...\n')

        await pb.collections.update('pbc_3346940990', {
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

        console.log('✅ Kolekcja zaktualizowana!\n')

        // Verify
        const collection = await pb.collections.getOne('groups')
        console.log('📊 Pola w kolekcji:')
        if (collection.schema) {
            collection.schema.forEach((field: any) => {
                console.log(`   - ${field.name} (${field.type})`)
            })
        }

    } catch (error) {
        console.error('❌ Błąd:', error)
    }
}

fixGroupsCollection()
