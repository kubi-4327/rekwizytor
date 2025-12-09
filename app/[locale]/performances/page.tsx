import { createClient } from '@/utils/supabase/server'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { PerformancesList } from '@/components/performances/PerformancesList'
import { getTranslations } from 'next-intl/server'

import { PerformancesListActions } from '@/components/performances/PerformancesListActions'
import { buttonVariants } from '@/components/ui/button-variants'

export default async function PerformancesPage() {
    const supabase = await createClient()
    const t = await getTranslations('Performances')

    const { data: performances } = await supabase
        .from('performances')
        .select('*')
        .is('deleted_at', null)
        .order('premiere_date', { ascending: false })

    const { data: allScheduledShows } = await supabase
        .from('scene_checklists')
        .select(`
            id,
            show_date,
            type,
            cast,
            performance:performances (
                title
            )
        `)
        .order('show_date', { ascending: true })

    return (
        <div className="p-4 md:p-10 space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-white">{t('title')}</h1>
                    <p className="text-neutral-400 text-sm mt-1">
                        {t('subtitle')}
                    </p>
                </div>
                <div className="flex flex-row gap-2 w-full sm:w-auto justify-end">
                    <PerformancesListActions scheduledShows={allScheduledShows || []} performances={performances || []} />
                    <Link
                        href="/performances/new"
                        className={buttonVariants({ variant: "primary", className: "sm:w-auto sm:min-w-[140px]" })}
                    >
                        <Plus className="sm:mr-2 h-4 w-4" />
                        <span className="hidden sm:inline">{t('addProduction')}</span>
                    </Link>
                </div>
            </div>

            <PerformancesList performances={performances || []} />
        </div>
    )
}
