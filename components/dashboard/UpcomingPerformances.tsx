'use client'

import { useTranslations } from 'next-intl'
import { Calendar, ArrowRight, Clock } from 'lucide-react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { format } from 'date-fns'

interface Performance {
    id: string
    title: string
    date: string
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
            <div className="space-y-3">
                {performances.map((performance, index) => {
                    const { text: timeUntil, urgent } = getTimeUntil(performance.date)
                    const showTime = format(new Date(performance.date), 'HH:mm')

                    return (
                        <Link
                            key={`${performance.id}-${performance.date}-${index}`}
                            href={`/performances/${performance.id}`}
                            className="block group"
                        >
                            <div
                                className="flex items-center gap-4 p-3 rounded-xl bg-neutral-800/20 border border-white/5 hover:bg-neutral-800/40 transition-all duration-200 hover:border-(--hover-border)!"
                                style={{
                                    '--hover-border': performance.color
                                        ? `color-mix(in srgb, ${performance.color}, black 30%)`
                                        : 'rgba(255, 255, 255, 0.1)'
                                } as React.CSSProperties}
                            >
                                <div className="flex flex-col items-center justify-center min-w-[52px] h-[52px] rounded-lg bg-black/40 border border-white/5 shrink-0">
                                    <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider leading-none mb-1">
                                        {new Date(performance.date).toLocaleDateString(locale, { month: 'short' }).replace('.', '')}
                                    </span>
                                    <span className="text-xl font-bold text-white leading-none">
                                        {new Date(performance.date).getDate()}
                                    </span>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <div
                                            className="w-2 h-2 rounded-full shadow-sm"
                                            style={{ backgroundColor: performance.color || '#6366f1' }}
                                        />
                                        <h4 className="text-sm font-semibold text-white truncate group-hover:text-action-primary transition-colors">
                                            {performance.title}
                                        </h4>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className={`flex items-center gap-1 text-[11px] font-medium ${urgent ? 'text-yellow-400' : 'text-neutral-400'}`}>
                                            <Clock className="h-3 w-3" />
                                            <span>{timeUntil}</span>
                                        </div>
                                        <div className="w-1 h-1 rounded-full bg-neutral-700" />
                                        <div className="flex items-center gap-1 text-[11px] font-bold text-white/70">
                                            <span>{showTime}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-2 rounded-lg text-neutral-600 group-hover:text-white group-hover:bg-white/5 transition-all">
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
