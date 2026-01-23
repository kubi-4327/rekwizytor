/**
 * Compare embeddings from different APIs
 * 
 * Usage:
 *   npx tsx scripts/compare-embeddings.ts --api=openai
 *   npx tsx scripts/compare-embeddings.ts --api=gemini --limit=10
 * 
 * Supported APIs:
 *   - openai (text-embedding-3-small)
 *   - cohere (embed-multilingual-v3.0)
 *   - gemini (text-embedding-004)
 */

import { config } from 'dotenv'

// Load environment variables from .env.local
config({ path: '.env.local' })

const PB_URL = 'http://localhost:8090'

interface TestItem {
    id: string
    name: string
    description: string | null
    gemini_embedding_identity: number[] | null
    gemini_embedding_physical: number[] | null
    gemini_embedding_context: number[] | null
}

/**
 * Cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
    if (!a || !b || a.length !== b.length) {
        return 0
    }

    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0)
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0))
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0))

    if (magnitudeA === 0 || magnitudeB === 0) {
        return 0
    }

    return dotProduct / (magnitudeA * magnitudeB)
}

/**
 * Generate embedding using OpenAI
 */
async function generateEmbeddingOpenAI(text: string): Promise<number[]> {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
        throw new Error('OPENAI_API_KEY not found in environment')
    }

    const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: text
        })
    })

    if (!response.ok) {
        const error = await response.text()
        throw new Error(`OpenAI API error: ${error}`)
    }

    const data = await response.json()
    return data.data[0].embedding
}

/**
 * Generate embedding using Gemini
 */
async function generateEmbeddingGemini(text: string): Promise<number[]> {
    const apiKey = process.env.GOOGLE_AI_API_KEY
    if (!apiKey) {
        throw new Error('GOOGLE_AI_API_KEY not found in environment')
    }

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: {
                    parts: [{ text }]
                }
            })
        }
    )

    if (!response.ok) {
        const error = await response.text()
        throw new Error(`Gemini API error: ${error}`)
    }

    const data = await response.json()
    return data.embedding.values
}

/**
 * Generate embedding using Cohere
 */
async function generateEmbeddingCohere(text: string): Promise<number[]> {
    const apiKey = process.env.COHERE_API_KEY
    if (!apiKey) {
        throw new Error('COHERE_API_KEY not found in environment')
    }

    const response = await fetch('https://api.cohere.ai/v1/embed', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'embed-multilingual-v3.0',
            texts: [text],
            input_type: 'search_document'
        })
    })

    if (!response.ok) {
        const error = await response.text()
        throw new Error(`Cohere API error: ${error}`)
    }

    const data = await response.json()
    return data.embeddings[0]
}

/**
 * Generate embedding based on API choice
 */
async function generateEmbedding(text: string, api: string): Promise<number[]> {
    switch (api) {
        case 'openai':
            return generateEmbeddingOpenAI(text)
        case 'gemini':
            return generateEmbeddingGemini(text)
        case 'cohere':
            return generateEmbeddingCohere(text)
        default:
            throw new Error(`Unsupported API: ${api}`)
    }
}

async function compareEmbeddings(api: string, limit?: number) {
    console.log(`🔬 Porównywanie embedingów: Gemini vs ${api.toUpperCase()}\n`)

    // Fetch items from PocketBase
    let url = `${PB_URL}/api/collections/test_items/records?perPage=500`
    if (limit) {
        url = `${PB_URL}/api/collections/test_items/records?perPage=${limit}`
    }

    const response = await fetch(url)
    if (!response.ok) {
        throw new Error('Failed to fetch items from PocketBase')
    }

    const { items } = await response.json()

    // Filter items that have Gemini embeddings
    const itemsWithEmbeddings = items.filter((item: TestItem) =>
        item.gemini_embedding_identity || item.gemini_embedding_physical || item.gemini_embedding_context
    )

    console.log(`📊 Znaleziono ${itemsWithEmbeddings.length} przedmiotów z embedingami Gemini\n`)

    if (itemsWithEmbeddings.length === 0) {
        console.log('⚠️  Brak przedmiotów do porównania')
        return
    }

    let processed = 0
    let errors = 0

    for (const item of itemsWithEmbeddings) {
        try {
            // Generate text for embedding
            const text = `${item.name}${item.description ? ` ${item.description}` : ''}`

            // Generate embedding from test API
            console.log(`  Processing: ${item.name}`)
            const testEmbedding = await generateEmbedding(text, api)

            // Calculate similarities with all three Gemini embeddings
            const similarities = {
                identity: item.gemini_embedding_identity
                    ? cosineSimilarity(testEmbedding, item.gemini_embedding_identity)
                    : null,
                physical: item.gemini_embedding_physical
                    ? cosineSimilarity(testEmbedding, item.gemini_embedding_physical)
                    : null,
                context: item.gemini_embedding_context
                    ? cosineSimilarity(testEmbedding, item.gemini_embedding_context)
                    : null
            }

            // Calculate average similarity
            const validSimilarities = [
                similarities.identity,
                similarities.physical,
                similarities.context
            ].filter(s => s !== null) as number[]

            const averageSimilarity = validSimilarities.length > 0
                ? validSimilarities.reduce((sum, s) => sum + s, 0) / validSimilarities.length
                : 0

            // Save comparison to PocketBase
            const comparisonRecord = {
                item_id: item.id,
                item_name: item.name,
                gemini_embedding_identity: item.gemini_embedding_identity,
                gemini_embedding_physical: item.gemini_embedding_physical,
                gemini_embedding_context: item.gemini_embedding_context,
                test_embedding: testEmbedding,
                test_api_name: api,
                gemini_dimensions: item.gemini_embedding_identity?.length || 768,
                test_dimensions: testEmbedding.length,
                similarity_identity: similarities.identity,
                similarity_physical: similarities.physical,
                similarity_context: similarities.context,
                similarity_average: averageSimilarity
            }

            await fetch(`${PB_URL}/api/collections/test_embeddings_comparison/records`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(comparisonRecord)
            })

            processed++
            console.log(`    ✓ Similarity: ${(averageSimilarity * 100).toFixed(1)}% (avg)`)

            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 100))

        } catch (error) {
            errors++
            console.error(`    ✗ Error:`, error instanceof Error ? error.message : error)
        }
    }

    console.log(`\n✅ Porównanie zakończone!`)
    console.log(`\n📊 Statystyki:`)
    console.log(`   Przetworzono: ${processed}`)
    console.log(`   Błędy: ${errors}`)
    console.log(`\n💡 Zobacz wyniki w PocketBase: ${PB_URL}/_/`)
}

async function main() {
    // Parse CLI arguments
    const args = process.argv.slice(2)
    const apiArg = args.find(arg => arg.startsWith('--api='))
    const limitArg = args.find(arg => arg.startsWith('--limit='))

    if (!apiArg) {
        console.error('❌ Brak parametru --api')
        console.log('\nUżycie:')
        console.log('  npx tsx scripts/compare-embeddings.ts --api=openai')
        console.log('  npx tsx scripts/compare-embeddings.ts --api=gemini --limit=10')
        console.log('\nDostępne API: openai, gemini, cohere')
        process.exit(1)
    }

    const api = apiArg.split('=')[1]
    const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined

    // Check if PocketBase is running
    try {
        const response = await fetch(`${PB_URL}/api/health`)
        if (!response.ok) {
            throw new Error('PocketBase not responding')
        }
    } catch (error) {
        console.error('❌ PocketBase nie jest uruchomiony!')
        console.log('\n💡 Uruchom PocketBase: npm run test:start')
        process.exit(1)
    }

    await compareEmbeddings(api, limit)
}

main().catch(console.error)
