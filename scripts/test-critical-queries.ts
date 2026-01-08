#!/usr/bin/env tsx
/**
 * PROFESSION/ACTION SEARCH TEST
 * Testing user-reported critical failures
 */

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

// User-reported critical failures
const CRITICAL_QUERIES = [
    { query: 'fryzjer', expected: ['nożyczki', 'grzebienie', 'szczotki'], description: 'Hairdresser tools' },
    { query: 'golenie', expected: ['brzytwy', 'maszynki'], description: 'Shaving tools' },
    { query: 'nauczanie', expected: ['książki', 'tablice', 'kredki'], description: 'Teaching materials' },
    { query: 'gotowanie', expected: ['garnki', 'patelnie', 'noże'], description: 'Cooking tools' },
    { query: 'sprzątanie', expected: ['mopy', 'szczotki', 'wiadra'], description: 'Cleaning tools' }
]

async function testCriticalQuery(query: string, expectedItems: string[], description: string) {
    console.log(`\n🔍 "${query}" (${description})`)
    console.log('─'.repeat(60))

    const queryEmb = await generateEmbedding(query, TaskType.RETRIEVAL_QUERY)
    const weights = { identity: 0.3, physical: 0.2, context: 0.5 }

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
        return null
    }

    const results = data as Array<{ name: string, score: number, match_type: string }>

    console.log(`\nTop 5 Results:`)
    results.slice(0, 5).forEach((r, i) => {
        const isExpected = expectedItems.some(exp => r.name.toLowerCase().includes(exp.toLowerCase()))
        const marker = isExpected ? '✅' : '❌'
        console.log(`${marker} ${i + 1}. ${r.name} (${r.score.toFixed(3)}, ${r.match_type})`)
    })

    const top1 = results[0]
    const top1Expected = expectedItems.some(exp => top1.name.toLowerCase().includes(exp.toLowerCase()))

    console.log(`\n#1 Result: ${top1Expected ? '✅ CORRECT' : '🔴 WRONG'}`)
    if (!top1Expected) {
        console.log(`   Got: "${top1.name}" instead of expected items`)
    }

    return {
        query,
        top1: top1.name,
        top1Score: top1.score,
        top1Correct: top1Expected,
        foundInTop5: results.slice(0, 5).filter(r =>
            expectedItems.some(exp => r.name.toLowerCase().includes(exp.toLowerCase()))
        ).length
    }
}

async function runCriticalTests() {
    console.log('🚨 CRITICAL QUERY TEST')
    console.log('Testing user-reported failures')
    console.log('='.repeat(70))

    const results = []

    for (const test of CRITICAL_QUERIES) {
        const result = await testCriticalQuery(test.query, test.expected, test.description)
        if (result) results.push({ ...test, ...result })
        await new Promise(resolve => setTimeout(resolve, 500))
    }

    console.log('\n\n' + '='.repeat(70))
    console.log('📊 CRITICAL FAILURES SUMMARY')
    console.log('='.repeat(70))

    const top1Correct = results.filter(r => r.top1Correct).length
    console.log(`\n#1 Position Accuracy: ${top1Correct}/${results.length} (${(top1Correct / results.length * 100).toFixed(0)}%)`)

    console.log(`\n🔴 WRONG #1 Results:`)
    results.filter(r => !r.top1Correct).forEach(r => {
        console.log(`   "${r.query}" → "${r.top1}" (${r.top1Score.toFixed(3)})`)
        console.log(`      Expected: ${r.expected.join(', ')}`)
        console.log(`      Found in top 5: ${r.foundInTop5}/${r.expected.length}`)
    })

    console.log('\n💡 DIAGNOSIS:')
    if (top1Correct === 0) {
        console.log('   🔴 CATASTROPHIC: 0% top-1 accuracy')
        console.log('   → Context embeddings completely miss action/profession semantics')
    } else if (top1Correct < results.length * 0.5) {
        console.log('   🔴 CRITICAL: <50% top-1 accuracy')
        console.log('   → System unreliable for verb/action queries')
    }

    console.log('\n🔧 REQUIRED FIX:')
    console.log('   1. Update enrichment prompt to include PURPOSE phrases')
    console.log('      Example: "używane do golenia", "do fryzjerstwa"')
    console.log('   2. Regenerate ALL embeddings with new prompt')
    console.log('   3. Increase context weight from 0.5 to 0.7 for verb queries')

    console.log('\n' + '='.repeat(70))
}

runCriticalTests().catch(console.error)
