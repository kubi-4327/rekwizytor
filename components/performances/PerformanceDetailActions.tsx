'use client'

import { Settings, MoreVertical } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { PerformanceLabelButton } from './PerformanceLabelButton'
import { ExportPerformanceButton } from './ExportPerformanceButton'
import { Database } from '@/types/supabase'
import { DropdownAction } from '@/components/ui/DropdownAction'

type Performance = Database['public']['Tables']['performances']['Row']
type Scene = Database['public']['Tables']['scenes']['Row']
type Note = Database['public']['Tables']['notes']['Row']
type PerformanceItem = Database['public']['Tables']['performance_items']['Row'] & {
    items: {
        name: string
        image_url: string | null
    } | null
}

type Props = {
    performanceId: string
    title: string
    premiereDate: string | null
    production: Performance
    assignedProps: PerformanceItem[]
    scenes: Scene[]
    notes: Note[]
    user: {
        full_name: string | null
        email: string | undefined
    } | null
}

export function PerformanceDetailActions({
    performanceId,
    title,
    premiereDate,
    production,
    assignedProps,
    scenes,
    notes,
    user
}: Props) {
    const t = useTranslations('ProductionDetails')

    return (
        <DropdownAction
            variant="secondary"
            icon={<MoreVertical className="w-4 h-4" />}
            label={t('actions')}
            className="h-10"
            showChevron={false}
        >
            {({ close }) => (
                <>
                    <Link
                        href={`/performances/${performanceId}/edit`}
                        className="block px-4 py-2 text-sm text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors rounded-lg"
                        onClick={close}
                    >
                        {t('editDetails')}
                    </Link>
                    <Link
                        href={`/performances/${performanceId}/scenes`}
                        className="block px-4 py-2 text-sm text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors rounded-lg mt-1"
                        onClick={close}
                    >
                        {t('manageScenes')}
                    </Link>
                    <div className="bg-neutral-800 h-px my-1 mx-2" />
                    <div>
                        <PerformanceLabelButton
                            performanceId={performanceId}
                            performanceTitle={title}
                            premiereDate={premiereDate}
                            variant="menu"
                        />
                        <ExportPerformanceButton
                            production={production}
                            items={assignedProps || []}
                            scenes={scenes || []}
                            notes={notes || []}
                            user={user}
                            variant="menu"
                        />
                    </div>
                </>
            )}
        </DropdownAction>
    )
}
