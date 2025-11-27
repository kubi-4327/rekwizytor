'use client'

import { useState } from 'react'
import { Database } from '@/types/supabase'
import { Clock, Plus, Download } from 'lucide-react'
import Link from 'next/link'
import { useTimeFormat } from '@/hooks/useTimeFormat'
import { ScheduledShowDetailsModal } from './ScheduledShowDetailsModal'
import { AddToCalendar } from '@/components/ui/AddToCalendar'
import { isAfter, subHours, format } from 'date-fns'
import { pl, enUS } from 'date-fns/locale'
import { useTranslations, useLocale } from 'next-intl'

type ScheduledShow = Database['public']['Tables']['scene_checklists']['Row']

type Props = {
    scheduledShows: ScheduledShow[]
    productionTitle: string
    performanceId: string
    performanceColor?: string | null
}

export function ScheduledShowsList({ scheduledShows, productionTitle, performanceId, performanceColor }: Props) {
    const t = useTranslations('ScheduledShowsList')
    const locale = useLocale()
    const dateLocale = locale === 'pl' ? pl : enUS
    const { formatTime } = useTimeFormat()
    const [selectedShowDate, setSelectedShowDate] = useState<string | null>(null)

    // Group shows by date
    const showsByDate: Record<string, ScheduledShow[]> = {}
    scheduledShows.forEach(show => {
        if (!showsByDate[show.show_date]) {
            showsByDate[show.show_date] = []
        }
        showsByDate[show.show_date].push(show)
    })

    // Sort dates
    const sortedDates = Object.keys(showsByDate).sort((a, b) => new Date(a).getTime() - new Date(b).getTime())

    // Find nearest show logic
    const now = new Date()
    const cutoff = subHours(now, 4)

    // Find first show that is after cutoff
    const [showPast, setShowPast] = useState(false)

    // Find first show that is after cutoff
    const nearestDate = sortedDates.find(date => {
        const showDate = new Date(date)
        return isAfter(showDate, cutoff)
    })

    const pastDates = sortedDates.filter(date => {
        const showDate = new Date(date)
        return !isAfter(showDate, cutoff) && date !== nearestDate
    })

    const upcomingDates = sortedDates.filter(date => {
        const showDate = new Date(date)
        return isAfter(showDate, cutoff) || date === nearestDate
    })

    const renderShowItem = (date: string, isPast: boolean) => {
        const shows = showsByDate[date]
        const firstShow = shows[0]
        const isLive = shows.some(s => s.is_active)
        const isNearest = date === nearestDate

        return (
            <div
                key={date}
                onClick={() => setSelectedShowDate(date)}
                className={`p-4 rounded-lg bg-neutral-900 border transition-all cursor-pointer hover:bg-neutral-800/50 ${isNearest
                    ? 'border-ai-primary/50 shadow-[0_0_15px_rgba(160,35,47,0.15)]'
                    : isPast
                        ? 'border-neutral-800/50 opacity-60 hover:opacity-100'
                        : 'border-neutral-800'
                    }`}
            >
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center text-white font-medium">
                            <Clock className={`mr-2 h-4 w-4 ${isNearest ? 'text-ai-secondary' : 'text-neutral-500'}`} />
                            <span>
                                {format(new Date(date), 'd MMM', { locale: dateLocale })}
                            </span>
                            <span className="mx-2 text-neutral-600">•</span>
                            <span>{formatTime(date)}</span>
                        </div>
                        <span
                            className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${firstShow.type === 'rehearsal'
                                ? 'bg-neutral-800 text-neutral-400 border-neutral-700'
                                : ''
                                }`}
                            style={firstShow.type !== 'rehearsal' ? {
                                backgroundColor: `${performanceColor || '#3b82f6'}20`,
                                color: performanceColor || '#60a5fa',
                                borderColor: `${performanceColor || '#3b82f6'}30`
                            } : undefined}
                        >
                            {firstShow.type === 'rehearsal' ? t('rehearsal') : t('show')}
                        </span>
                        {firstShow.cast && (
                            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border bg-ai-primary/20 text-ai-secondary border-ai-primary/30">
                                {firstShow.cast === 'first' ? t('cast.first') : firstShow.cast === 'second' ? t('cast.second') : t('cast.other')}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <div onClick={(e) => e.stopPropagation()}>
                            {/* AddToCalendar removed from list view */}
                        </div>
                        {isLive && (
                            <span className="px-2 py-0.5 rounded-full bg-green-900/20 text-green-400 text-xs border border-green-900/30 animate-pulse">
                                {t('live')}
                            </span>
                        )}
                    </div>
                </div>
                <div className="text-xs text-neutral-500 flex justify-between items-center">
                    <span>{t('scenes', { count: shows.length })}</span>
                    <span className="text-ai-secondary group-hover:underline">{t('viewDetails')}</span>
                </div>
            </div>
        )
    }

    const handleDownloadAll = () => {
        let icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Rekwizytor//NONSGML v1.0//EN`

        sortedDates.forEach(date => {
            const shows = showsByDate[date]
            const firstShow = shows[0]
            const eventDate = new Date(date)
            const endDate = new Date(eventDate.getTime() + 2 * 60 * 60 * 1000) // 2 hours

            icsContent += `
BEGIN:VEVENT
DTSTART:${eventDate.toISOString().replace(/-|:|\.\d\d\d/g, "")}
DTEND:${endDate.toISOString().replace(/-|:|\.\d\d\d/g, "")}
SUMMARY:${productionTitle} - ${firstShow.type || 'Show'}
DESCRIPTION:Cast: ${firstShow.cast || 'N/A'}\\nScenes: ${shows.map(s => s.scene_number).join(', ')}
END:VEVENT`
        })

        icsContent += `
END:VCALENDAR`

        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `${productionTitle}_Schedule.ics`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">{t('title')}</h2>
                <div className="flex gap-2">
                    {sortedDates.length > 0 && (
                        <button
                            onClick={handleDownloadAll}
                            className="inline-flex items-center justify-center rounded-md bg-neutral-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700"
                            title="Download full schedule (.ics)"
                        >
                            <Download className="mr-1.5 h-3.5 w-3.5" />
                            {t('exportAll')}
                        </button>
                    )}
                    <Link
                        href={`/performances/${performanceId}/schedule`}
                        className="inline-flex items-center justify-center rounded-md bg-white px-3 py-1.5 text-xs font-medium text-black hover:bg-neutral-200"
                    >
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        {t('schedule')}
                    </Link>
                </div>
            </div>

            <div className="space-y-3">
                {/* Past Shows Section */}
                {pastDates.length > 0 && (
                    <div className="space-y-3">
                        <button
                            onClick={() => setShowPast(!showPast)}
                            className="text-xs text-neutral-500 hover:text-neutral-300 flex items-center gap-2 w-full"
                        >
                            <div className="h-px bg-neutral-800 flex-1" />
                            <span>{showPast ? t('hidePast') : t('showPast', { count: pastDates.length })}</span>
                            <div className="h-px bg-neutral-800 flex-1" />
                        </button>

                        {showPast && pastDates.map(date => renderShowItem(date, true))}
                    </div>
                )}

                {/* Upcoming Shows */}
                {upcomingDates.map(date => renderShowItem(date, false))}

                {sortedDates.length === 0 && (
                    <div className="text-center py-8 border border-dashed border-neutral-800 rounded-lg text-neutral-500 text-sm">
                        {t('noShows')}
                    </div>
                )}
            </div>

            {selectedShowDate && (
                <ScheduledShowDetailsModal
                    isOpen={!!selectedShowDate}
                    onClose={() => setSelectedShowDate(null)}
                    showDate={selectedShowDate}
                    shows={showsByDate[selectedShowDate]}
                    productionTitle={productionTitle}
                />
            )}
        </div>
    )
}
