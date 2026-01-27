'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { LayoutGrid, Layers, CalendarCheck, StickyNote } from 'lucide-react'

interface InventoryStatsProps {
    groupsCount: number
    performancesCount: number
    notesCount: number
    upcomingThisWeekCount: number
}

export function InventoryStats({ groupsCount, performancesCount, notesCount, upcomingThisWeekCount }: InventoryStatsProps) {
    const t = useTranslations('Dashboard')

    // Determine week status message
    let weekStatusKey = 'zero'
    if (upcomingThisWeekCount > 5) weekStatusKey = 'high'
    else if (upcomingThisWeekCount >= 3) weekStatusKey = 'medium'
    else if (upcomingThisWeekCount > 0) weekStatusKey = 'low'

    const stats = [
        {
            label: t('stats.groups'),
            value: groupsCount,
            icon: LayoutGrid,
            color: 'text-neutral-200',
            bg: 'bg-white/5',
            border: 'border-white/10',
            href: '/groups'
        },
        {
            label: t('stats.performances'),
            value: performancesCount,
            icon: Layers,
            color: 'text-purple-400',
            bg: 'bg-purple-400/10',
            border: 'border-purple-400/20',
            href: '/performances'
        },
        {
            label: t('stats.notes'),
            value: notesCount,
            icon: StickyNote,
            color: 'text-amber-400',
            bg: 'bg-amber-400/10',
            border: 'border-amber-400/20',
            href: '/notes'
        }
    ]

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-action-primary" />
                {t('inventoryStats')}
            </h3>

            <div className="grid grid-cols-1 gap-3">
                {stats.map((stat) => {
                    const Icon = stat.icon
                    return (
                        <Link
                            key={stat.label}
                            href={stat.href}
                            className={`flex items-center justify-between p-4 rounded-xl border ${stat.border} ${stat.bg} backdrop-blur-sm transition-all hover:scale-[1.02] hover:bg-opacity-80 cursor-pointer group`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg bg-black/20 ${stat.color} group-hover:scale-110 transition-transform`}>
                                    <Icon className="h-5 w-5" />
                                </div>
                                <span className="text-sm font-medium text-neutral-200 group-hover:text-white transition-colors">{stat.label}</span>
                            </div>
                            <span className="text-xl font-bold text-white">{stat.value}</span>
                        </Link>
                    )
                })}
            </div>

            {/* Week Status Message */}
            <div className="p-4 rounded-xl border border-white/5 bg-white/5 backdrop-blur-sm">
                <p className="text-sm text-neutral-300 leading-relaxed italic">
                    {t(`weekStatus.${weekStatusKey}`)}
                </p>
            </div>
        </div>
    )
}
