// Quick test script to verify embedding generation works
import { generateEmbedding } from './utils/embeddings'
import { TaskType } from '@google/generative-ai'

async function testEmbedding() {
    try {
        console.log('Testing embedding generation...')

        const testQueries = [
            'brzytwy',
            'ostre narzędzie',
            'narzędzie do golenia'
        ]

        for (const query of testQueries) {
            console.log(`\nGenerating embedding for: "${query}"`)
            const embedding = await generateEmbedding(query, TaskType.RETRIEVAL_QUERY)
            console.log(`✅ Success! Embedding length: ${embedding.length}`)
            console.log(`First 5 values: ${embedding.slice(0, 5).join(', ')}`)
        }

        console.log('\n✅ All embeddings generated successfully!')
    } catch (error) {
        console.error('❌ Error:', error)
    }
}

testEmbedding()
