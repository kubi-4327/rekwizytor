
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

// Load env vars
const envPath = path.resolve(process.cwd(), '.env.local')
dotenv.config({ path: envPath })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing environment variables. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are in .env.local')
    console.log('Current CWD:', process.cwd())
    console.log('Env path:', envPath)
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
    }
})

async function run() {
    const filePath = path.resolve(process.cwd(), 'migration_vectors.sql')
    console.log('Reading migration file:', filePath)

    if (!fs.existsSync(filePath)) {
        console.error('File not found')
        process.exit(1)
    }

    const content = fs.readFileSync(filePath, 'utf-8')
    // We generated the file with one UPDATE statement per line.
    // We should split by newline. 
    // However, check if there are empty lines.
    const lines = content.split('\n').filter(line => line.trim().length > 0 && line.trim().startsWith('UPDATE'))

    console.log(`Found ${lines.length} updates to apply.`)

    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        const { error } = await supabase.rpc('exec_sql', { query: line })

        if (error) {
            console.error(`Error applying update ${i + 1}:`, error.message)
            errorCount++
        } else {
            successCount++
            if (successCount % 5 === 0) {
                console.log(`Progress: ${successCount}/${lines.length} applied.`)
            }
        }
    }

    console.log(`Migration complete. Success: ${successCount}, Errors: ${errorCount}`)
}

run().catch(console.error)
