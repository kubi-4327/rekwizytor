#!/usr/bin/env node

/**
 * Script to run the embedding test system migration directly via SQL
 * Run with: node scripts/run-embedding-migration.js
 */

const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing SUPABASE credentials in .env.local')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
})

async function runMigration() {
    console.log('🚀 Running Embedding Test System Migration...\n')

    try {
        // Read the migration file
        const migrationPath = path.join(__dirname, '../supabase/migrations/20260109_embedding_test_system.sql')
        const sql = fs.readFileSync(migrationPath, 'utf8')

        console.log('📄  Migration file loaded')
        console.log('📊  Executing SQL...\n')

        // Execute the SQL
        const { error } = await supabase.rpc('exec_sql', { sql_query: sql })

        if (error) {
            // If exec_sql doesn't exist, try direct execution
            console.log('⚠️  exec_sql RPC not available, trying direct execution...')

            // Split by semicolon and execute each statement
            const statements = sql
                .split(';')
                .map(s => s.trim())
                .filter(s => s.length > 0 && !s.startsWith('--'))

            for (const statement of statements) {
                const { error: stmtError } = await supabase.rpc('execute', { query: statement + ';' })
                if (stmtError) {
                    console.error(`❌ Error executing statement:`, stmtError)
                }
            }
        }

        console.log('✅ Migration completed successfully!\n')
        console.log('📝 Next steps:')
        console.log('   1. Regenerate Supabase types: npm run sync-types')
        console.log('   2. Visit: http://localhost:3000/admin/embedding-tests')

    } catch (error) {
        console.error('❌ Failed to run migration:', error)
        process.exit(1)
    }
}

runMigration()
