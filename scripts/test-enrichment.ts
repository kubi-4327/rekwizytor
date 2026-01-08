'use server'

/**
 * Test Enrichment Script
 * Run with: npx tsx scripts/test-enrichment.ts "brzytwy"
 */

import { GoogleGenerativeAI, TaskType } from '@google/generative-ai'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const geminiApiKey = process.env.GEMINI_API_KEY!

async function testEnrichment(groupName: string) {
    console.log('\n🧪 TEST ENRICHMENT FUNCTION')
    console.log('='.repeat(60))
    console.log(`Group Name: "${groupName}"`)
    console.log('='.repeat(60))

    if (!geminiApiKey) {
        console.error('❌ GEMINI_API_KEY not set!')
        return
    }
    console.log('✅ GEMINI_API_KEY is set')

    // Test enrichment
    const genAI = new GoogleGenerativeAI(geminiApiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

    const prompt = `Jesteś ekspertem od kategoryzacji przedmiotów teatralnych i rekwizytów.

Dla podanej nazwy grupy przedmiotów, wygeneruj 5-10 słów kluczowych które opisują:
- Typ przedmiotu
- Materiał
- Zastosowanie
- Charakterystykę fizyczną
- Kontekst użycia

Nazwa grupy: "${groupName}"

Odpowiedź w formacie: nazwa: słowo1, słowo2, słowo3, ...

Przykłady:
- "brzytwy" → "brzytwy: ostre narzędzie, golenie, metalowe, składane, fryzjerskie, niebezpieczne"
- "owoce" → "owoce: jedzenie, dekoracja, kolorowe, świeże, naturalne, organiczne"
- "butelki po winie" → "butelki po winie: szklane, puste, alkohol, dekoracja, pojemniki"

Odpowiedź (tylko słowa kluczowe, bez dodatkowych wyjaśnień):`

    console.log('\n📤 Calling Gemini for enrichment...')

    try {
        const result = await model.generateContent(prompt)
        const enrichedText = result.response.text().trim()

        console.log('\n✅ ENRICHED TEXT:')
        console.log('-'.repeat(60))
        console.log(enrichedText)
        console.log('-'.repeat(60))

        // Now generate embeddings for both raw and enriched
        console.log('\n📊 Generating embeddings...')

        const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' })

        // Raw embedding
        const rawResult = await embeddingModel.embedContent({
            content: { role: 'user', parts: [{ text: groupName }] },
            taskType: TaskType.RETRIEVAL_DOCUMENT
        })

        // Enriched embedding
        const enrichedResult = await embeddingModel.embedContent({
            content: { role: 'user', parts: [{ text: enrichedText }] },
            taskType: TaskType.RETRIEVAL_DOCUMENT
        })

        // Test query
        const testQuery = "coś ostrego"
        const queryResult = await embeddingModel.embedContent({
            content: { role: 'user', parts: [{ text: testQuery }] },
            taskType: TaskType.RETRIEVAL_QUERY
        })

        const rawSimilarity = cosineSimilarity(queryResult.embedding.values, rawResult.embedding.values)
        const enrichedSimilarity = cosineSimilarity(queryResult.embedding.values, enrichedResult.embedding.values)

        console.log('\n🎯 SIMILARITY COMPARISON for query "coś ostrego":')
        console.log(`- Raw name "${groupName}": ${(rawSimilarity * 100).toFixed(2)}%`)
        console.log(`- Enriched text: ${(enrichedSimilarity * 100).toFixed(2)}%`)
        console.log(`- Improvement: ${((enrichedSimilarity - rawSimilarity) * 100).toFixed(2)}%`)

        if (enrichedSimilarity > rawSimilarity) {
            console.log('\n✅ ENRICHMENT IMPROVES SIMILARITY!')
        } else {
            console.log('\n⚠️ Enrichment did NOT improve similarity')
        }

    } catch (error) {
        console.error('\n❌ ERROR:', error)
    }
}

function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i]
        normA += a[i] * a[i]
        normB += b[i] * b[i]
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB)
    return magnitude === 0 ? 0 : dotProduct / magnitude
}

// Run with command line argument
const groupName = process.argv[2] || 'brzytwy'
testEnrichment(groupName).catch(console.error)
