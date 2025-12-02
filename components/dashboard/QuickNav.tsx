'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Box, Layers, ClipboardList, ArrowRight } from 'lucide-react'

export function QuickNav() {
    const t = useTranslations('Dashboard')

    const items = [
        {
            href: '/items',
            icon: Box,
            title: t('propsInventory'),
            description: t('propsInventoryDesc'),
            colorClass: 'bg-burgundy-main/20 text-burgundy-light',
        },
        {
            href: '/performances',
            icon: Layers,
            title: t('productions'),
            description: t('productionsDesc'),
            colorClass: 'bg-ai-primary/20 text-ai-secondary',
        },
        {
            href: '/checklists',
            icon: ClipboardList,
            title: t('checklists'),
            description: t('checklistsDesc'),
            colorClass: 'bg-green-900/20 text-green-400',
        },
    ]

    return (
        <div className="grid gap-4 md:grid-cols-3">
            {items.map((item) => (
                <Link
                    key={item.href}
                    href={item.href}
                    className="group relative overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 p-5 hover:border-neutral-700 transition-colors flex flex-col justify-between h-full"
                >
                    <div className="flex items-start justify-between mb-4">
                        <div className={`rounded-lg p-3 ${item.colorClass}`}>
                            <item.icon className="h-6 w-6" />
                        </div>
                        <ArrowRight className="h-5 w-5 text-neutral-600 group-hover:text-white transition-colors" />
                    </div>
                    <div>
                        <h3 className="text-lg font-medium text-white mb-1">{item.title}</h3>
                        <p className="text-sm text-neutral-400 line-clamp-2">
                            {item.description}
                        </p>
                    </div>
                </Link>
            ))}
        </div>
    )
}
