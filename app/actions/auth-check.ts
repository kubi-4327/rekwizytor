'use server'

import { createClient } from '@/utils/supabase/server'

export async function checkSignupAllowed(): Promise<{ allowed: boolean; message?: string }> {
    const supabase = await createClient()

    // Check current user count from profiles
    // Note: This relies on RLS allowing counting, or public reading. 
    // If strict RLS is on, this might fail or return 0.
    // Ideally we use service_role, but we try with standard client first.

    // We count profiles as a proxy for active users
    const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

    if (error) {
        console.error('Error counting users:', error)
        // If we can't count, fail safe? Or allow?
        // Let's assume fail safe to avoid infinite users if DB is locked down
        // but typically we want to allow if we can't verified.
        // User requested "limit to 5". 
        // Let's try to be strict.
        return { allowed: false, message: 'Cannot verify user limit.' }
    }

    if (count !== null && count >= 5) {
        return { allowed: false, message: 'User limit reached (max 5).' }
    }

    return { allowed: true }
}
