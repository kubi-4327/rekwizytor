'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { Database } from '@/types/supabase'
import { refreshSearchIndex } from '@/app/actions/unified-search'

export async function updateItem(itemId: string, formData: FormData) {
    const supabase = await createClient()

    const name = formData.get('name') as string
    const notes = formData.get('notes') as string
    const status = formData.get('status') as string
    const locationId = formData.get('locationId') as string
    const groupId = formData.get('groupId') as string

    const updates: Database['public']['Tables']['items']['Update'] = {
        name,
        notes,
        status: status as Database['public']['Enums']['item_status_enum'],
        location_id: locationId || null,
        group_id: groupId || null,
        updated_at: new Date().toISOString()
    }

    const { error } = await supabase
        .from('items')
        .update(updates)
        .eq('id', itemId)

    if (error) {
        console.error('Error updating item:', error)
        return { error: 'Failed to update item' }
    }

    revalidatePath('/items')
    revalidatePath('/items')

    // Trigger search index refresh
    try {
        await refreshSearchIndex()
    } catch (e) {
        console.error('Failed to refresh search index:', e)
    }

    return { success: true }
}
