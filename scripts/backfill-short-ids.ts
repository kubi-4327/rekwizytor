import { createClient } from '@supabase/supabase-js'
import { generateShortId } from '../utils/shortId'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function backfillShortIds() {
    console.log('Starting backfill of short_ids...')

    // 1. Fetch all groups without short_id
    const { data: groups, error } = await supabase
        .from('groups')
        .select('id, name')
        .is('short_id', null)

    if (error) {
        console.error('Error fetching groups:', error)
        return
    }

    console.log(`Found ${groups.length} groups to update.`)

    // 2. Update each group
    for (const group of groups) {
        const shortId = generateShortId()
        console.log(`Updating group "${group.name}" (${group.id}) with short_id: ${shortId}`)

        const { error: updateError } = await supabase
            .from('groups')
            .update({ short_id: shortId })
            .eq('id', group.id)

        if (updateError) {
            console.error(`Failed to update group ${group.id}:`, updateError)
        }
    }

    console.log('Backfill complete!')
}

backfillShortIds()
