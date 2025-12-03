'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Calendar, ArrowRight, Clock } from 'lucide-react'
import { format, differenceInDays, isToday } from 'date-fns'

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

    if (!performance) {
        return (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 flex flex-col items-center justify-center text-center min-h-[200px]">
                <Calendar className="h-10 w-10 text-neutral-600 mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">{t('noUpcomingPerformances')}</h3>
                <Link
                    href="/performances/new"
                    className="text-sm text-action-primary hover:text-action-hover transition-colors"
                >
                    {t('manageProduction')}
                </Link>
            </div>
        )
    }

    const premiereDate = performance.premiere_date ? new Date(performance.premiere_date) : null
    const daysLeft = premiereDate ? differenceInDays(premiereDate, new Date()) : null
    const isPerformanceToday = premiereDate ? isToday(premiereDate) : false

    return (
        <div className="group relative overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 min-h-[240px] flex flex-col justify-end">
            {/* Background Image with Gradient Overlay */}
            {performance.image_url ? (
                <>
                    <div
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                        style={{ backgroundImage: `url(${performance.image_url})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
                </>
            ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-900" />
            )}

            <div className="relative p-6 z-10 w-full">
                <div className="flex items-start justify-between mb-4">
                    <div className="inline-flex items-center gap-2 rounded-full bg-action-primary/20 px-3 py-1 text-xs font-medium text-action-light backdrop-blur-sm border border-action-primary/20">
                        <Clock className="h-3 w-3" />
                        {isPerformanceToday ? (
                            <span>{t('today')}</span>
                        ) : daysLeft !== null && daysLeft >= 0 ? (
                            <span>{t('daysLeft', { count: daysLeft })}</span>
                        ) : (
                            <span>{performance.status}</span>
                        )}
                    </div>
                </div>

                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 line-clamp-2">
                    {performance.title}
                </h2>

                <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2 text-neutral-300 text-sm">
                        <Calendar className="h-4 w-4" />
                        {premiereDate ? format(premiereDate, 'dd/MM/yyyy') : 'TBD'}
                    </div>

                    <Link
                        href={`/performances/${performance.id}`}
                        className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 transition-colors backdrop-blur-sm"
                    >
                        {t('manageProduction')}
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </div>
        </div>
    )
}
