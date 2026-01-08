'use server'

/**
 * Test how keyword count affects embedding search quality
 * Run with: npx tsx scripts/test-keyword-count.ts
 */

import { GoogleGenerativeAI, TaskType } from '@google/generative-ai'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const geminiApiKey = process.env.GEMINI_API_KEY!
const genAI = new GoogleGenerativeAI(geminiApiKey)
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })
const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' })

// Test 15 diverse categories
const TEST_CASES = [
    { groupName: 'broń sceniczna', expectedMatches: ['coś ostrego', 'broń', 'niebezpieczne'] },
    { groupName: 'krzesła', expectedMatches: ['meble', 'drewniane', 'siedzenie'] },
    { groupName: 'talerze', expectedMatches: ['naczynia', 'porcelana', 'kuchenne'] },
    { groupName: 'deski', expectedMatches: ['drewniane', 'budowlane', 'płaskie'] },
    { groupName: 'butelki po winie', expectedMatches: ['szklane', 'alkohol', 'eleganckie'] },
    { groupName: 'koszyki wiklinowe', expectedMatches: ['plecione', 'naturalne', 'dekoracje'] },
    { groupName: 'płyty winylowe', expectedMatches: ['muzyka', 'vintage', 'retro'] },
    { groupName: 'gazety', expectedMatches: ['papierowe', 'prasa', 'czytanie'] },
    { groupName: 'miski metalowe', expectedMatches: ['metalowe', 'kuchenne', 'naczynia'] },
    { groupName: 'lampy', expectedMatches: ['oświetlenie', 'światło', 'elektryczne'] },
    { groupName: 'książki', expectedMatches: ['czytanie', 'papierowe', 'biblioteka'] },
    { groupName: 'walizki', expectedMatches: ['podróż', 'bagaż', 'pakowanie'] },
    { groupName: 'obrazy', expectedMatches: ['dekoracje', 'sztuka', 'ściana'] },
    { groupName: 'telefony', expectedMatches: ['komunikacja', 'elektronika', 'dzwonienie'] },
    { groupName: 'owoce sztuczne', expectedMatches: ['jedzenie', 'plastikowe', 'dekoracyjne'] }
]

// Word counts to test (max 30)
const WORD_COUNTS = [5, 10, 15, 20, 30]

// Longer delays to avoid rate limits
const DELAY_BETWEEN_ENRICHMENTS = 3000  // 3 seconds between enrichment calls
const DELAY_BETWEEN_EMBEDDINGS = 200    // 200ms between embedding calls

function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0
    let dotProduct = 0, normA = 0, normB = 0
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i]
        normA += a[i] * a[i]
        normB += b[i] * b[i]
    }
    const magnitude = Math.sqrt(normA) * Math.sqrt(normB)
    return magnitude === 0 ? 0 : dotProduct / magnitude
}

async function generateEnrichedText(name: string, wordCount: number): Promise<string> {
    const prompt = `Dla grupy rekwizytów "${name}", wygeneruj DOKŁADNIE ${wordCount} słów kluczowych po polsku.

Uwzględnij: synonimy, materiały, właściwości, użycie.
Dla broni opisuj właściwości ORYGINAŁU (ostre, niebezpieczne), nie repliki.

Format: ${name}: słowo1, słowo2, słowo3...
Zwróć DOKŁADNIE ${wordCount} słów, nie więcej, nie mniej.`

    const result = await model.generateContent(prompt)
    return result.response.text().trim()
}

async function generateDocEmbedding(text: string): Promise<number[]> {
    const result = await embeddingModel.embedContent({
        content: { role: 'user', parts: [{ text }] },
        taskType: TaskType.RETRIEVAL_DOCUMENT
    })
    return result.embedding.values
}

async function generateQueryEmbedding(text: string): Promise<number[]> {
    const result = await embeddingModel.embedContent({
        content: { role: 'user', parts: [{ text }] },
        taskType: TaskType.RETRIEVAL_QUERY
    })
    return result.embedding.values
}

async function main() {
    console.log('\n📊 TESTING KEYWORD COUNT IMPACT ON SEARCH QUALITY')
    console.log('='.repeat(70))
    console.log('Testing word counts:', WORD_COUNTS.join(', '))
    console.log('')

    const results: Record<string, { wordCount: number; avgScore: number; enrichedText: string }[]> = {}

    for (const testCase of TEST_CASES) {
        console.log(`\n🔍 Testing: "${testCase.groupName}"`)
        console.log('-'.repeat(70))

        results[testCase.groupName] = []

        // Pre-generate query embeddings
        const queryEmbeddings: { query: string; embedding: number[] }[] = []
        for (const query of testCase.expectedMatches) {
            queryEmbeddings.push({
                query,
                embedding: await generateQueryEmbedding(query)
            })
            await new Promise(r => setTimeout(r, 100))
        }

        for (const wordCount of WORD_COUNTS) {
            console.log(`\n  📝 Testing ${wordCount} keywords...`)

            // Generate enriched text with specific word count
            const enrichedText = await generateEnrichedText(testCase.groupName, wordCount)
            const actualWords = enrichedText.split(':')[1]?.split(',').length || 0
            console.log(`     Generated: ${actualWords} words`)
            console.log(`     Text: ${enrichedText.substring(0, 80)}...`)

            // Generate embedding
            const docEmbedding = await generateDocEmbedding(enrichedText)

            // Calculate similarity for each expected query
            let totalScore = 0
            console.log(`     Query scores:`)
            for (const qe of queryEmbeddings) {
                const score = cosineSimilarity(qe.embedding, docEmbedding)
                console.log(`       "${qe.query}": ${(score * 100).toFixed(1)}%`)
                totalScore += score
            }

            const avgScore = totalScore / queryEmbeddings.length
            console.log(`     ⭐ Average: ${(avgScore * 100).toFixed(1)}%`)

            results[testCase.groupName].push({
                wordCount,
                avgScore,
                enrichedText
            })

            await new Promise(r => setTimeout(r, DELAY_BETWEEN_ENRICHMENTS))
        }
    }

    // Summary
    console.log('\n\n📈 SUMMARY: Average Score by Word Count')
    console.log('='.repeat(70))
    console.log('\n| Word Count |', TEST_CASES.map(t => t.groupName.substring(0, 15).padEnd(15)).join(' | '), '| Average |')
    console.log('|------------|', TEST_CASES.map(() => '---------------').join('-|-'), '|---------|')

    const avgByWordCount: Record<number, number[]> = {}

    for (const wordCount of WORD_COUNTS) {
        const row = [String(wordCount).padStart(10) + ' |']

        for (const testCase of TEST_CASES) {
            const result = results[testCase.groupName].find(r => r.wordCount === wordCount)
            const score = result ? (result.avgScore * 100).toFixed(1) + '%' : 'N/A'
            row.push(score.padStart(15))

            if (!avgByWordCount[wordCount]) avgByWordCount[wordCount] = []
            if (result) avgByWordCount[wordCount].push(result.avgScore)
        }

        const overallAvg = avgByWordCount[wordCount].length > 0
            ? ((avgByWordCount[wordCount].reduce((a, b) => a + b, 0) / avgByWordCount[wordCount].length) * 100).toFixed(1) + '%'
            : 'N/A'
        row.push(overallAvg.padStart(8))

        console.log('|' + row.join(' | ') + ' |')
    }

    // Find optimal
    const avgScores = Object.entries(avgByWordCount).map(([wc, scores]) => ({
        wordCount: Number(wc),
        avg: scores.reduce((a, b) => a + b, 0) / scores.length
    })).sort((a, b) => b.avg - a.avg)

    console.log('\n🏆 OPTIMAL WORD COUNT:', avgScores[0].wordCount, `(${(avgScores[0].avg * 100).toFixed(1)}% avg)`)
    console.log('   Ranking:', avgScores.map(s => `${s.wordCount} words: ${(s.avg * 100).toFixed(1)}%`).join(' → '))
}

main().catch(console.error)
