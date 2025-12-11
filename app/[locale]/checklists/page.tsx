import { createClient } from '@/utils/supabase/server'
import { getTranslations } from 'next-intl/server'
import { ActiveChecklistsList } from '@/components/checklists/ActiveChecklistsList'
import { PageHeader } from '@/components/ui/PageHeader'
import { Activity } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ChecklistsPage() {
    const supabase = await createClient()
    const t = await getTranslations('Checklists')

    // Fetch active checklists or today's shows
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data: checklists } = await supabase
        .from('scene_checklists')
        .select(`
        *,
        performances (
            title,
            color
        )
    `)
        .or(`is_active.eq.true,show_date.gte.${today.toISOString()}`)
        .order('is_active', { ascending: false })
        .order('show_date', { ascending: true })
        .order('scene_number', { ascending: true })

    // Sanitize types
    const sanitizedChecklists = (checklists || []).map(c => ({
        ...c,
        scene_number: Number(c.scene_number),
        is_active: c.is_active ?? false,
        performances: c.performances || null
    }))

    return (
        <div className="p-6 md:p-10 space-y-6 max-w-7xl mx-auto">
            <PageHeader
                title={t('title')}
                subtitle={t('subtitle')}
                icon={<Activity className="w-6 h-6 text-white" />}
                iconColor="text-emerald-400"
            />

            <ActiveChecklistsList initialChecklists={sanitizedChecklists} />
        </div>
    )
}
