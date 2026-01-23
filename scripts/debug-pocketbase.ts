/**
 * Debug script - check what's in PocketBase groups collection
 */

import PocketBase from 'pocketbase'

const pb = new PocketBase('http://localhost:8090')

async function checkGroups() {
    try {
        // Login as admin
        await pb.admins.authWithPassword('admin@test.local', 'admin123456')
        console.log('✓ Zalogowano jako admin\n')

        // Get collection info
        const collection = await pb.collections.getOne('groups')
        console.log('📊 Kolekcja "groups":')
        console.log('   ID:', collection.id)
        console.log('   Name:', collection.name)
        console.log('   Type:', collection.type)
        console.log('\n📝 Pola:')
        if (collection.schema && Array.isArray(collection.schema)) {
            collection.schema.forEach((field: any) => {
                console.log(`   - ${field.name} (${field.type})`)
            })
        } else {
            console.log('   (brak zdefiniowanych pól w schema)')
        }

        // Get records count
        const records = await pb.collection('groups').getList(1, 50)
        console.log(`\n📦 Rekordy: ${records.totalItems}`)

        if (records.items.length > 0) {
            console.log('\n🔍 Pierwszy rekord:')
            const first = records.items[0]
            console.log('   Klucze:', Object.keys(first))
            console.log('\n   Pełne dane:')
            console.log(JSON.stringify(first, null, 2))
        }

    } catch (error) {
        console.error('❌ Błąd:', error)
    }
}

checkGroups()
