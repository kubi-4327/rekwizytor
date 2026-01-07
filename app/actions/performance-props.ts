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

    // Get current counts to balance columns
    const { count: count0 } = await supabase
        .from('performance_props')
        .select('*', { count: 'exact', head: true })
        .eq('performance_id', performanceId)
        .eq('column_index', 0)

    const { count: count1 } = await supabase
        .from('performance_props')
        .select('*', { count: 'exact', head: true })
        .eq('performance_id', performanceId)
        .eq('column_index', 1)

    // Get max sort orders to continue ordering correctly
    const { data: max0 } = await supabase
        .from('performance_props')
        .select('sort_order')
        .eq('performance_id', performanceId)
        .eq('column_index', 0)
        .order('sort_order', { ascending: false })
        .limit(1)
        .single()

    const { data: max1 } = await supabase
        .from('performance_props')
        .select('sort_order')
        .eq('performance_id', performanceId)
        .eq('column_index', 1)
        .order('sort_order', { ascending: false })
        .limit(1)
        .single()

    let currentCount0 = count0 || 0
    let currentCount1 = count1 || 0
    let nextOrder0 = ((max0 as any)?.sort_order ?? -1) + 1
    let nextOrder1 = ((max1 as any)?.sort_order ?? -1) + 1

    const propsToInsert = cleanedNames.map(name => {
        // Decide target column based on current counts
        const targetCol = currentCount0 <= currentCount1 ? 0 : 1

        // Assign order and increment counters
        let order: number
        if (targetCol === 0) {
            order = nextOrder0++
            currentCount0++
        } else {
            order = nextOrder1++
            currentCount1++
        }

        return {
            performance_id: performanceId,
            item_name: name,
            is_checked: false,
            column_index: targetCol,
            sort_order: order,
        }
    })

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
        .order('column_index', { ascending: true })
        .order('sort_order', { ascending: true })
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
 * Update prop position (Kanban)
 */
export async function updatePropPosition(
    propId: string,
    performanceId: string,
    updates: { column_index: number; sort_order: number }
) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('performance_props')
        .update(updates as any)
        .eq('id', propId)

    if (error) {
        console.error('Error updating prop position:', error)
        return { success: false, error: error.message }
    }

    revalidatePath(`/performances/${performanceId}`)
    revalidatePath(`/performances/${performanceId}/props`)

    return { success: true }
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

    // Get current counts to decide target column
    const { count: count0 } = await supabase
        .from('performance_props')
        .select('*', { count: 'exact', head: true })
        .eq('performance_id', performanceId)
        .eq('column_index', 0)

    const { count: count1 } = await supabase
        .from('performance_props')
        .select('*', { count: 'exact', head: true })
        .eq('performance_id', performanceId)
        .eq('column_index', 1)

    // Determine target column (balance counts)
    const targetCol = (count0 || 0) <= (count1 || 0) ? 0 : 1

    // Get max sort order in target column
    const { data: existing } = await supabase
        .from('performance_props')
        .select('sort_order')
        .eq('performance_id', performanceId)
        .eq('column_index', targetCol)
        .order('sort_order', { ascending: false })
        .limit(1)
        .single()

    const nextOrder = ((existing as any)?.sort_order ?? -1) + 1

    const { data, error } = await supabase
        .from('performance_props')
        .insert({
            performance_id: performanceId,
            item_name: trimmedName,
            is_checked: false,
            column_index: targetCol,
            sort_order: nextOrder
        } as any)
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
