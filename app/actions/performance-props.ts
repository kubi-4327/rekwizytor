'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function deletePerformanceItem(itemId: string, performanceId: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('performance_items')
        .delete()
        .eq('id', itemId)

    if (error) {
        return { success: false, error: error.message }
    }

    revalidatePath(`/performances/${performanceId}`)
    revalidatePath(`/performances/${performanceId}/props`)

    return { success: true }
}

/**
 * Bulk insert props from a list of names
 */
export async function bulkInsertProps(performanceId: string, propNames: string[]) {
    const supabase = await createClient()

    // Filter out empty strings and trim whitespace
    const cleanedNames = propNames
        .map(name => name.trim())
        .filter(name => name.length > 0)

    if (cleanedNames.length === 0) {
        return { success: false, error: 'No valid prop names provided' }
    }

    const propsToInsert = cleanedNames.map(name => ({
        performance_id: performanceId,
        item_name: name,
        is_checked: false,
    }))

    const { data, error } = await supabase
        .from('performance_props')
        .insert(propsToInsert)
        .select()

    if (error) {
        console.error('Error bulk inserting props:', error)
        return { success: false, error: error.message }
    }

    revalidatePath(`/performances/${performanceId}`)
    revalidatePath(`/performances/${performanceId}/props`)

    return { success: true, data }
}

/**
 * Get all props for a performance
 */
export async function getPerformanceProps(performanceId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('performance_props')
        .select('*')
        .eq('performance_id', performanceId)
        .order('created_at', { ascending: true })

    if (error) {
        console.error('Error fetching performance props:', error)
        return { success: false, error: error.message, data: [] }
    }

    return { success: true, data: data || [] }
}

/**
 * Update prop checked status
 */
export async function updatePropStatus(propId: string, isChecked: boolean) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('performance_props')
        .update({ is_checked: isChecked })
        .eq('id', propId)
        .select()
        .single()

    if (error) {
        console.error('Error updating prop status:', error)
        return { success: false, error: error.message }
    }

    // Revalidate the performance page
    if (data) {
        revalidatePath(`/performances/${data.performance_id}`)
        revalidatePath(`/performances/${data.performance_id}/props`)
    }

    return { success: true, data }
}

/**
 * Add a single prop
 */
export async function addProp(performanceId: string, name: string) {
    const supabase = await createClient()

    const trimmedName = name.trim()
    if (!trimmedName) {
        return { success: false, error: 'Prop name cannot be empty' }
    }

    const { data, error } = await supabase
        .from('performance_props')
        .insert({
            performance_id: performanceId,
            item_name: trimmedName,
            is_checked: false,
        })
        .select()
        .single()

    if (error) {
        console.error('Error adding prop:', error)
        return { success: false, error: error.message }
    }

    revalidatePath(`/performances/${performanceId}`)
    revalidatePath(`/performances/${performanceId}/props`)

    return { success: true, data }
}

/**
 * Delete a prop
 */
export async function deleteProp(propId: string, performanceId: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('performance_props')
        .delete()
        .eq('id', propId)

    if (error) {
        console.error('Error deleting prop:', error)
        return { success: false, error: error.message }
    }

    revalidatePath(`/performances/${performanceId}`)
    revalidatePath(`/performances/${performanceId}/props`)

    return { success: true }
}

/**
 * Update prop name
 */
export async function updatePropName(propId: string, name: string, performanceId: string) {
    const supabase = await createClient()

    const trimmedName = name.trim()
    if (!trimmedName) {
        return { success: false, error: 'Prop name cannot be empty' }
    }

    const { data, error } = await supabase
        .from('performance_props')
        .update({ item_name: trimmedName })
        .eq('id', propId)
        .select()
        .single()

    if (error) {
        console.error('Error updating prop name:', error)
        return { success: false, error: error.message }
    }

    revalidatePath(`/performances/${performanceId}`)
    revalidatePath(`/performances/${performanceId}/props`)

    return { success: true, data }
}
