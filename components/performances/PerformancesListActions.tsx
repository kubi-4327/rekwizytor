'use client'

import { useState } from 'react'
import { MoreHorizontal, Download, QrCode } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Database } from '@/types/supabase'

type Performance = Database['public']['Tables']['performances']['Row']

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

    // Generate All Labels Handler
    const handleGenerateAllLabels = async () => {
        if (performances.length === 0) return

        setIsGeneratingLabels(true)
        try {
            const response = await fetch('/api/generate-performance-labels', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    performances: performances.map(p => ({
                        id: p.id,
                        title: p.title,
                        premiereDate: p.premiere_date ? new Date(p.premiere_date).toLocaleDateString('pl-PL') : undefined
                    }))
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

        } catch (error) {
            console.error("Labels generation failed", error)
            alert("Failed to generate labels")
        } finally {
            setIsGeneratingLabels(false)
        }
    }

    return (
        <div className="relative group">
            <Button
                variant="secondary"
                size="icon"
                className="hidden sm:inline-flex border-neutral-700 h-[38px] w-[38px]"
            >
                <MoreHorizontal className="h-5 w-5" />
                <span className="sr-only">{t('actions')}</span>
            </Button>

            {/* Visible only on mobile as a simpler button, or handling responsive design differently if needed. 
                 For now, assuming the same dropdown pattern as requested. */}

            <div className="absolute right-0 top-full pt-2 w-56 z-50 hidden group-hover:block">
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl overflow-hidden">
                    <div className="py-1">
                        <Button
                            variant="ghost"
                            onClick={handleDownloadAllSchedule}
                            disabled={scheduledShows.length === 0}
                            className="w-full justify-start px-4 py-2.5 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-none h-auto"
                            leftIcon={<Download className="w-4 h-4" />}
                        >
                            {t('exportAllSchedule')}
                        </Button>

                        <Button
                            variant="ghost"
                            onClick={handleGenerateAllLabels}
                            disabled={isGeneratingLabels || performances.length === 0}
                            isLoading={isGeneratingLabels}
                            className="w-full justify-start px-4 py-2.5 text-neutral-300 hover:text-white hover:bg-neutral-800 border-t border-neutral-800 rounded-none h-auto"
                            leftIcon={!isGeneratingLabels && <QrCode className="w-4 h-4" />}
                        >
                            {t('generateAllLabels')}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
