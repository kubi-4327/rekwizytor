'use client'

import { useState } from 'react'
import { MoreVertical, Download, QrCode } from 'lucide-react'
import { DropdownAction } from '@/components/ui/DropdownAction'
import { rasterizeIcon } from '@/utils/icon-rasterizer'
import { notify } from '@/utils/notify'
import { useTranslations } from 'next-intl'
import { Database } from '@/types/supabase'

type Performance = Pick<Database['public']['Tables']['performances']['Row'],
    'id' | 'title' | 'premiere_date'>

type ScheduledShow = {
    id: string
    show_date: string
    type: string | null
    cast: string | null
    performance: {
        title: string
    } | null
}

type Props = {
    scheduledShows: ScheduledShow[]
    performances: Performance[]
}

export function PerformancesListActions({ scheduledShows, performances }: Props) {
    const t = useTranslations('Performances')
    const [isGeneratingLabels, setIsGeneratingLabels] = useState(false)

    // Export Schedule Handler
    const handleDownloadAllSchedule = () => {
        const downloadPromise = (async () => {
            let icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Rekwizytor//NONSGML v1.0//EN`

            // Group by date and performance to avoid duplicate events for the same show
            const uniqueEvents = new Map<string, ScheduledShow>();

            scheduledShows.forEach(show => {
                // Create a unique key based on date and performance title
                const key = `${show.show_date}-${show.performance?.title}`;
                if (!uniqueEvents.has(key)) {
                    uniqueEvents.set(key, show);
                }
            });

            uniqueEvents.forEach(show => {
                const eventDate = new Date(show.show_date)
                const endDate = new Date(eventDate.getTime() + 2 * 60 * 60 * 1000) // 2 hours default duration

                icsContent += `
BEGIN:VEVENT
DTSTART:${eventDate.toISOString().replace(/-|:|\.\d\d\d/g, "")}
DTEND:${endDate.toISOString().replace(/-|:|\.\d\d\d/g, "")}
SUMMARY:${show.performance?.title || 'Performance'} - ${show.type === 'rehearsal' ? 'Rehearsal' : 'Show'}
DESCRIPTION:Cast: ${show.cast || 'N/A'}
END:VEVENT`
            })

            icsContent += `
END:VCALENDAR`

            const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', `All_Performances_Schedule.ics`)
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
        })()

        notify.promise(downloadPromise, {
            loading: 'Przygotowywanie kalendarza...',
            success: 'Kalendarz pobrany!',
            error: 'Błąd eksportu kalendarza'
        }, 'download')
    }

    // Generate All Labels Handler
    const handleGenerateAllLabels = async () => {
        if (performances.length === 0) return

        const generatePromise = (async () => {
            const response = await fetch('/api/generate-performance-labels', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    performances: await Promise.all(performances.map(async (p) => ({
                        id: p.id,
                        title: p.title,
                        premiereDate: p.premiere_date ? new Date(p.premiere_date).toLocaleDateString('pl-PL') : undefined,
                        iconImage: await rasterizeIcon('Ticket')
                    })))
                }),
            })

            if (!response.ok) throw new Error('Failed to generate labels')

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `all_performances_labels_${new Date().toISOString().split('T')[0]}.pdf`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            window.URL.revokeObjectURL(url)
        })()

        setIsGeneratingLabels(true)
        notify.promise(generatePromise, {
            loading: 'Generowanie etykiet...',
            success: 'Etykiety wygenerowane!',
            error: 'Błąd generowania etykiet'
        }, 'pdf').finally(() => setIsGeneratingLabels(false))
    }

    return (
        <DropdownAction
            variant="glassy"
            icon={<MoreVertical className="h-5 w-5" />}
            label={t('actions')}
            className="h-10 px-3 w-full justify-center md:w-auto min-w-0"
            showChevron={false}
            align="left"
            items={[
                {
                    label: t('exportAllSchedule'),
                    icon: <Download className="w-4 h-4" />,
                    onClick: handleDownloadAllSchedule,
                    disabled: scheduledShows.length === 0
                },
                {
                    label: t('generateAllLabels'),
                    icon: <QrCode className="w-4 h-4" />,
                    onClick: handleGenerateAllLabels,
                    isLoading: isGeneratingLabels,
                    disabled: performances.length === 0
                }
            ]}
        />
    )
}
