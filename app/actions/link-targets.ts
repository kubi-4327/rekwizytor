'use server'

import { createClient } from '@/utils/supabase/server'

export type LinkTarget = {
    id: string
    name: string
    type: 'group' | 'performance' | 'note'
}

export async function getLinkTargets(type: 'group' | 'performance' | 'note') {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return []

    if (type === 'group') {
        const { data } = await supabase
            .from('groups')
            .select('id, name')
            .order('name')
            .limit(100)

        return (data || []).map(g => ({ id: g.id, name: g.name, type: 'group' })) as LinkTarget[]
    }

    if (type === 'performance') {
        const { data } = await supabase
            .from('performances')
            .select('id, title')
            .order('title')
            .limit(100)

        return (data || []).map(p => ({ id: p.id, name: p.title, type: 'performance' })) as LinkTarget[]
    }

    // Notes logic if needed

    return []
}
