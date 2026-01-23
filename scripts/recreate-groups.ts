/**
 * Recreate groups collection with proper schema
 */

import PocketBase from 'pocketbase'

const pb = new PocketBase('http://localhost:8090')

async function recreateGroups() {
    try {
        await pb.admins.authWithPassword('admin@test.local', 'admin123456')
        console.log('✓ Zalogowano\n')

        // Delete existing collection
        console.log('🗑️  Usuwanie starej kolekcji...')
        try {
            await pb.collections.delete('pbc_3346940990')
            console.log('  ✓ Usunięto\n')
        } catch (e) {
            console.log('  (nie istniała lub błąd)\n')
        }

        // Create new collection with proper schema
        console.log('📝 Tworzenie nowej kolekcji ze schematem...')
        const newCollection = await pb.collections.create({
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

        console.log('✅ Kolekcja utworzona!\n')
        console.log('📊 Pola:')
        if (newCollection.schema) {
            newCollection.schema.forEach((field: any) => {
                console.log(`   - ${field.name} (${field.type})`)
            })
        }

        console.log('\n💡 Teraz uruchom import:')
        console.log('   npm run import:pocketbase')

    } catch (error) {
        console.error('❌ Błąd:', error)
    }
}

recreateGroups()
