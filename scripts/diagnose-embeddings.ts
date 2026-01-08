#!/usr/bin/env tsx
/**
 * SIMPLIFIED DIAGNOSTIC: Manual Embedding Analysis
 * 
 * Since we can't easily fetch vectors via JS client, we'll:
 * 1. Get group names from DB
 * 2. Generate fresh embeddings for those groups
 * 3. Manually test search with those embeddings
 * 4. Compare results to identify issues
 */

// Load env vars BEFORE importing modules
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
import { enrichGroupNameForEmbedding } from '../utils/group-embedding-enrichment'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false }
})

// Test groups - manually selected for diversity
const TEST_GROUPS = [
    'medyczne',
    'krzesła',
    'miski metalowe',
    'książki',
    'lampy',
    'butelki po piwie',
    'papiery',
    'segregatory',
    'koszyki wiklinowe',
    'płyty winylowe'
]

// Test queries with expected results
const TEST_QUERIES = [
    { query: 'metalowe', expected: ['miski metalowe'], intent: 'physical' },
    { query: 'czerwone', expected: [], intent: 'physical' },  // Color test
    { query: 'biuro', expected: ['segregatory', 'papiery'], intent: 'context' },
    { query: 'kuchenne', expected: ['miski metalowe'], intent: 'context' },
    { query: 'krzesła', expected: ['krzesła'], intent: 'specific' },
    { query: 'lata 60', expected: ['płyty winylowe'], intent: 'context' }
]

async function analyzeGroupEmbedding(groupName: string) {
    console.log(`\n📝 Analyzing: "${groupName}"`)
    console.log('─'.repeat(60))

    // Generate enrichment
    const enrichment = await enrichGroupNameForEmbedding(groupName)
    console.log(`Identity: ${enrichment.identity}`)
    console.log(`Physical: ${enrichment.physical}`)
    console.log(`Context:  ${enrichment.context}`)

    // Check if enrichment makes sense
    const hasIdentity = enrichment.identity && enrichment.identity !== groupName
    const hasPhysical = enrichment.physical && enrichment.physical.length > 5
    const hasContext = enrichment.context && enrichment.context.length > 5

    console.log(`\nQuality Check:`)
    console.log(`  Identity enriched: ${hasIdentity ? '✅' : '❌'}`)
    console.log(`  Physical enriched: ${hasPhysical ? '✅' : '❌'}`)
    console.log(`  Context enriched:  ${hasContext ? '✅' : '❌'}`)

    return {
        groupName,
        enrichment,
        quality: {
            hasIdentity,
            hasPhysical,
            hasContext
        }
    }
}

async function testSearchQuery(query: string, expectedGroups: string[], intent: string) {
    console.log(`\n🔍 Testing Query: "${query}" (${intent})`)
    console.log('─'.repeat(60))

    // Generate query embedding
    const queryEmb = await generateEmbedding(query, TaskType.RETRIEVAL_QUERY)

    // Determine weights based on intent
    let weights = { identity: 0.3, physical: 0.3, context: 0.4 }
    if (intent === 'physical') weights = { identity: 0.2, physical: 0.7, context: 0.1 }
    if (intent === 'context') weights = { identity: 0.3, physical: 0.2, context: 0.5 }
    if (intent === 'specific') weights = { identity: 0.9, physical: 0.1, context: 0.0 }

    console.log(`Weights: ID=${weights.identity}, PHYS=${weights.physical}, CTX=${weights.context}`)

    // Execute search via RPC
    const { data, error } = await supabase.rpc('search_global_hybrid_mv', {
        query_text: query,
        query_embedding: JSON.stringify(queryEmb),
        weight_identity: weights.identity,
        weight_physical: weights.physical,
        weight_context: weights.context,
        match_threshold: 0.4,
        match_count: 5,
        fuzzy_threshold: 0.3
    })

    if (error) {
        console.error(`❌ Search error:`, error.message)
        return { success: false }
    }

    const results = data as Array<{ name: string, score: number, match_type: string }>

    console.log(`\nResults (${results.length}):`)
    results.slice(0, 5).forEach((r, i) => {
        const isExpected = expectedGroups.includes(r.name)
        const marker = isExpected ? '✅' : '  '
        console.log(`${marker} ${i + 1}. ${r.name} (${r.score.toFixed(3)}, ${r.match_type})`)
    })

    // Check if expected results are in top 5
    const foundExpected = expectedGroups.filter(exp =>
        results.slice(0, 5).some(r => r.name === exp)
    )

    console.log(`\nExpected in Top 5: ${foundExpected.length}/${expectedGroups.length}`)
    if (foundExpected.length < expectedGroups.length) {
        const missing = expectedGroups.filter(exp => !foundExpected.includes(exp))
        console.log(`❌ Missing: ${missing.join(', ')}`)
    }

    return {
        success: true,
        foundExpected: foundExpected.length,
        totalExpected: expectedGroups.length,
        topResult: results[0]?.name,
        topScore: results[0]?.score
    }
}

async function runDiagnostics() {
    console.log('🏥 EMBEDDING QUALITY DIAGNOSTIC')
    console.log('='.repeat(70))

    // PHASE 1: Analyze enrichment quality for test groups
    console.log('\n\nPHASE 1: ENRICHMENT QUALITY ANALYSIS')
    console.log('='.repeat(70))

    const enrichmentResults = []
    for (const groupName of TEST_GROUPS.slice(0, 5)) {  // First 5 for speed
        const result = await analyzeGroupEmbedding(groupName)
        enrichmentResults.push(result)
        await new Promise(resolve => setTimeout(resolve, 500))
    }

    // PHASE 2: Test search queries
    console.log('\n\nPHASE 2: SEARCH MECHANISM VALIDATION')
    console.log('='.repeat(70))

    const searchResults = []
    for (const test of TEST_QUERIES) {
        const result = await testSearchQuery(test.query, test.expected, test.intent)
        searchResults.push({ ...test, ...result })
        await new Promise(resolve => setTimeout(resolve, 500))
    }

    // FINAL REPORT
    console.log('\n\n' + '='.repeat(70))
    console.log('📊 DIAGNOSTIC SUMMARY')
    console.log('='.repeat(70))

    console.log('\n1. ENRICHMENT QUALITY:')
    const goodEnrichment = enrichmentResults.filter(r =>
        r.quality.hasIdentity && r.quality.hasPhysical && r.quality.hasContext
    ).length
    console.log(`   Fully Enriched: ${goodEnrichment}/${enrichmentResults.length}`)

    const poorEnrichment = enrichmentResults.filter(r =>
        !r.quality.hasPhysical || !r.quality.hasContext
    )
    if (poorEnrichment.length > 0) {
        console.log(`\n   ⚠️  Poorly Enriched Groups:`)
        poorEnrichment.forEach(r => {
            console.log(`   - ${r.groupName}`)
            if (!r.quality.hasPhysical) console.log(`     Missing physical attributes`)
            if (!r.quality.hasContext) console.log(`     Missing context`)
        })
    }

    console.log('\n2. SEARCH ACCURACY:')
    const successfulSearches = searchResults.filter(r =>
        r.success && r.foundExpected !== undefined && r.totalExpected !== undefined && r.foundExpected === r.totalExpected
    ).length
    console.log(`   Perfect Matches: ${successfulSearches}/${searchResults.length}`)

    const partialMatches = searchResults.filter(r =>
        r.success && r.foundExpected !== undefined && r.totalExpected !== undefined && r.foundExpected > 0 && r.foundExpected < r.totalExpected
    ).length
    console.log(`   Partial Matches: ${partialMatches}/${searchResults.length}`)

    const failures = searchResults.filter(r => !r.success || (r.foundExpected !== undefined && r.foundExpected === 0)).length
    console.log(`   Failures:        ${failures}/${searchResults.length}`)

    if (failures > 0) {
        console.log(`\n   ❌ Failed Queries:`)
        searchResults.filter(r => !r.success || (r.foundExpected !== undefined && r.foundExpected === 0)).forEach(r => {
            console.log(`   - "${r.query}" (${r.intent})`)
            console.log(`     Expected: ${r.expected.join(', ') || '(none)'}`)
            console.log(`     Got top:  ${r.topResult} (${r.topScore?.toFixed(3)})`)
        })
    }

    console.log('\n3. ROOT CAUSE ANALYSIS:')

    if (goodEnrichment < enrichmentResults.length * 0.7) {
        console.log('   🔴 PRIMARY ISSUE: Poor Enrichment Quality')
        console.log('   → AI is not generating meaningful physical/context descriptions')
        console.log('   → This leads to weak embeddings and poor search results')
        console.log('   → FIX: Improve enrichment prompts or use better examples')
    } else if (failures > searchResults.length * 0.5) {
        console.log('   🔴 PRIMARY ISSUE: Search Mechanism Failure')
        console.log('   → Enrichment looks good but search returns wrong results')
        console.log('   → Possible causes: wrong weights, threshold too high, or RPC bug')
        console.log('   → FIX: Adjust weights or lower match_threshold')
    } else if (partialMatches > successfulSearches) {
        console.log('   🟡 MODERATE ISSUE: Search Ranking')
        console.log('   → Expected results are found but not in top positions')
        console.log('   → Weight tuning or score boosting may help')
    } else {
        console.log('   🟢 System Health: Good')
        console.log('   → Enrichment quality is acceptable')
        console.log('   → Search returns expected results')
    }

    console.log('\n' + '='.repeat(70))
}

runDiagnostics().catch(console.error)
