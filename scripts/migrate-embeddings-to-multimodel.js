#!/usr/bin/env node

/**
 * Migrate existing vector embeddings to multi-model JSONB structure
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing SUPABASE credentials')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function migrateEmbeddings() {
    console.log('🔄 Migrating existing Gemini embeddings to multi-model structure...\n')

    // Fetch all groups with vector embeddings
    const { data: groups, error } = await supabase
        .from('groups')
        .select('id, name, embedding_identity, embedding_physical, embedding_context')
        .not('embedding_identity', 'is', null)

    if (error) {
        console.error('❌ Error fetching groups:', error)
        return
    }

    console.log(`📊 Found ${groups.length} groups with Gemini embeddings\n`)

    let migrated = 0
    let skipped = 0

    for (const group of groups) {
        // Parse vector strings to arrays
        const parseVector = (vec) => {
            if (!vec) return null
            if (Array.isArray(vec)) return vec
            if (typeof vec === 'string') {
                try {
                    return JSON.parse(vec)
                } catch {
                    return null
                }
            }
            return null
        }

        const identity = parseVector(group.embedding_identity)
        const physical = parseVector(group.embedding_physical)
        const context = parseVector(group.embedding_context)

        if (!identity || !physical || !context) {
            console.warn(`⚠️  Skipping "${group.name}" - invalid embeddings`)
            skipped++
            continue
        }

        // Store in embeddings_gemini
        const { error: updateError } = await supabase
            .from('groups')
            .update({
                embeddings_gemini: {
                    identity,
                    physical,
                    context
                }
            })
            .eq('id', group.id)

        if (updateError) {
            console.error(`❌ Error updating "${group.name}":`, updateError)
        } else {
            migrated++
            if (migrated % 10 === 0) {
                console.log(`✅ Migrated ${migrated}/${groups.length}...`)
            }
        }
    }

    console.log(`\n🎉 Migration complete!`)
    console.log(`✅ Migrated: ${migrated}`)
    console.log(`⚠️  Skipped: ${skipped}`)
}

migrateEmbeddings()
