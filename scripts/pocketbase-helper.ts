/**
 * PocketBase Test Helper
 * 
 * Utility functions for managing PocketBase test environment
 * 
 * Usage:
 *   npx tsx scripts/pocketbase-helper.ts setup
 *   npx tsx scripts/pocketbase-helper.ts seed
 *   npx tsx scripts/pocketbase-helper.ts reset
 */

const POCKETBASE_URL = 'http://localhost:8090'
const ADMIN_EMAIL = 'admin@test.local'
const ADMIN_PASSWORD = 'admin123456'

/**
 * Setup PocketBase collections for testing
 */
async function setupCollections() {
    console.log('📦 Setting up PocketBase collections...')

    // Login as admin
    const authResponse = await fetch(`${POCKETBASE_URL}/api/admins/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            identity: ADMIN_EMAIL,
            password: ADMIN_PASSWORD
        })
    })

    if (!authResponse.ok) {
        throw new Error('Failed to authenticate as admin')
    }

    const { token } = await authResponse.json()

    // Create test_items collection
    const collectionSchema = {
        name: 'test_items',
        type: 'base',
        schema: [
            {
                name: 'name',
                type: 'text',
                required: true
            },
            {
                name: 'description',
                type: 'text',
                required: false
            },
            {
                name: 'embedding',
                type: 'json',
                required: false
            },
            {
                name: 'metadata',
                type: 'json',
                required: false
            }
        ]
    }

    const createResponse = await fetch(`${POCKETBASE_URL}/api/collections`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(collectionSchema)
    })

    if (createResponse.ok) {
        console.log('✅ Collection "test_items" created')
    } else if (createResponse.status === 400) {
        console.log('ℹ️  Collection "test_items" already exists')
    } else {
        const error = await createResponse.text()
        throw new Error(`Failed to create collection: ${error}`)
    }
}

/**
 * Seed test data
 */
async function seedData() {
    console.log('🌱 Seeding test data...')

    const testItems = [
        {
            name: "Czerwona walizka",
            description: "Duża czerwona walizka vintage z lat 60, skórzana",
            metadata: { color: "red", size: "large", era: "1960s" }
        },
        {
            name: "Niebieska torba",
            description: "Mała niebieska torba podróżna, nowoczesna",
            metadata: { color: "blue", size: "small", era: "modern" }
        },
        {
            name: "Stara lampa",
            description: "Antyczna lampa naftowa z mosiądzu",
            metadata: { material: "brass", type: "oil lamp", era: "antique" }
        },
        {
            name: "Krzesło drewniane",
            description: "Rustykalne krzesło z drewna dębowego",
            metadata: { material: "oak", type: "chair", style: "rustic" }
        },
        {
            name: "Szklana waza",
            description: "Przezroczysta waza kryształowa, wysoka",
            metadata: { material: "crystal", type: "vase", size: "tall" }
        }
    ]

    for (const item of testItems) {
        const response = await fetch(`${POCKETBASE_URL}/api/collections/test_items/records`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
        })

        if (response.ok) {
            console.log(`  ✓ Added: ${item.name}`)
        } else {
            console.log(`  ✗ Failed to add: ${item.name}`)
        }
    }

    console.log('✅ Seeding completed')
}

/**
 * Reset all data
 */
async function resetData() {
    console.log('🗑️  Resetting test data...')

    // Get all records
    const response = await fetch(`${POCKETBASE_URL}/api/collections/test_items/records`)

    if (!response.ok) {
        console.log('ℹ️  No data to reset')
        return
    }

    const { items } = await response.json()

    // Delete all records
    for (const item of items) {
        await fetch(`${POCKETBASE_URL}/api/collections/test_items/records/${item.id}`, {
            method: 'DELETE'
        })
    }

    console.log(`✅ Deleted ${items.length} records`)
}

/**
 * Main CLI
 */
async function main() {
    const command = process.argv[2]

    try {
        switch (command) {
            case 'setup':
                await setupCollections()
                break

            case 'seed':
                await seedData()
                break

            case 'reset':
                await resetData()
                break

            case 'all':
                await setupCollections()
                await seedData()
                break

            default:
                console.log('Usage:')
                console.log('  npx tsx scripts/pocketbase-helper.ts setup   - Create collections')
                console.log('  npx tsx scripts/pocketbase-helper.ts seed    - Add test data')
                console.log('  npx tsx scripts/pocketbase-helper.ts reset   - Delete all data')
                console.log('  npx tsx scripts/pocketbase-helper.ts all     - Setup + Seed')
                process.exit(1)
        }
    } catch (error) {
        console.error('❌ Error:', error instanceof Error ? error.message : error)
        process.exit(1)
    }
}

main()
