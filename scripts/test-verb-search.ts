#!/usr/bin/env tsx
/**
 * VERB-BASED SEARCH TEST
 * Testing action/purpose-based queries (czasownikowe)
 */

// Enable hybrid search for this test
process.env.USE_HYBRID_SEARCH = 'true'

import dotenv from 'dotenv'
import path from 'path'

const envPath = path.resolve(process.cwd(), '.env.local')
const envConfig = dotenv.config({ path: envPath })

if (!process.env.GEMINI_API_KEY && envConfig.parsed?.GEMINI_API_KEY) {
    process.env.GEMINI_API_KEY = envConfig.parsed.GEMINI_API_KEY
}

import { createClient } from '@supabase/supabase-js'
import { generateEmbedding } from '../utils/embeddings'
import { TaskType } from '@google/generative-ai'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false }
})

// Verb-based test queries
const VERB_QUERIES = [
    { query: 'do picia', expected: ['butelki', 'kufle', 'szklanki', 'kubki'], description: 'Drinking vessels' },
    { query: 'do gotowania', expected: ['garnki', 'patelnie', 'miski'], description: 'Cooking items' },
    { query: 'do sprzątania', expected: ['mopy', 'szczotki', 'wiadra'], description: 'Cleaning items' },
    { query: 'do siedzenia', expected: ['krzesła', 'ławki', 'taborety'], description: 'Seating' },
    { query: 'do pisania', expected: ['długopisy', 'ołówki', 'maszyny do pisania'], description: 'Writing tools' },
    { query: 'do oświetlenia', expected: ['lampy', 'świece', 'latarnie'], description: 'Lighting' },
    { query: 'do czytania', expected: ['książki', 'gazety', 'czasopisma'], description: 'Reading materials' },
    { query: 'do dekoracji', expected: ['kwiaty', 'obrazy', 'wazony'], description: 'Decoration' }
]

async function testVerbQuery(query: string, expectedItems: string[], description: string) {
    console.log(`\n🔍 Testing: "${query}" (${description})`)
    console.log('─'.repeat(60))

    // Generate query embedding
    const queryEmb = await generateEmbedding(query, TaskType.RETRIEVAL_QUERY)

    // Classify as context (verb queries are about usage context)
    const weights = { identity: 0.3, physical: 0.2, context: 0.5 }
    console.log(`Weights: ID=${weights.identity}, PHYS=${weights.physical}, CTX=${weights.context}`)

    // Execute search
    const { data, error } = await supabase.rpc('search_global_hybrid_mv', {
        query_text: query,
        query_embedding: JSON.stringify(queryEmb),
        weight_identity: weights.identity,
        weight_physical: weights.physical,
        weight_context: weights.context,
        match_threshold: 0.4,
        match_count: 10,
        fuzzy_threshold: 0.3
    })

    if (error) {
        console.error(`❌ Error:`, error.message)
        return { success: false, foundCount: 0, totalExpected: expectedItems.length }
    }

    const results = data as Array<{ name: string, score: number, match_type: string }>

    console.log(`\nTop 10 Results:`)
    results.slice(0, 10).forEach((r, i) => {
        const isExpected = expectedItems.some(exp => r.name.toLowerCase().includes(exp.toLowerCase()))
        const marker = isExpected ? '✅' : '  '
        console.log(`${marker} ${i + 1}. ${r.name} (${r.score.toFixed(3)}, ${r.match_type})`)
    })

    // Count how many expected items found in top 10
    const foundCount = expectedItems.filter(exp =>
        results.slice(0, 10).some(r => r.name.toLowerCase().includes(exp.toLowerCase()))
    ).length

    console.log(`\nFound: ${foundCount}/${expectedItems.length} expected items`)

    if (foundCount < expectedItems.length) {
        const missing = expectedItems.filter(exp =>
            !results.slice(0, 10).some(r => r.name.toLowerCase().includes(exp.toLowerCase()))
        )
        console.log(`❌ Missing: ${missing.join(', ')}`)
    }

    return {
        success: true,
        foundCount,
        totalExpected: expectedItems.length,
        topScore: results[0]?.score || 0
    }
}

async function runVerbTests() {
    console.log('🎯 VERB-BASED SEARCH TEST')
    console.log('Testing action/purpose queries (do + czasownik)')
    console.log('='.repeat(70))

    const results = []

    for (const test of VERB_QUERIES) {
        const result = await testVerbQuery(test.query, test.expected, test.description)
        results.push({ ...test, ...result })
        await new Promise(resolve => setTimeout(resolve, 500))
    }

    // Summary
    console.log('\n\n' + '='.repeat(70))
    console.log('📊 VERB SEARCH SUMMARY')
    console.log('='.repeat(70))

    const totalExpected = results.reduce((sum, r) => sum + r.totalExpected, 0)
    const totalFound = results.reduce((sum, r) => sum + r.foundCount, 0)

    console.log(`\nOverall Accuracy: ${totalFound}/${totalExpected} (${(totalFound / totalExpected * 100).toFixed(1)}%)`)

    const perfectMatches = results.filter(r => r.foundCount === r.totalExpected).length
    const partialMatches = results.filter(r => r.foundCount > 0 && r.foundCount < r.totalExpected).length
    const failures = results.filter(r => r.foundCount === 0).length

    console.log(`\nPerfect Matches: ${perfectMatches}/${results.length}`)
    console.log(`Partial Matches: ${partialMatches}/${results.length}`)
    console.log(`Complete Fails:  ${failures}/${results.length}`)

    if (failures > 0) {
        console.log(`\n❌ Failed Queries:`)
        results.filter(r => r.foundCount === 0).forEach(r => {
            console.log(`   - "${r.query}" (${r.description})`)
            console.log(`     Expected: ${r.expected.join(', ')}`)
        })
    }

    console.log('\n🔍 ROOT CAUSE:')
    if (totalFound < totalExpected * 0.3) {
        console.log('   🔴 CRITICAL: Verb-based search is broken')
        console.log('   → Context embeddings do not capture usage/purpose')
        console.log('   → Enrichment needs to add "używane do X" phrases')
    } else if (totalFound < totalExpected * 0.6) {
        console.log('   🟡 MODERATE: Verb-based search is weak')
        console.log('   → Some context captured but not comprehensive')
        console.log('   → Consider boosting context weight for verb queries')
    } else {
        console.log('   🟢 GOOD: Verb-based search works reasonably well')
    }

    console.log('\n' + '='.repeat(70))
}

runVerbTests().catch(console.error)
