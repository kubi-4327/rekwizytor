#!/usr/bin/env node

/**
 * Quick script to check how embeddings are stored in the database
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing SUPABASE credentials in .env.local')
    console.log('URL:', supabaseUrl ? 'OK' : 'MISSING')
    console.log('Key:', supabaseServiceKey ? 'OK' : 'MISSING')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkEmbeddings() {
    console.log('🔍 Checking embedding storage...\n')

    const { data: groups, error } = await supabase
        .from('groups')
        .select('id, name, embedding_identity, embedding_physical, embedding_context')
        .not('embedding_identity', 'is', null)
        .limit(3)

    if (error) {
        console.error('❌ Error:', error)
        return
    }

    console.log(`📊 Found ${groups?.length || 0} groups with embeddings\n`)

    groups?.forEach((group, i) => {
        console.log(`\n--- Group ${i + 1}: "${group.name}" ---`)
        console.log(`ID: ${group.id}`)

        // Check identity
        console.log('\n📌 Identity embedding:')
        console.log(`  Type: ${typeof group.embedding_identity}`)
        console.log(`  Is Array: ${Array.isArray(group.embedding_identity)}`)
        if (Array.isArray(group.embedding_identity)) {
            console.log(`  Length: ${group.embedding_identity.length}`)
            console.log(`  First 5 values: ${group.embedding_identity.slice(0, 5).join(', ')}`)
        } else if (typeof group.embedding_identity === 'string') {
            console.log(`  ⚠️  PROBLEM: Stored as STRING!`)
            console.log(`  First 100 chars: ${group.embedding_identity.substring(0, 100)}`)
        }

        // Check physical
        console.log('\n🔧 Physical embedding:')
        console.log(`  Type: ${typeof group.embedding_physical}`)
        console.log(`  Is Array: ${Array.isArray(group.embedding_physical)}`)

        // Check context
        console.log('\n🌍 Context embedding:')
        console.log(`  Type: ${typeof group.embedding_context}`)
        console.log(`  Is Array: ${Array.isArray(group.embedding_context)}`)
    })
}

checkEmbeddings()
