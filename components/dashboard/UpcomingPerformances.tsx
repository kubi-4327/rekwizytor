'use client'

import { useTranslations } from 'next-intl'
import { Calendar, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { pl, enUS } from 'date-fns/locale'
import { useLocale } from 'next-intl'

interface Performance {
    id: string
    title: string
    premiere_date: string
    status: string
    color?: string
}

interface UpcomingPerformancesProps {
    performances: Performance[]
}

export function UpcomingPerformances({ performances }: UpcomingPerformancesProps) {
    const t = useTranslations('Dashboard')
    const locale = useLocale()
    const dateLocale = locale === 'pl' ? pl : enUS

    const getTimeUntil = (date: string) => {
        const performanceDate = new Date(date)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        performanceDate.setHours(0, 0, 0, 0)

        const diffTime = performanceDate.getTime() - today.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (diffDays === 0) return t('today')
        if (diffDays === 1) return t('tomorrow')
        return t('daysUntil', { days: diffDays })
    }

    if (!performances || performances.length === 0) {
        return (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 backdrop-blur-sm p-6">
                <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-action-primary" />
                    {t('upcomingPerformances')}
                </h3>
                <p className="text-sm text-neutral-400">{t('noUpcomingPerformances')}</p>
            </div>
        )
    }

    return (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 backdrop-blur-sm p-6">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-action-primary" />
                {t('upcomingPerformances')}
            </h3>
            <div className="space-y-3">
                {performances.map((performance) => {
                    const timeUntil = getTimeUntil(performance.premiere_date)
                    const isUrgent = timeUntil === t('today') || timeUntil === t('tomorrow')

                    return (
                        <Link
                            key={performance.id}
                            href={`/performances/${performance.id}`}
                            className="block group"
                        >
                            <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-800/50 hover:bg-neutral-800 transition-colors">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div
                                        className="w-1 h-10 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: performance.color || '#6366f1' }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-white truncate">
                                            {performance.title}
                                        </p>
                                        <p className={`text-xs ${isUrgent ? 'text-yellow-400 font-medium' : 'text-neutral-400'}`}>
                                            {timeUntil}
                                        </p>
                                    </div>
                                </div>
                                <ArrowRight className="h-4 w-4 text-neutral-400 group-hover:text-white group-hover:translate-x-1 transition-all flex-shrink-0" />
                            </div>
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}
