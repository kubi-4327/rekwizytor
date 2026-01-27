'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Search, ClipboardList, Tag, StickyNote, ArrowUpRight } from 'lucide-react'
import { useGlobalSearch } from '@/components/search/GlobalSearchProvider'

export function QuickNav() {
    const t = useTranslations('Dashboard')
    const navT = useTranslations('Navigation')
    const { openSearch } = useGlobalSearch()

    const actions = [
        {
            label: navT('search'),
            icon: Search,
            color: 'text-blue-400',
            bg: 'bg-blue-400/10',
            onClick: () => openSearch()
        },
        {
            label: t('checklists'),
            href: '/checklists',
            icon: ClipboardList,
            color: 'text-emerald-400',
            bg: 'bg-emerald-400/10'
        },
        {
            label: 'Etykiety',
            href: '/tools/labels',
            icon: Tag,
            color: 'text-purple-400',
            bg: 'bg-purple-400/10'
        },
        {
            label: navT('notes'),
            href: '/notes',
            icon: StickyNote,
            color: 'text-amber-400',
            bg: 'bg-amber-400/10'
        }
    ]

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {actions.map((action) => {
                const Icon = action.icon
                const content = (
                    <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 transition-all group cursor-pointer h-full">
                        <div className={`p-3 rounded-lg ${action.bg} ${action.color} mb-3 group-hover:scale-110 transition-transform`}>
                            <Icon className="h-6 w-6" />
                        </div>
                        <span className="text-sm font-medium text-neutral-300 group-hover:text-white transition-colors text-center">
                            {action.label}
                        </span>
                        <ArrowUpRight className="absolute top-2 right-2 h-3 w-3 text-neutral-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                )

                if (action.href) {
                    return (
                        <Link key={action.label} href={action.href} className="relative">
                            {content}
                        </Link>
                    )
                }

                return (
                    <button key={action.label} onClick={action.onClick} className="relative w-full text-left">
                        {content}
                    </button>
                )
            })}
        </div>
    )
}
