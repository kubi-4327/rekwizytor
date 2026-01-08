'use server'

/**
 * Granular keyword count test (5-20) with smart batching
 * Run with: npx tsx scripts/test-keyword-granular.ts
 * 
 * Strategy: 
 * 1. Pre-generate ALL query embeddings (text-embedding-004 has high limits)
 * 2. Generate enrichments in batches with proper delays (gemini-2.0-flash-exp = 10/min)
 * 3. Generate doc embeddings in batches
 * 4. Calculate similarities locally
 */

import { GoogleGenerativeAI, TaskType } from '@google/generative-ai'
import * as dotenv from 'dotenv'
import * as fs from 'fs'

dotenv.config({ path: '.env.local' })

const geminiApiKey = process.env.GEMINI_API_KEY!
const genAI = new GoogleGenerativeAI(geminiApiKey)
const textModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })
const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' })

// 5 diverse categories (reduced for faster testing, ~9 min)
const TEST_CATEGORIES = [
    { name: 'broń sceniczna', queries: ['coś ostrego', 'broń', 'niebezpieczne'] },
    { name: 'krzesła', queries: ['meble', 'drewniane', 'siedzenie'] },
    { name: 'talerze', queries: ['naczynia', 'porcelana', 'kuchenne'] },
    { name: 'koszyki wiklinowe', queries: ['plecione', 'naturalne', 'dekoracje'] },
    { name: 'płyty winylowe', queries: ['muzyka', 'vintage', 'retro'] }
]

// Word counts: 5 to 20
const WORD_COUNTS = Array.from({ length: 16 }, (_, i) => i + 5)

// Rate limit: 10 requests per minute = 6 seconds between requests
const TEXT_GEN_DELAY = 6500 // 6.5 seconds to be safe

function cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0, normA = 0, normB = 0
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i]
        normA += a[i] * a[i]
        normB += b[i] * b[i]
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

async function generateEnrichedText(name: string, wordCount: number): Promise<string> {
    const prompt = `Dla grupy rekwizytów "${name}", wygeneruj DOKŁADNIE ${wordCount} słów kluczowych.
Opisuj właściwości ORYGINAŁU (miecz=ostry), nie repliki.
Format: ${name}: słowo1, słowo2...
Zwróć DOKŁADNIE ${wordCount} słów.`

    const result = await textModel.generateContent(prompt)
    return result.response.text().trim()
}

async function generateEmbedding(text: string, taskType: TaskType): Promise<number[]> {
    const result = await embeddingModel.embedContent({
        content: { role: 'user', parts: [{ text }] },
        taskType
    })
    return result.embedding.values
}

async function main() {
    console.log('\n📊 GRANULAR KEYWORD COUNT TEST (5-20 words)')
    console.log('='.repeat(70))
    console.log(`Testing ${TEST_CATEGORIES.length} categories × ${WORD_COUNTS.length} word counts`)
    console.log(`Estimated time: ~${Math.ceil((TEST_CATEGORIES.length * WORD_COUNTS.length * TEXT_GEN_DELAY) / 60000)} minutes`)
    console.log('')

    // STEP 1: Pre-generate all query embeddings (fast, high rate limit)
    console.log('📍 Step 1: Generating query embeddings...')
    const queryEmbeddings: Record<string, number[]> = {}

    for (const cat of TEST_CATEGORIES) {
        for (const query of cat.queries) {
            if (!queryEmbeddings[query]) {
                queryEmbeddings[query] = await generateEmbedding(query, TaskType.RETRIEVAL_QUERY)
                await new Promise(r => setTimeout(r, 100))
            }
        }
    }
    console.log(`   Generated ${Object.keys(queryEmbeddings).length} unique query embeddings\n`)

    // STEP 2: Generate enriched texts and embeddings (slow due to rate limits)
    console.log('📍 Step 2: Generating enrichments and embeddings...')
    console.log('   This will take a while due to API rate limits.\n')

    interface Result {
        category: string
        wordCount: number
        enrichedText: string
        avgScore: number
        scores: { query: string; score: number }[]
    }
    const results: Result[] = []

    let requestCount = 0
    const totalRequests = TEST_CATEGORIES.length * WORD_COUNTS.length

    for (const cat of TEST_CATEGORIES) {
        console.log(`\n🔍 ${cat.name}`)

        for (const wordCount of WORD_COUNTS) {
            requestCount++
            process.stdout.write(`   [${requestCount}/${totalRequests}] ${wordCount} words... `)

            try {
                // Generate enriched text
                const enrichedText = await generateEnrichedText(cat.name, wordCount)

                // Generate embedding for enriched text
                const docEmb = await generateEmbedding(enrichedText, TaskType.RETRIEVAL_DOCUMENT)

                // Calculate scores against all queries for this category
                const scores = cat.queries.map(query => ({
                    query,
                    score: cosineSimilarity(queryEmbeddings[query], docEmb)
                }))
                const avgScore = scores.reduce((sum, s) => sum + s.score, 0) / scores.length

                results.push({
                    category: cat.name,
                    wordCount,
                    enrichedText,
                    avgScore,
                    scores
                })

                console.log(`✓ avg: ${(avgScore * 100).toFixed(1)}%`)

                // Wait for rate limit
                await new Promise(r => setTimeout(r, TEXT_GEN_DELAY))

            } catch (error: any) {
                if (error?.status === 429) {
                    console.log('⏳ Rate limited, waiting 60s...')
                    await new Promise(r => setTimeout(r, 60000))
                    // Retry this item
                    requestCount--
                } else {
                    console.log(`✗ Error: ${error.message}`)
                }
            }
        }
    }

    // STEP 3: Analyze and output results
    console.log('\n\n📈 RESULTS SUMMARY')
    console.log('='.repeat(70))

    // Calculate average per word count across all categories
    const avgByWordCount: Record<number, { sum: number; count: number }> = {}
    for (const r of results) {
        if (!avgByWordCount[r.wordCount]) avgByWordCount[r.wordCount] = { sum: 0, count: 0 }
        avgByWordCount[r.wordCount].sum += r.avgScore
        avgByWordCount[r.wordCount].count++
    }

    console.log('\n| Words | Avg Score | Categories Tested |')
    console.log('|-------|-----------|-------------------|')

    const sortedResults: { wordCount: number; avg: number }[] = []
    for (const wc of WORD_COUNTS) {
        const data = avgByWordCount[wc]
        if (data && data.count > 0) {
            const avg = data.sum / data.count
            sortedResults.push({ wordCount: wc, avg })
            console.log(`|  ${String(wc).padStart(4)} | ${(avg * 100).toFixed(1).padStart(8)}% | ${String(data.count).padStart(17)} |`)
        }
    }

    sortedResults.sort((a, b) => b.avg - a.avg)
    console.log('\n🏆 RANKING (best to worst):')
    sortedResults.forEach((r, i) => {
        console.log(`   ${i + 1}. ${r.wordCount} words: ${(r.avg * 100).toFixed(2)}%`)
    })

    // Save detailed results to file
    const report = {
        timestamp: new Date().toISOString(),
        summary: sortedResults,
        details: results
    }
    fs.writeFileSync('keyword-count-results.json', JSON.stringify(report, null, 2))
    console.log('\n💾 Detailed results saved to: keyword-count-results.json')
}

main().catch(console.error)
