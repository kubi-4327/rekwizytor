'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function approveUser(userId: string, newStatus: 'approved' | 'rejected') {
    const supabase = await createClient()

    try {
        // 1. Check if caller is authorized (admin or approved user)
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return { error: 'Unauthorized' }
        }

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role, status')
            .eq('id', user.id)
            .single()

        if (profileError || !profile) {
            return { error: 'Forbidden' }
        }

        // Allow admins OR approved users to manage approvals
        const isAuthorized = profile.role === 'admin' || profile.status === 'approved'

        if (!isAuthorized) {
            return { error: 'Forbidden - Approved users only' }
        }

        // 2. Validate input
        if (!userId || typeof userId !== 'string') {
            return { error: 'Invalid user ID' }
        }

        if (!['approved', 'rejected'].includes(newStatus)) {
            return { error: 'Invalid status' }
        }

        // 3. Prevent self-modification
        if (userId === user.id) {
            return { error: 'Cannot modify own status' }
        }

        // 4. Perform Action
        // We use the standard client because we added an RLS policy that allows
        // approved users to update the status of other profiles.

        const { error: updateError } = await supabase
            .from('profiles')
            .update({ status: newStatus })
            .eq('id', userId)

        if (updateError) {
            console.error('Error updating user status:', updateError)
            return { error: 'Failed to update status' }
        }

        // 5. Audit log (console for now)
        console.log(`User ${user.id} (${profile.role}) changed status of ${userId} to ${newStatus}`)

        revalidatePath('/settings')
        revalidatePath('/admin/users')
        return { success: true }

    } catch (error) {
        console.error('Unexpected error in approveUser:', error)
        return { error: 'Internal server error' }
    }
}
