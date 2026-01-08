'use server'

/**
 * Comprehensive Search Quality Analysis
 * Run with: npx tsx scripts/search-quality-analysis.ts
 */

import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI, TaskType } from '@google/generative-ai'
import * as dotenv from 'dotenv'
import * as fs from 'fs'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const geminiApiKey = process.env.GEMINI_API_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)
const genAI = new GoogleGenerativeAI(geminiApiKey)
const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' })

// 50 diverse search queries that users might use
const TEST_QUERIES = [
    // Semantic / conceptual queries
    "coś ostrego",
    "przedmioty świąteczne",
    "rekwizyty retro",
    "coś do jedzenia",
    "przedmioty vintage",
    "rzeczy do siedzenia",
    "coś czerwonego",
    "przedmioty biurowe",
    "sprzęt kuchenny",
    "rekwizyty wojenne",

    // Descriptive queries
    "stare meble",
    "nowoczesne gadżety",
    "antyczne przedmioty",
    "luksusowe akcesoria",
    "dziecięce zabawki",
    "sportowy sprzęt",
    "eleganckie dodatki",
    "rustykalne dekoracje",
    "industrialne elementy",
    "romantyczne rekwizyty",

    // Contextual queries
    "na wesele",
    "do sceny balowej",
    "na scenę pogrzebową",
    "do komedii",
    "do dramatu",
    "na przyjęcie",
    "do sceny w restauracji",
    "do sceny w biurze",
    "na ulicę",
    "do domu",

    // Material-based queries
    "drewniane",
    "metalowe",
    "szklane",
    "plastikowe",
    "skórzane",
    "materiałowe",
    "papierowe",
    "wiklinowe",
    "porcelanowe",
    "gumowe",

    // Category/type queries
    "broń",
    "meble",
    "naczynia",
    "ubrania",
    "biżuteria",
    "książki",
    "instrumenty",
    "bagaże",
    "narzędzia",
    "dekoracje"
]

interface EmbeddingStats {
    entityType: string
    total: number
    withEmbedding: number
    withoutEmbedding: number
    coveragePercent: number
}

interface SearchResult {
    query: string
    topResults: { name: string; score: number; type: string }[]
    avgScore: number
    maxScore: number
    minScore: number
    aboveThreshold50: number
    aboveThreshold60: number
    aboveThreshold70: number
}

async function checkEmbeddingCoverage(): Promise<EmbeddingStats[]> {
    console.log('\n📊 CHECKING EMBEDDING COVERAGE')
    console.log('='.repeat(60))

    const stats: EmbeddingStats[] = []

    // Check groups
    const { data: groups } = await supabase
        .from('vw_searchable_entities')
        .select('id, name, embedding, entity_type')
        .eq('entity_type', 'group')

    if (groups) {
        const withEmb = groups.filter(g => g.embedding !== null).length
        stats.push({
            entityType: 'Groups',
            total: groups.length,
            withEmbedding: withEmb,
            withoutEmbedding: groups.length - withEmb,
            coveragePercent: Math.round((withEmb / groups.length) * 100)
        })
    }

    // Check all entity types
    const { data: allEntities } = await supabase
        .from('vw_searchable_entities')
        .select('id, name, embedding, entity_type')

    if (allEntities) {
        const byType: Record<string, { total: number; withEmb: number }> = {}

        allEntities.forEach(e => {
            if (!byType[e.entity_type]) {
                byType[e.entity_type] = { total: 0, withEmb: 0 }
            }
            byType[e.entity_type].total++
            if (e.embedding) byType[e.entity_type].withEmb++
        })

        Object.entries(byType).forEach(([type, data]) => {
            if (type !== 'group') { // Already added groups
                stats.push({
                    entityType: type.charAt(0).toUpperCase() + type.slice(1) + 's',
                    total: data.total,
                    withEmbedding: data.withEmb,
                    withoutEmbedding: data.total - data.withEmb,
                    coveragePercent: data.total > 0 ? Math.round((data.withEmb / data.total) * 100) : 0
                })
            }
        })
    }

    // Print stats
    console.log('\n| Entity Type    | Total | With Emb | Without | Coverage |')
    console.log('|----------------|-------|----------|---------|----------|')
    stats.forEach(s => {
        console.log(`| ${s.entityType.padEnd(14)} | ${String(s.total).padStart(5)} | ${String(s.withEmbedding).padStart(8)} | ${String(s.withoutEmbedding).padStart(7)} | ${String(s.coveragePercent).padStart(7)}% |`)
    })

    return stats
}

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

async function runSearchTests(): Promise<SearchResult[]> {
    console.log('\n🔍 RUNNING 50 SEARCH QUALITY TESTS')
    console.log('='.repeat(60))

    // Fetch all entities with embeddings
    const { data: entities } = await supabase
        .from('vw_searchable_entities')
        .select('id, name, embedding, entity_type')

    if (!entities || entities.length === 0) {
        console.error('No entities found!')
        return []
    }

    const entitiesWithEmb = entities.filter(e => e.embedding !== null)
    console.log(`Found ${entitiesWithEmb.length} entities with embeddings`)

    const results: SearchResult[] = []

    for (let i = 0; i < TEST_QUERIES.length; i++) {
        const query = TEST_QUERIES[i]
        process.stdout.write(`\r  Testing ${i + 1}/${TEST_QUERIES.length}: "${query.substring(0, 30)}"...`.padEnd(60))

        try {
            // Generate query embedding
            const embResult = await embeddingModel.embedContent({
                content: { role: 'user', parts: [{ text: query }] },
                taskType: TaskType.RETRIEVAL_QUERY
            })
            const queryEmb = embResult.embedding.values

            // Calculate similarities
            const similarities = entitiesWithEmb.map(entity => {
                const entityEmb = typeof entity.embedding === 'string'
                    ? JSON.parse(entity.embedding)
                    : entity.embedding
                const score = cosineSimilarity(queryEmb, entityEmb)
                return { name: entity.name, score, type: entity.entity_type }
            }).sort((a, b) => b.score - a.score)

            const top10 = similarities.slice(0, 10)
            const scores = similarities.map(s => s.score)

            results.push({
                query,
                topResults: top10,
                avgScore: scores.reduce((a, b) => a + b, 0) / scores.length,
                maxScore: Math.max(...scores),
                minScore: Math.min(...scores),
                aboveThreshold50: scores.filter(s => s >= 0.5).length,
                aboveThreshold60: scores.filter(s => s >= 0.6).length,
                aboveThreshold70: scores.filter(s => s >= 0.7).length
            })

            // Small delay to avoid rate limiting
            await new Promise(r => setTimeout(r, 100))

        } catch (error: any) {
            console.error(`\nError testing "${query}":`, error.message)
            results.push({
                query,
                topResults: [],
                avgScore: 0,
                maxScore: 0,
                minScore: 0,
                aboveThreshold50: 0,
                aboveThreshold60: 0,
                aboveThreshold70: 0
            })
        }
    }

    console.log('\n')
    return results
}

function analyzeResults(results: SearchResult[]) {
    console.log('\n📈 SEARCH QUALITY ANALYSIS')
    console.log('='.repeat(60))

    // Overall stats
    const avgMaxScore = results.reduce((s, r) => s + r.maxScore, 0) / results.length
    const avgAvgScore = results.reduce((s, r) => s + r.avgScore, 0) / results.length
    const totalAbove50 = results.reduce((s, r) => s + r.aboveThreshold50, 0)
    const totalAbove60 = results.reduce((s, r) => s + r.aboveThreshold60, 0)
    const totalAbove70 = results.reduce((s, r) => s + r.aboveThreshold70, 0)

    console.log('\n📊 Overall Statistics:')
    console.log(`   Average max score: ${(avgMaxScore * 100).toFixed(2)}%`)
    console.log(`   Average avg score: ${(avgAvgScore * 100).toFixed(2)}%`)
    console.log(`   Average results above 50%: ${(totalAbove50 / results.length).toFixed(1)}`)
    console.log(`   Average results above 60%: ${(totalAbove60 / results.length).toFixed(1)}`)
    console.log(`   Average results above 70%: ${(totalAbove70 / results.length).toFixed(1)}`)

    // Best performing queries (highest max score)
    console.log('\n✅ Best Performing Queries (highest similarity):')
    const sortedByMax = [...results].sort((a, b) => b.maxScore - a.maxScore)
    sortedByMax.slice(0, 10).forEach((r, i) => {
        console.log(`   ${i + 1}. "${r.query}" → ${(r.maxScore * 100).toFixed(1)}% (${r.topResults[0]?.name || 'N/A'})`)
    })

    // Worst performing queries (lowest max score)
    console.log('\n❌ Worst Performing Queries (lowest similarity):')
    sortedByMax.slice(-10).reverse().forEach((r, i) => {
        console.log(`   ${i + 1}. "${r.query}" → ${(r.maxScore * 100).toFixed(1)}% (${r.topResults[0]?.name || 'N/A'})`)
    })

    // Queries with no good matches (max < 50%)
    const noGoodMatches = results.filter(r => r.maxScore < 0.5)
    if (noGoodMatches.length > 0) {
        console.log(`\n⚠️ Queries with no good matches (max < 50%): ${noGoodMatches.length}`)
        noGoodMatches.forEach(r => {
            console.log(`   • "${r.query}" → max: ${(r.maxScore * 100).toFixed(1)}%`)
        })
    }

    // Category analysis
    console.log('\n📂 Query Category Analysis:')
    const categories = [
        { name: 'Semantic/Conceptual', queries: TEST_QUERIES.slice(0, 10) },
        { name: 'Descriptive', queries: TEST_QUERIES.slice(10, 20) },
        { name: 'Contextual', queries: TEST_QUERIES.slice(20, 30) },
        { name: 'Material-based', queries: TEST_QUERIES.slice(30, 40) },
        { name: 'Category/Type', queries: TEST_QUERIES.slice(40, 50) }
    ]

    categories.forEach(cat => {
        const catResults = results.filter(r => cat.queries.includes(r.query))
        const avgMax = catResults.reduce((s, r) => s + r.maxScore, 0) / catResults.length
        const avgAbove50 = catResults.reduce((s, r) => s + r.aboveThreshold50, 0) / catResults.length
        console.log(`   ${cat.name}: avg max ${(avgMax * 100).toFixed(1)}%, avg above 50%: ${avgAbove50.toFixed(1)}`)
    })

    return {
        avgMaxScore,
        avgAvgScore,
        noGoodMatchesCount: noGoodMatches.length,
        categories
    }
}

function generateReport(embStats: EmbeddingStats[], searchResults: SearchResult[], analysis: any) {
    console.log('\n📝 GENERATING REPORT')
    console.log('='.repeat(60))

    const report = `# Search Quality Analysis Report
Generated: ${new Date().toISOString()}

## 1. Embedding Coverage

| Entity Type | Total | With Embedding | Coverage |
|-------------|-------|----------------|----------|
${embStats.map(s => `| ${s.entityType} | ${s.total} | ${s.withEmbedding} | ${s.coveragePercent}% |`).join('\n')}

## 2. Search Quality Summary

- **Average max similarity**: ${(analysis.avgMaxScore * 100).toFixed(2)}%
- **Average avg similarity**: ${(analysis.avgAvgScore * 100).toFixed(2)}%
- **Queries with no good matches**: ${analysis.noGoodMatchesCount} / 50

## 3. Top 10 Best Performing Queries

| Query | Max Score | Best Match |
|-------|-----------|------------|
${[...searchResults].sort((a, b) => b.maxScore - a.maxScore).slice(0, 10).map(r =>
        `| ${r.query} | ${(r.maxScore * 100).toFixed(1)}% | ${r.topResults[0]?.name || 'N/A'} |`
    ).join('\n')}

## 4. Top 10 Worst Performing Queries

| Query | Max Score | Best Match |
|-------|-----------|------------|
${[...searchResults].sort((a, b) => a.maxScore - b.maxScore).slice(0, 10).map(r =>
        `| ${r.query} | ${(r.maxScore * 100).toFixed(1)}% | ${r.topResults[0]?.name || 'N/A'} |`
    ).join('\n')}

## 5. Detailed Results by Query

${searchResults.map(r => `
### "${r.query}"
- Max: ${(r.maxScore * 100).toFixed(1)}%, Avg: ${(r.avgScore * 100).toFixed(1)}%
- Above 50%: ${r.aboveThreshold50}, Above 60%: ${r.aboveThreshold60}, Above 70%: ${r.aboveThreshold70}
- Top 5:
${r.topResults.slice(0, 5).map((t, i) => `  ${i + 1}. ${t.name} (${t.type}) - ${(t.score * 100).toFixed(1)}%`).join('\n')}
`).join('\n')}

## 6. Recommendations

${analysis.noGoodMatchesCount > 10 ? '⚠️ **High priority**: Many queries have no good matches. Consider:' : '✅ Most queries have decent matches. Consider:'}

1. **Improve enrichment prompts** - Current keywords may not capture all semantic relationships
2. **Add synonyms** - Include Polish synonyms and related terms in enriched text
3. **Lower threshold carefully** - Current 0.4 may be too low, but raising it needs more data
4. **Consider re-ranking** - Use a second-stage ranker for top results
5. **Hybrid scoring** - Combine FTS score with vector score for better results
`

    // Save report
    const reportPath = 'search-quality-report.md'
    fs.writeFileSync(reportPath, report)
    console.log(`\n✅ Report saved to: ${reportPath}`)
}

async function main() {
    console.log('\n🚀 COMPREHENSIVE SEARCH QUALITY ANALYSIS')
    console.log('='.repeat(60))
    console.log('This will test 50 different search queries against your embeddings')
    console.log('and generate a detailed report with recommendations.\n')

    // Step 1: Check embedding coverage
    const embStats = await checkEmbeddingCoverage()

    // Step 2: Run search tests
    const searchResults = await runSearchTests()

    // Step 3: Analyze results
    const analysis = analyzeResults(searchResults)

    // Step 4: Generate report
    generateReport(embStats, searchResults, analysis)

    console.log('\n🎉 Analysis complete!')
}

main().catch(console.error)
