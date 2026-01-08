#!/usr/bin/env tsx
/**
 * Multi-Vector Search Quality Test
 * Tests search across different intent categories with real queries
 */

// CRITICAL: Load env vars BEFORE importing any modules that use GEMINI_API_KEY
import dotenv from 'dotenv'
import path from 'path'

const envPath = path.resolve(process.cwd(), '.env.local')
const envConfig = dotenv.config({ path: envPath })

// Explicitly set GEMINI_API_KEY if not already in environment
if (!process.env.GEMINI_API_KEY && envConfig.parsed?.GEMINI_API_KEY) {
    process.env.GEMINI_API_KEY = envConfig.parsed.GEMINI_API_KEY
}

// NOW import modules that depend on GEMINI_API_KEY
import { createClient } from '@supabase/supabase-js'
import { generateEmbedding } from '../utils/embeddings'
import { TaskType } from '@google/generative-ai'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials')
    process.exit(1)
}

if (!process.env.GEMINI_API_KEY) {
    console.error('❌ Missing GEMINI_API_KEY')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false }
})

// Test scenarios organized by intent
const TEST_QUERIES = {
    physical: [
        { query: 'czerwone', expectedIntent: 'physical', description: 'Color attribute' },
        { query: 'metalowe', expectedIntent: 'physical', description: 'Material attribute' },
        { query: 'duże pudła', expectedIntent: 'physical', description: 'Size + object' },
        { query: 'szklane butelki', expectedIntent: 'physical', description: 'Material + object' }
    ],
    context: [
        { query: 'kuchenne', expectedIntent: 'context', description: 'Location/usage' },
        { query: 'wesele', expectedIntent: 'context', description: 'Event context' },
        { query: 'lata 60', expectedIntent: 'context', description: 'Era context' },
        { query: 'biuro', expectedIntent: 'context', description: 'Location context' }
    ],
    specific: [
        { query: 'krzesła', expectedIntent: 'specific', description: 'Single word, specific item' },
        { query: 'lampa', expectedIntent: 'specific', description: 'Single word, specific item' },
        { query: 'stół', expectedIntent: 'specific', description: 'Single word, specific item' }
    ],
    default: [
        { query: 'czerwone krzesła w kuchni', expectedIntent: 'default', description: 'Mixed intent' },
        { query: 'stare drewniane meble', expectedIntent: 'default', description: 'Multiple attributes' }
    ]
}

// Intent classification logic (copied from unifiedSearch)
function classifyQueryIntent(query: string): 'physical' | 'context' | 'specific' | 'default' {
    const q = query.toLowerCase()

    const physicalKeywords = [
        'ostre', 'tępe', 'metalowe', 'drewniane', 'szklane', 'plastikowe', 'papierowe',
        'czerwone', 'zielone', 'niebieskie', 'żółte', 'czarne', 'białe', 'kolorowe',
        'duże', 'małe', 'wysokie', 'niskie', 'długie', 'ciężkie', 'lekkie',
        'stare', 'nowe', 'zardzewiałe', 'zniszczone', 'antyk'
    ]
    if (physicalKeywords.some(k => q.includes(k))) return 'physical'

    const contextKeywords = [
        'kuchni', 'kuchenne', 'łazienki', 'salon', 'biuro', 'szkoła', 'klasa',
        'wesele', 'ślub', 'pogrzeb', 'święta', 'boże narodzenie', 'wielkanoc',
        'lata 20', 'lata 30', 'lata 40', 'lata 50', 'lata 60', 'lata 70', 'lata 80', 'lata 90',
        'wojenne', 'średniowieczne', 'futurystyczne',
        'jedzenie', 'picie', 'dekoracja'
    ]
    if (contextKeywords.some(k => q.includes(k))) return 'context'

    const wordCount = q.split(/\s+/).length
    if (wordCount <= 2) return 'specific'

    return 'default'
}

function getWeightsForIntent(intent: 'physical' | 'context' | 'specific' | 'default') {
    switch (intent) {
        case 'physical':
            return { identity: 0.2, physical: 0.7, context: 0.1 }
        case 'context':
            return { identity: 0.3, physical: 0.2, context: 0.5 }
        case 'specific':
            return { identity: 0.9, physical: 0.1, context: 0.0 }
        case 'default':
        default:
            return { identity: 0.3, physical: 0.3, context: 0.4 }
    }
}

interface SearchResult {
    id: string
    name: string
    score: number
    match_type: string
}

async function testQuery(query: string, expectedIntent: string, description: string) {
    console.log(`\n📝 Testing: "${query}" (${description})`)

    // Classify intent
    const detectedIntent = classifyQueryIntent(query)
    const intentMatch = detectedIntent === expectedIntent ? '✅' : '❌'
    console.log(`   Intent: ${detectedIntent} ${intentMatch} (expected: ${expectedIntent})`)

    // Get weights
    const weights = getWeightsForIntent(detectedIntent)
    console.log(`   Weights: ID=${weights.identity}, PHYS=${weights.physical}, CTX=${weights.context}`)

    // Generate embedding
    const queryEmbedding = await generateEmbedding(query, TaskType.RETRIEVAL_QUERY)

    // Execute search
    const { data, error } = await supabase.rpc('search_global_hybrid_mv', {
        query_text: query,
        query_embedding: JSON.stringify(queryEmbedding),
        weight_identity: weights.identity,
        weight_physical: weights.physical,
        weight_context: weights.context,
        match_threshold: 0.4,
        match_count: 5,
        fuzzy_threshold: 0.3
    })

    if (error) {
        console.error(`   ❌ Search error:`, error.message)
        return { success: false, intentCorrect: detectedIntent === expectedIntent }
    }

    const results = data as SearchResult[]
    console.log(`   Results: ${results.length} items`)

    // Show top 3 results
    results.slice(0, 3).forEach((r, i) => {
        console.log(`   ${i + 1}. ${r.name} (${r.score.toFixed(3)}, ${r.match_type})`)
    })

    // Analyze result quality
    const hasVectorMatch = results.some(r => r.match_type === 'vector')
    const topScore = results[0]?.score || 0
    const qualityGood = hasVectorMatch && topScore > 0.6

    console.log(`   Quality: ${qualityGood ? '✅ Good' : '⚠️  Low'} (top score: ${topScore.toFixed(3)}, has vector: ${hasVectorMatch})`)

    return {
        success: true,
        intentCorrect: detectedIntent === expectedIntent,
        qualityGood,
        hasVectorMatch,
        topScore
    }
}

async function runTests() {
    console.log('🧪 Multi-Vector Search Quality Test\n')
    console.log('='.repeat(60))

    const stats = {
        total: 0,
        intentCorrect: 0,
        qualityGood: 0,
        hasVector: 0,
        failed: 0
    }

    // Test each category
    for (const [category, queries] of Object.entries(TEST_QUERIES)) {
        console.log(`\n\n🔍 Category: ${category.toUpperCase()}`)
        console.log('-'.repeat(60))

        for (const test of queries) {
            stats.total++
            const result = await testQuery(test.query, test.expectedIntent, test.description)

            if (!result.success) {
                stats.failed++
                continue
            }

            if (result.intentCorrect) stats.intentCorrect++
            if (result.qualityGood) stats.qualityGood++
            if (result.hasVectorMatch) stats.hasVector++

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500))
        }
    }

    // Summary
    console.log('\n\n' + '='.repeat(60))
    console.log('📊 TEST SUMMARY')
    console.log('='.repeat(60))
    console.log(`Total Queries:        ${stats.total}`)
    console.log(`Intent Accuracy:      ${stats.intentCorrect}/${stats.total} (${(stats.intentCorrect / stats.total * 100).toFixed(1)}%)`)
    console.log(`Quality Good:         ${stats.qualityGood}/${stats.total} (${(stats.qualityGood / stats.total * 100).toFixed(1)}%)`)
    console.log(`Vector Matches:       ${stats.hasVector}/${stats.total} (${(stats.hasVector / stats.total * 100).toFixed(1)}%)`)
    console.log(`Failed:               ${stats.failed}/${stats.total}`)

    const overallSuccess = stats.intentCorrect >= stats.total * 0.8 &&
        stats.qualityGood >= stats.total * 0.7 &&
        stats.failed === 0

    console.log(`\n${overallSuccess ? '✅ TESTS PASSED' : '❌ TESTS FAILED'}`)

    process.exit(overallSuccess ? 0 : 1)
}

runTests().catch(console.error)
