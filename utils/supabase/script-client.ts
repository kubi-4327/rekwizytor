import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

/**
 * Create a Supabase client for use in standalone scripts
 * (outside of Next.js request context)
 */
export function createScriptClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase environment variables')
    }

    return createSupabaseClient<Database>(supabaseUrl, supabaseKey)
}
