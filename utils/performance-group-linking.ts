import { createClient } from '@/utils/supabase/server'

/**
 * Check if a group is linked to a performance and get performance context
 * Returns performance title and notes if found
 */
export async function getPerformanceContextForGroup(groupName: string): Promise<{
    title: string;
    notes: string | null;
} | null> {
    try {
        const supabase = await createClient()

        // Search for performances with similar names
        const { data: performances } = await supabase
            .from('performances')
            .select('title, notes')
            .ilike('title', `%${groupName}%`)
            .is('deleted_at', null)
            .limit(1)

        if (performances && performances.length > 0) {
            return {
                title: performances[0].title,
                notes: performances[0].notes
            }
        }

        return null
    } catch (error) {
        console.error('Error fetching performance context:', error)
        return null
    }
}
