import { createClient } from '@/utils/supabase/server'
import { Plus, Layers } from 'lucide-react'
import Link from 'next/link'
import { PerformancesList } from '@/components/performances/PerformancesList'
import { getTranslations } from 'next-intl/server'
import { PageHeader } from '@/components/ui/PageHeader'

import { PerformancesListActions } from '@/components/performances/PerformancesListActions'
import { buttonVariants } from '@/components/ui/button-variants'

export default async function PerformancesPage() {
    const supabase = await createClient()
    const t = await getTranslations('Performances')

    // Parallel queries for better performance
    const [performancesResult, scheduledShowsResult] = await Promise.all([
        supabase
            .from('performances')
            .select('id, title, status, premiere_date, thumbnail_url, image_url, color, deleted_at')
            .is('deleted_at', null)
            .order('premiere_date', { ascending: false }),
        supabase
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
    ])

    const performances = performancesResult.data
    const allScheduledShows = scheduledShowsResult.data

    return (
        <div className="p-4 md:p-10 space-y-6 max-w-7xl mx-auto">
            <PageHeader
                title={t('title')}
                subtitle={t('subtitle')}
                icon={<Layers className="h-6 w-6" />}
                iconColor="text-purple-400 bg-purple-400/10 border-purple-400/20"
            >
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
            </PageHeader>

            <PerformancesList performances={performances || []} />
        </div>
    )
}
