import { createClient } from '@/utils/supabase/server'
import { getTranslations } from 'next-intl/server'
import { ActiveChecklistsList } from '@/components/checklists/ActiveChecklistsList'

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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-white">{t('title')}</h1>
                    <p className="text-neutral-400 text-sm mt-1">
                        {t('subtitle')}
                    </p>
                </div>
            </div>

            <ActiveChecklistsList initialChecklists={sanitizedChecklists} />
        </div>
    )
}
