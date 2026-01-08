
import { createClient } from '@supabase/supabase-js'
import { enrichGroupNameForEmbedding } from '../utils/group-embedding-enrichment'
import { generateEmbedding } from '../utils/embeddings'
import { TaskType } from '@google/generative-ai'


const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
// Use Service Role Key to bypass RLS
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function migrate() {
    console.log('🚀 Starting Multi-Vector Migration...')

    // Fetch all groups
    const { data: groups, error } = await supabase
        .from('groups')
        .select('id, name')
        .is('deleted_at', null)

    if (error || !groups) {
        console.error('Failed to fetch groups:', error)
        return
    }

    console.log(`📦 Found ${groups.length} groups to migrate`)

    let processed = 0
    let failed = 0

    for (const group of groups) {
        console.log(`\nProcessing [${processed + 1}/${groups.length}]: "${group.name}"`)

        try {
            // 1. Enrich (JSON)
            // Note: We need to define apiKey in environment for this to work
            // The util uses process.env.GEMINI_API_KEY
            const enrichment = await enrichGroupNameForEmbedding(group.name)

            console.log(`   ID: ${enrichment.identity}`)
            console.log(`   PH: ${enrichment.physical}`)

            // 2. Generate Embeddings
            const [idEmb, physEmb, ctxEmb] = await Promise.all([
                generateEmbedding(enrichment.identity || group.name, TaskType.RETRIEVAL_DOCUMENT),
                generateEmbedding(enrichment.physical || '-', TaskType.RETRIEVAL_DOCUMENT),
                generateEmbedding(enrichment.context || '-', TaskType.RETRIEVAL_DOCUMENT)
            ])

            // 3. Update DB
            const { error: updateError } = await supabase
                .from('groups')
                .update({
                    embedding_identity: JSON.stringify(idEmb),
                    embedding_physical: JSON.stringify(physEmb),
                    embedding_context: JSON.stringify(ctxEmb)
                } as any)
                .eq('id', group.id)

            if (updateError) {
                console.error(`   ❌ Update failed: ${updateError.message}`)
                failed++
            } else {
                console.log(`   ✅ Saved successfully`)
                processed++
            }

        } catch (e: any) {
            console.error(`   ❌ Error: ${e.message}`)
            failed++
        }

        // Rate limiting delay
        await new Promise(r => setTimeout(r, 2000))
    }

    console.log(`\n🎉 Migration Summary: ${processed} processed, ${failed} failed`)
}

migrate()
