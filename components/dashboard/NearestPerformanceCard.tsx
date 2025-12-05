'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Calendar, ArrowRight, Clock, Play } from 'lucide-react'
import { format, differenceInDays, isToday } from 'date-fns'
import { useLocale } from 'next-intl'
import { pl, enUS } from 'date-fns/locale'

interface Performance {
    id: string
    title: string
    premiere_date: string | null
    image_url: string | null
    status: string
}

interface NearestPerformanceCardProps {
    performance: Performance | null
}

export function NearestPerformanceCard({ performance }: NearestPerformanceCardProps) {
    const t = useTranslations('Dashboard')
    const locale = useLocale()
    const dateLocale = locale === 'pl' ? pl : enUS

    if (!performance) {
        return (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 flex flex-col items-center justify-center text-center min-h-[300px] relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-neutral-900/50 to-neutral-900/0 z-0" />
                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-neutral-800/50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                        <Calendar className="h-8 w-8 text-neutral-600" />
                    </div>
                    <h3 className="text-xl font-medium text-white mb-2">{t('noUpcomingPerformances')}</h3>
                    <Link
                        href="/performances/new"
                        className="mt-4 px-6 py-2 rounded-full bg-action-primary text-white text-sm font-medium hover:bg-action-hover transition-colors shadow-lg shadow-action-primary/20"
                    >
                        {t('manageProduction')}
                    </Link>
                </div>
            </div>
        )
    }

    const premiereDate = performance.premiere_date ? new Date(performance.premiere_date) : null
    const daysLeft = premiereDate ? differenceInDays(premiereDate, new Date()) : null
    const isPerformanceToday = premiereDate ? isToday(premiereDate) : false

    return (
        <div className="group relative overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 min-h-[300px] flex flex-col justify-end shadow-2xl">
            {/* Background Image with Gradient Overlay */}
            {performance.image_url ? (
                <>
                    <div
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                        style={{ backgroundImage: `url(${performance.image_url})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-90" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent opacity-80" />
                </>
            ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-950" />
            )}

            <div className="relative p-8 z-10 w-full">
                <div className="flex items-start justify-between mb-6">
                    <div className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium backdrop-blur-md border ${isPerformanceToday
                            ? 'bg-red-500/20 text-red-200 border-red-500/30'
                            : performance.status === 'active'
                                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                : 'bg-white/10 text-white border-white/20'
                        }`}>
                        {isPerformanceToday ? (
                            <>
                                <Clock className="h-4 w-4" />
                                <span className="animate-pulse">{t('today')}</span>
                            </>
                        ) : daysLeft !== null && daysLeft >= 0 ? (
                            <>
                                <Clock className="h-4 w-4" />
                                <span>{t('daysUntil', { days: daysLeft })}</span>
                            </>
                        ) : (
                            <>
                                {performance.status === 'active' && (
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                    </span>
                                )}
                                <span className="capitalize">{performance.status}</span>
                            </>
                        )}
                    </div>
                </div>

                <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight tracking-tight drop-shadow-lg max-w-2xl">
                    {performance.title}
                </h2>

                <div className="flex items-center justify-between mt-8">
                    <div className="flex items-center gap-3 text-neutral-200 text-base font-medium bg-black/30 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/10">
                        <Calendar className="h-5 w-5" />
                        {premiereDate ? format(premiereDate, 'd MMMM yyyy', { locale: dateLocale }) : 'TBD'}
                    </div>

                    <Link
                        href={`/performances/${performance.id}`}
                        className="inline-flex items-center gap-2 rounded-full bg-white text-black px-6 py-3 text-sm font-bold hover:bg-neutral-200 transition-all transform hover:scale-105 shadow-lg"
                    >
                        {t('manageProduction')}
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </div>
        </div>
    )
}
