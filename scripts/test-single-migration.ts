'use server'

/**
 * Test Single Group Embedding Migration
 * Run with: npx tsx scripts/test-single-migration.ts
 */

import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI, TaskType } from '@google/generative-ai'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const geminiApiKey = process.env.GEMINI_API_KEY!

async function testSingleGroupMigration() {
    console.log('\n🧪 TEST SINGLE GROUP EMBEDDING MIGRATION')
    console.log('='.repeat(60))

    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const genAI = new GoogleGenerativeAI(geminiApiKey)

    // 1. Fetch any group from the view (which we know works with anon key)
    console.log('\n📦 Fetching first available group from vw_searchable_entities...')
    const { data: entities, error: fetchError } = await supabase
        .from('vw_searchable_entities')
        .select('id, name, entity_type, embedding')
        .eq('entity_type', 'group')
        .limit(1)

    if (fetchError || !entities || entities.length === 0) {
        console.error('❌ Failed to fetch group:', fetchError)
        console.log('Entities returned:', entities)
        return
    }

    const group = entities[0]
    console.log(`✅ Found group: "${group.name}" (ID: ${group.id})`)
    console.log(`   Current embedding: ${group.embedding ? 'EXISTS (' + (typeof group.embedding === 'string' ? 'string' : 'array') + ')' : 'NULL'}`)

    // 2. Generate enriched text
    console.log('\n📝 Generating enriched text via Gemini...')
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

    const prompt = `Jesteś ekspertem od kategoryzacji przedmiotów teatralnych i rekwizytów.

Dla podanej nazwy grupy przedmiotów, wygeneruj 5-10 słów kluczowych które opisują:
- Typ przedmiotu
- Materiał
- Zastosowanie
- Charakterystykę fizyczną
- Kontekst użycia

Nazwa grupy: "${group.name}"

Odpowiedź w formacie: nazwa: słowo1, słowo2, słowo3, ...

Przykłady:
- "brzytwy" → "brzytwy: ostre narzędzie, golenie, metalowe, składane, fryzjerskie, niebezpieczne"
- "owoce" → "owoce: jedzenie, dekoracja, kolorowe, świeże, naturalne, organiczne"

Odpowiedź (tylko słowa kluczowe, bez dodatkowych wyjaśnień):`

    const result = await model.generateContent(prompt)
    const enrichedText = result.response.text().trim()

    console.log(`✅ Enriched text: "${enrichedText}"`)

    // 3. Generate embedding from enriched text
    console.log('\n🔢 Generating embedding from enriched text...')
    const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' })

    const embeddingResult = await embeddingModel.embedContent({
        content: { role: 'user', parts: [{ text: enrichedText }] },
        taskType: TaskType.RETRIEVAL_DOCUMENT
    })

    const newEmbedding = embeddingResult.embedding.values
    console.log(`✅ New embedding generated (${newEmbedding.length} dimensions)`)

    // 4. Update group with new embedding (updating the actual groups table, not the view)
    console.log('\n💾 Updating groups table with new embedding...')
    const { data: updateData, error: updateError } = await supabase
        .from('groups')
        .update({ embedding: JSON.stringify(newEmbedding) })
        .eq('id', group.id)
        .select()

    if (updateError) {
        console.error('❌ Failed to update:', updateError)
        console.log('   This might be a RLS (Row Level Security) issue')
        console.log('   The anon key might not have write access to groups table')
        return
    }
    console.log('✅ Update query executed!')
    console.log('   Rows affected:', updateData?.length || 0)

    // 5. Verify the update
    console.log('\n🔍 Verifying update...')
    const { data: updatedGroup } = await supabase
        .from('groups')
        .select('id, name, embedding')
        .eq('id', group.id)
        .single()

    if (updatedGroup?.embedding) {
        console.log('✅ Embedding saved successfully!')

        // 6. Test similarity with "coś ostrego"
        console.log('\n🎯 Testing similarity with query "coś ostrego"...')
        const queryResult = await embeddingModel.embedContent({
            content: { role: 'user', parts: [{ text: 'coś ostrego' }] },
            taskType: TaskType.RETRIEVAL_QUERY
        })

        const storedEmbedding = JSON.parse(updatedGroup.embedding)
        const similarity = cosineSimilarity(queryResult.embedding.values, storedEmbedding)

        console.log(`✅ New similarity: ${(similarity * 100).toFixed(2)}%`)
        console.log('\n🎉 Migration test COMPLETE!')
    } else {
        console.error('❌ Embedding not saved properly')
    }
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

testSingleGroupMigration().catch(console.error)
