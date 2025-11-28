'use server'

import { createClient } from '@/utils/supabase/server'
import { Database } from '@/types/supabase'

type Item = Database['public']['Tables']['items']['Row']

type GetItemsParams = {
    page?: number
    limit?: number
    search?: string
    status?: string
    categoryId?: string
    locationId?: string
    sort?: 'newest' | 'oldest'
}

export async function getItems({
    page = 1,
    limit = 50,
    search = '',
    status = 'all',
    categoryId = 'all',
    locationId = 'all',
    sort = 'newest'
}: GetItemsParams) {
    const supabase = await createClient()

    // Calculate range
    const from = (page - 1) * limit
    const to = from + limit - 1

    let query = supabase
        .from('items')
        .select('*', { count: 'exact' })
        .is('deleted_at', null)
        .neq('status', 'draft')

    // Apply filters
    if (search) {
        query = query.or(`name.ilike.%${search}%,notes.ilike.%${search}%`)
    }

    if (status !== 'all') {
        query = query.eq('performance_status', status as Database['public']['Enums']['item_performance_status_enum'])
    }

    if (categoryId !== 'all') {
        query = query.eq('group_id', categoryId)
    }

    if (locationId !== 'all') {
        query = query.eq('location_id', locationId)
    }

    // Apply sorting
    if (sort === 'newest') {
        query = query.order('created_at', { ascending: false })
    } else {
        query = query.order('created_at', { ascending: true })
    }

    // Apply pagination
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
        console.error('Error fetching items:', error)
        throw new Error('Failed to fetch items')
    }

    return {
        items: data as Item[],
        count: count || 0,
        hasMore: (count || 0) > to + 1
    }
}
