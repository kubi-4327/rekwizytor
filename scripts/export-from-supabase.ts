/**
 * Export data from Supabase to JSON for PocketBase testing
 * 
 * Exports:
 *   - groups (with embeddings JSONB)
 *   - intent_test_data (for production intent classification)
 * 
 * Note: Embedding test tables (embedding_test_*, embedding_regeneration_jobs)
 * are now in PocketBase only and not exported from Supabase.
 * 
 * Usage:
 *   npx tsx scripts/export-from-supabase.ts
 *   npx tsx scripts/export-from-supabase.ts --limit=10  # Test with 10 groups
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

// Load environment variables from .env.local
config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
// Use SERVICE_ROLE_KEY to bypass RLS on groups table
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing Supabase credentials in .env.local')
    console.log('\n💡 Potrzebne zmienne:')
    console.log('   NEXT_PUBLIC_SUPABASE_URL')
    console.log('   SUPABASE_SERVICE_ROLE_KEY (zalecane, omija RLS)')
    console.log('   lub NEXT_PUBLIC_SUPABASE_ANON_KEY')
    process.exit(1)
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('⚠️  Używam ANON_KEY - możliwe problemy z RLS na tabeli groups')
    console.warn('   Dodaj SUPABASE_SERVICE_ROLE_KEY do .env.local dla pełnego dostępu\n')
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function exportData(limit?: number) {
    console.log('📦 Eksportowanie danych z Supabase...\n')

    const exportData: any = {
        exported_at: new Date().toISOString(),
        groups: [],
        // Embedding test tables removed - now in PocketBase only
        intent_test_data: []
    }

    // 1. Export groups with embeddings
    console.log('1️⃣  Eksportowanie groups...')
    let groupsQuery = supabase
        .from('groups')
        .select('*')
        .order('created_at', { ascending: false })

    if (limit) {
        groupsQuery = groupsQuery.limit(limit)
    }

    const { data: groups, error: groupsError } = await groupsQuery

    if (groupsError) {
        console.error('   ❌ Błąd:', groupsError)
    } else {
        exportData.groups = groups || []
        const withEmbeddings = groups?.filter(g => g.embeddings)?.length || 0
        console.log(`   ✓ Pobrano ${groups?.length || 0} grup (${withEmbeddings} z embedingami)`)
    }

    // 2. Export intent_test_data (for production intent classification)
    console.log('2️⃣  Eksportowanie intent_test_data...')
    const { data: intentData, error: intentError } = await supabase
        .from('intent_test_data')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit || 100)

    if (intentError) {
        console.log(`   ⚠️  Tabela nie istnieje lub błąd: ${intentError.message}`)
    } else {
        exportData.intent_test_data = intentData || []
        console.log(`   ✓ Pobrano ${intentData?.length || 0} rekordów`)
    }



    // Create data directory if it doesn't exist
    const dataDir = join(process.cwd(), 'data')
    try {
        mkdirSync(dataDir, { recursive: true })
    } catch (err) {
        // Directory might already exist
    }

    // Save to JSON
    const outputPath = join(dataDir, 'supabase-export.json')
    writeFileSync(outputPath, JSON.stringify(exportData, null, 2))

    console.log(`\n✅ Eksport zakończony!`)
    console.log(`📁 Zapisano do: ${outputPath}`)
    console.log(`\n📊 Statystyki:`)
    console.log(`   Groups: ${exportData.groups.length}`)
    console.log(`   Groups z embedingami: ${exportData.groups.filter((g: any) => g.embeddings).length}`)
    console.log(`   Intent test data: ${exportData.intent_test_data.length}`)

    // Sample embeddings info
    const sampleGroup = exportData.groups.find((g: any) => g.embeddings)
    if (sampleGroup) {
        const emb = sampleGroup.embeddings
        console.log(`\n🔍 Przykładowa grupa z embedingami:`)
        console.log(`   Nazwa: ${sampleGroup.name}`)
        console.log(`   ID: ${sampleGroup.id}`)
        if (emb.embedding_identity) console.log(`   Identity dims: ${emb.embedding_identity.length}`)
        if (emb.embedding_physical) console.log(`   Physical dims: ${emb.embedding_physical.length}`)
        if (emb.embedding_context) console.log(`   Context dims: ${emb.embedding_context.length}`)
    }
}

// Parse CLI arguments
const args = process.argv.slice(2)
const limitArg = args.find(arg => arg.startsWith('--limit='))
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined

exportData(limit).catch(console.error)
