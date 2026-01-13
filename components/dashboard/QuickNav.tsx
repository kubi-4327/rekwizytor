'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Box, Layers, ClipboardList, ArrowRight } from 'lucide-react'

export function QuickNav() {
    const t = useTranslations('Dashboard')

    const items = [
        {
            href: '/groups',
            icon: Box,
            title: t('propsInventory'),
            description: t('propsInventoryDesc'),
            colorClass: 'text-blue-400',
            bgClass: 'bg-blue-400/10',
            borderClass: 'border-blue-400/20',
            hoverBorder: 'group-hover:border-blue-400/50'
        },
        {
            href: '/performances',
            icon: Layers,
            title: t('productions'),
            description: t('productionsDesc'),
            colorClass: 'text-purple-400',
            bgClass: 'bg-purple-400/10',
            borderClass: 'border-purple-400/20',
            hoverBorder: 'group-hover:border-purple-400/50'
        },
        {
            href: '/checklists',
            icon: ClipboardList,
            title: t('checklists'),
            description: t('checklistsDesc'),
            colorClass: 'text-emerald-400',
            bgClass: 'bg-emerald-400/10',
            borderClass: 'border-emerald-400/20',
            hoverBorder: 'group-hover:border-emerald-400/50'
        },
    ]

    return (
        <div className="grid gap-4 md:grid-cols-3">
            {items.map((item) => (
                <Link
                    key={item.href}
                    href={item.href}
                    className={`group relative overflow-hidden rounded-xl border ${item.borderClass} ${item.bgClass} backdrop-blur-sm p-5 ${item.hoverBorder} transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between h-full`}
                >
                    <div className="flex items-start justify-between mb-4">
                        <div className={`rounded-lg p-2 bg-black/20 ${item.colorClass}`}>
                            <item.icon className="h-6 w-6" />
                        </div>
                        <ArrowRight className={`h-5 w-5 ${item.colorClass} opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300`} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white mb-1 group-hover:text-white/90 transition-colors">{item.title}</h3>
                        <p className="text-sm text-neutral-400 line-clamp-2 group-hover:text-neutral-300 transition-colors">
                            {item.description}
                        </p>
                    </div>
                </Link>
            ))}
        </div>
    )
}
