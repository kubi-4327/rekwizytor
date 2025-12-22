'use client'

import { useState } from 'react'
import { Database } from '@/types/supabase'
import { Clock, Plus, Download } from 'lucide-react'
import Link from 'next/link'
import { useTimeFormat } from '@/hooks/useTimeFormat'
import { ScheduledShowDetailsModal } from './ScheduledShowDetailsModal'
import { isAfter, subHours, format } from 'date-fns'
import { ScheduleShowDialog } from './ScheduleShowDialog'


import { useTranslations } from 'next-intl'

type ScheduledShow = Database['public']['Tables']['scene_checklists']['Row']

type Props = {
    scheduledShows: ScheduledShow[]
    productionTitle: string
    performanceId: string
    performanceColor?: string | null
}

export function ScheduledShowsList({ scheduledShows, productionTitle, performanceId, performanceColor }: Props) {
    const t = useTranslations('ScheduledShowsList')
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
                className={`p-5 rounded-lg bg-neutral-900 border transition-all cursor-pointer hover:bg-neutral-800/50 ${isNearest
                    ? 'border-ai-primary/50 shadow-[0_0_15px_rgba(160,35,47,0.15)]'
                    : isPast
                        ? 'border-neutral-800/50 opacity-60 hover:opacity-100'
                        : 'border-neutral-800'
                    }`}
            >
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center text-white font-medium text-base">
                            <Clock className={`mr-2 h-4 w-4 ${isNearest ? 'text-ai-secondary' : 'text-neutral-500'}`} />
                            <span>
                                {format(new Date(date), 'dd.MM.yyyy')}
                            </span>
                            <span className="mx-2 text-neutral-600">•</span>
                            <span>{formatTime(date)}</span>
                        </div>
                        {isLive && (
                            <span className="px-2 py-0.5 rounded-full bg-green-900/20 text-green-400 text-xs border border-green-900/30 animate-pulse">
                                {t('live')}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <span
                            className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded border font-medium ${firstShow.type === 'rehearsal'
                                ? 'bg-neutral-800 text-neutral-400 border-neutral-700'
                                : ''
                                }`}
                            style={firstShow.type !== 'rehearsal' ? {
                                backgroundColor: `${performanceColor || '#3b82f6'}15`,
                                color: performanceColor || '#60a5fa',
                                borderColor: `${performanceColor || '#3b82f6'}30`
                            } : undefined}
                        >
                            {firstShow.type === 'rehearsal' ? t('rehearsal') : t('show')}
                        </span>
                        {firstShow.cast && (
                            <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded border bg-ai-primary/10 text-ai-secondary border-ai-primary/20 font-medium">
                                {firstShow.cast === 'first' ? t('cast.first') : firstShow.cast === 'second' ? t('cast.second') : t('cast.other')}
                            </span>
                        )}
                    </div>
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

    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false)

    // ... (rest of the component logic)

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <h2 className="text-lg font-bold text-white leading-tight">{t('title')}</h2>
                <div className="flex gap-2 ml-auto">
                    {sortedDates.length > 0 && (
                        <button
                            onClick={handleDownloadAll}
                            className="inline-flex items-center justify-center rounded-md border border-neutral-700 bg-neutral-800 p-2 text-white hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500 disabled:opacity-50"
                            title={t('exportAll')}
                        >
                            <Download className="h-4 w-4" />
                        </button>
                    )}
                    <button
                        onClick={() => setIsScheduleModalOpen(true)}
                        className="inline-flex items-center justify-center p-2 bg-white text-black rounded-md hover:bg-neutral-200 transition-colors"
                        title={t('schedule')}
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                {/* Past Shows Section */}
                {pastDates.length > 0 && (
                    <div className="space-y-4">
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
                    performanceColor={performanceColor}
                />
            )}

            <ScheduleShowDialog
                isOpen={isScheduleModalOpen}
                onClose={() => setIsScheduleModalOpen(false)}
                performanceId={performanceId}
                performanceColor={performanceColor || null}
            />
        </div>
    )
}

