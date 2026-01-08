#!/usr/bin/env tsx
/**
 * TEST NEW ENRICHMENT PROMPT
 * Verify that updated prompt generates purpose phrases
 */

import dotenv from 'dotenv'
import path from 'path'

const envPath = path.resolve(process.cwd(), '.env.local')
const envConfig = dotenv.config({ path: envPath })

if (!process.env.GEMINI_API_KEY && envConfig.parsed?.GEMINI_API_KEY) {
    process.env.GEMINI_API_KEY = envConfig.parsed.GEMINI_API_KEY
}

import { enrichGroupNameForEmbedding } from '../utils/group-embedding-enrichment'

const TEST_GROUPS = [
    'nożyczki fryzjerskie',
    'brzytwa',
    'książki',
    'garnki',
    'mopy'
]

async function testEnrichment() {
    console.log('🧪 TESTING NEW ENRICHMENT PROMPT')
    console.log('='.repeat(70))

    for (const groupName of TEST_GROUPS) {
        console.log(`\n📝 Group: "${groupName}"`)
        console.log('─'.repeat(60))

        const enrichment = await enrichGroupNameForEmbedding(groupName)

        console.log(`Identity: ${enrichment.identity}`)
        console.log(`Physical: ${enrichment.physical}`)
        console.log(`Context:  ${enrichment.context}`)

        // Check for purpose phrases
        const hasDo = enrichment.context?.toLowerCase().includes(' do ')
        const hasUzywane = enrichment.context?.toLowerCase().includes('używane')
        const hasSluzy = enrichment.context?.toLowerCase().includes('służy')

        console.log(`\n✅ Purpose Phrases Check:`)
        console.log(`   "do X":       ${hasDo ? '✅' : '❌'}`)
        console.log(`   "używane":    ${hasUzywane ? '✅' : '❌'}`)
        console.log(`   "służy":      ${hasSluzy ? '✅' : '❌'}`)

        const hasPurpose = hasDo || hasUzywane || hasSluzy
        console.log(`   Overall:      ${hasPurpose ? '✅ PASS' : '❌ FAIL'}`)

        await new Promise(resolve => setTimeout(resolve, 500))
    }

    console.log('\n' + '='.repeat(70))
    console.log('✅ If all groups show purpose phrases, the fix is working!')
    console.log('Next step: Regenerate ALL embeddings with new prompt')
    console.log('='.repeat(70))
}

testEnrichment().catch(console.error)
