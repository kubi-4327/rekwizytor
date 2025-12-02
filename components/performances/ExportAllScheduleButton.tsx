'use client'

import { Download } from 'lucide-react'
import { useTranslations } from 'next-intl'

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
}

export function ExportAllScheduleButton({ scheduledShows }: Props) {
    const t = useTranslations('Performances')

    const handleDownloadAll = () => {
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
    }

    if (scheduledShows.length === 0) return null

    return (
        <button
            onClick={handleDownloadAll}
            className="inline-flex items-center justify-center rounded-md bg-neutral-800 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 sm:w-auto sm:min-w-[140px] border border-neutral-700"
        >
            <Download className="sm:mr-2 h-4 w-4" />
            <span className="hidden sm:inline">{t('exportAllSchedule')}</span>
        </button>
    )
}
