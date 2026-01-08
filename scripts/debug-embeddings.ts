'use server'

/**
 * Embedding Debug Script
 * Run with: npx tsx scripts/debug-embeddings.ts "coś ostrego"
 */

import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI, TaskType } from '@google/generative-ai'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const geminiApiKey = process.env.GEMINI_API_KEY!

async function debugEmbeddings(query: string) {
    console.log('\n🔍 DEBUG EMBEDDING SEARCH')
    console.log('='.repeat(60))
    console.log(`Query: "${query}"`)
    console.log('='.repeat(60))

    // 1. Generate query embedding
    const genAI = new GoogleGenerativeAI(geminiApiKey)
    const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' })

    console.log('\n📊 Generating query embedding...')
    const result = await embeddingModel.embedContent({
        content: { role: 'user', parts: [{ text: query }] },
        taskType: TaskType.RETRIEVAL_QUERY
    })
    const queryEmbedding = result.embedding.values
    console.log(`✅ Query embedding generated (${queryEmbedding.length} dimensions)`)

    // 2. Connect to Supabase
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // 3. Get ALL entities with embeddings from the materialized view (same as search uses)
    console.log('\n📦 Fetching entities with embeddings from vw_searchable_entities...')
    const { data: entities, error } = await supabase
        .from('vw_searchable_entities')
        .select('entity_type, id, name, description, embedding')
        .not('embedding', 'is', null)
        .limit(500)

    if (error) {
        console.error('Error fetching entities:', error)
        // Try groups table directly as fallback
        console.log('\n🔄 Trying groups table directly...')
        const { data: groups, error: groupsError } = await supabase
            .from('groups')
            .select('id, name, embedding')
            .limit(50)
        console.log('Groups query result:', { count: groups?.length, error: groupsError, sample: groups?.[0] })
        return
    }

    console.log(`Found ${entities?.length || 0} entities with embeddings`)

    // 4. Calculate cosine similarity for each group
    const similarities: { name: string; type: string; similarity: number }[] = []

    for (const entity of entities || []) {
        if (!entity.embedding) continue

        // Parse embedding if stored as string
        const embedding = typeof entity.embedding === 'string'
            ? JSON.parse(entity.embedding)
            : entity.embedding

        // Calculate cosine similarity
        const similarity = cosineSimilarity(queryEmbedding, embedding)
        similarities.push({
            name: entity.name,
            type: entity.entity_type,
            similarity
        })
    }

    // 5. Sort by similarity
    similarities.sort((a, b) => b.similarity - a.similarity)

    // 6. Print results
    console.log('\n🏆 TOP 20 RESULTS BY EMBEDDING SIMILARITY:')
    console.log('-'.repeat(80))

    for (let i = 0; i < Math.min(20, similarities.length); i++) {
        const item = similarities[i]
        const score = (item.similarity * 100).toFixed(2)
        const status = item.similarity > 0.4 ? '✅' : '❌'
        console.log(`${status} ${i + 1}. [${score}%] [${item.type}] ${item.name}`)
    }

    // 7. Find specific groups that SHOULD match
    console.log('\n🎯 CHECKING SPECIFIC GROUPS THAT MIGHT MATCH:')
    const keywords = ['brzytw', 'noż', 'miecz', 'broń', 'sztylet', 'nożyc']

    for (const keyword of keywords) {
        const match = similarities.find(s =>
            s.name.toLowerCase().includes(keyword)
        )
        if (match) {
            const score = (match.similarity * 100).toFixed(2)
            const rank = similarities.indexOf(match) + 1
            console.log(`- "${keyword}": found "${match.name}" at rank #${rank} (${score}%)`)
        } else {
            console.log(`- "${keyword}": NOT FOUND in groups`)
        }
    }

    // 8. Show threshold analysis
    console.log('\n📊 THRESHOLD ANALYSIS:')
    const thresholds = [0.3, 0.4, 0.5, 0.6, 0.7]
    for (const t of thresholds) {
        const count = similarities.filter(s => s.similarity > t).length
        console.log(`- Threshold ${t}: ${count} results would pass`)
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
const query = process.argv[2] || 'coś ostrego'
debugEmbeddings(query).catch(console.error)
