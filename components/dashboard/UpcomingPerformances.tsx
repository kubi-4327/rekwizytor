'use client'

import { useTranslations } from 'next-intl'
import { Calendar, ArrowRight, Clock } from 'lucide-react'
import Link from 'next/link'
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

    const getTimeUntil = (date: string) => {
        const performanceDate = new Date(date)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        performanceDate.setHours(0, 0, 0, 0)

        const diffTime = performanceDate.getTime() - today.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (diffDays === 0) return { text: t('today'), urgent: true }
        if (diffDays === 1) return { text: t('tomorrow'), urgent: true }
        return { text: t('daysUntil', { days: diffDays }), urgent: diffDays <= 7 }
    }

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString(locale, {
            day: 'numeric',
            month: 'short'
        })
    }

    if (!performances || performances.length === 0) {
        return (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 backdrop-blur-sm p-6 h-full">
                <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-action-primary" />
                    {t('upcomingPerformances')}
                </h3>
                <div className="flex flex-col items-center justify-center h-40 text-neutral-500">
                    <Calendar className="h-10 w-10 mb-2 opacity-20" />
                    <p className="text-sm">{t('noUpcomingPerformances')}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 backdrop-blur-sm p-6 h-full">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-action-primary" />
                {t('upcomingPerformances')}
            </h3>
            <div className="space-y-2">
                {performances.map((performance) => {
                    const { text: timeUntil, urgent } = getTimeUntil(performance.premiere_date)

                    return (
                        <Link
                            key={performance.id}
                            href={`/performances/${performance.id}`}
                            className="block group"
                        >
                            <div className="flex items-center gap-4 p-3 rounded-xl bg-neutral-800/30 border border-transparent hover:border-neutral-700 hover:bg-neutral-800/50 transition-all duration-200">
                                <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-neutral-900 border border-neutral-800 flex-shrink-0">
                                    <span className="text-xs text-neutral-500 uppercase font-medium">
                                        {new Date(performance.premiere_date).toLocaleDateString(locale, { month: 'short' }).replace('.', '')}
                                    </span>
                                    <span className="text-lg font-bold text-white">
                                        {new Date(performance.premiere_date).getDate()}
                                    </span>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div
                                            className="w-2 h-2 rounded-full"
                                            style={{ backgroundColor: performance.color || '#6366f1' }}
                                        />
                                        <h4 className="text-sm font-medium text-white truncate group-hover:text-action-primary transition-colors">
                                            {performance.title}
                                        </h4>
                                    </div>
                                    <div className={`flex items-center gap-1.5 text-xs ${urgent ? 'text-yellow-400' : 'text-neutral-400'}`}>
                                        <Clock className="h-3 w-3" />
                                        <span>{timeUntil}</span>
                                    </div>
                                </div>

                                <div className="p-2 rounded-full text-neutral-500 group-hover:text-white group-hover:bg-neutral-700/50 transition-all">
                                    <ArrowRight className="h-4 w-4" />
                                </div>
                            </div>
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}
