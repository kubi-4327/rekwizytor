/**
 * Test script for Intent Classification System
 * Run with: npx tsx scripts/test-intent-classifier.ts
 */

import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') })

import { createScriptClient } from '../utils/supabase/script-client'
import { geminiFlash } from '../utils/gemini'

const supabase = createScriptClient()

const TEST_QUERIES = [
    // Physical queries
    'duży czerwony stół',
    'mały drewniany krzesło',
    'metalowe ostre nożyce',

    // Identity queries
    'rekwizyty Hamleta',
    'co używa główna postać',
    'czyja to brzytwa',

    // Mixed queries
    'duża czerwona suknia aktorki',
    'szklana butelka z pierwszej sceny',

    // Edge cases
    'ostre',
    'rekwizyt',
]

async function testRuleBasedClassification(query: string) {
    // Load keywords
    const { data: keywords } = await supabase
        .from('intent_keywords')
        .select('keyword, identity_weight, physical_weight')

    if (!keywords || keywords.length === 0) {
        return null
    }

    // Tokenize
    const tokens = query
        .toLowerCase()
        .replace(/[^\w\sąćęłńóśźż]/gi, ' ')
        .split(/\s+/)
        .filter(token => token.length > 1)

    // Match keywords
    let identitySum = 0
    let physicalSum = 0
    let matchCount = 0

    for (const token of tokens) {
        const keyword = keywords.find(k => k.keyword === token)
        if (keyword) {
            identitySum += keyword.identity_weight
            physicalSum += keyword.physical_weight
            matchCount++
        }
    }

    if (matchCount === 0) {
        return null
    }

    return {
        identity: identitySum / tokens.length,
        physical: physicalSum / tokens.length,
        confidence: matchCount / tokens.length,
        source: 'rules' as const
    }
}

async function testLLMClassification(query: string) {
    if (!geminiFlash) {
        return null
    }

    const startTime = Date.now()

    try {
        const prompt = `Przeanalizuj zapytanie wyszukiwania i określ wagi (0.0-1.0) dla dwóch kontekstów:

- IDENTITY: kto używa, czyje to, jaka rola/postać
- PHYSICAL: jak wygląda, wymiary, kolor, materiał

Zapytanie: "${query}"

ODPOWIEDZ TYLKO JSON (bez markdown):
{"identity": 0.X, "physical": 0.X}`

        const result = await geminiFlash.generateContent(prompt)
        const latencyMs = Date.now() - startTime
        const responseText = result.response.text().trim()

        const jsonMatch = responseText.match(/\{[^}]+\}/)
        if (!jsonMatch) {
            return null
        }

        const weights = JSON.parse(jsonMatch[0])

        return {
            identity: Math.max(0, Math.min(1, weights.identity)),
            physical: Math.max(0, Math.min(1, weights.physical)),
            confidence: 1.0,
            source: 'llm' as const,
            latencyMs
        }
    } catch (error) {
        console.error('  LLM error:', error)
        return null
    }
}

async function main() {
    console.log('🧪 Intent Classification System Test\n')
    console.log('='.repeat(80))

    // Test 1: Check database setup
    console.log('\n📊 Test 1: Database Setup')
    console.log('-'.repeat(80))

    const { data: keywords, error: keywordsError } = await supabase
        .from('intent_keywords')
        .select('*')
        .limit(5)

    if (keywordsError) {
        console.error('❌ Error loading keywords:', keywordsError)
    } else {
        console.log(`✅ Loaded ${keywords?.length || 0} keywords (showing first 5)`)
        keywords?.forEach(k => {
            console.log(`  "${k.keyword}": identity=${k.identity_weight}, physical=${k.physical_weight}`)
        })
    }

    // Test 2: Rule-based classification
    console.log('\n\n📏 Test 2: Rule-Based Classification')
    console.log('-'.repeat(80))

    for (const query of TEST_QUERIES.slice(0, 3)) {
        const result = await testRuleBasedClassification(query)
        console.log(`\nQuery: "${query}"`)
        if (result) {
            console.log(`  Identity: ${result.identity.toFixed(2)} | Physical: ${result.physical.toFixed(2)}`)
            console.log(`  Confidence: ${result.confidence.toFixed(2)} | Source: ${result.source}`)
        } else {
            console.log('  ⚠️  No rule match found')
        }
    }

    // Test 3: LLM classification
    console.log('\n\n🤖 Test 3: LLM Classification (sample queries)')
    console.log('-'.repeat(80))

    for (const query of TEST_QUERIES.slice(0, 5)) {
        const result = await testLLMClassification(query)
        console.log(`\nQuery: "${query}"`)
        if (result) {
            console.log(`  Identity: ${result.identity.toFixed(2)} | Physical: ${result.physical.toFixed(2)}`)
            console.log(`  Source: ${result.source} | Latency: ${result.latencyMs}ms`)
        } else {
            console.log('  ⚠️  LLM classification failed')
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 800))
    }

    // Test 4: Check stats table exists
    console.log('\n\n📊 Test 4: Stats Table')
    console.log('-'.repeat(80))

    const { data: stats, error: statsError } = await supabase
        .from('intent_classification_stats')
        .select('*')
        .limit(5)

    if (statsError) {
        console.log('  ℹ️  Stats table exists but no data yet (expected)')
    } else {
        console.log(`  ${stats?.length || 0} stats records found`)
    }

    console.log('\n' + '='.repeat(80))
    console.log('✅ Tests completed!')
}

main().catch(console.error)
