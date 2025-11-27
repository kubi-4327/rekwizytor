'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Box, Layers, ClipboardList, Menu } from 'lucide-react'
import { clsx } from 'clsx'
import { useTranslations } from 'next-intl'

export function BottomNav() {
    const pathname = usePathname()
    const t = useTranslations('Navigation')

    const navigation = [
        { name: t('items'), href: '/items', icon: Box },
        { name: t('productions'), href: '/performances', icon: Layers },
        { name: t('lists'), href: '/checklists', icon: ClipboardList },
        { name: t('more'), href: '/settings', icon: Menu },
    ]

    if (pathname.includes('/live')) {
        return null
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 block md:hidden bg-[#1a1a1a] border-t border-neutral-800 pb-safe">
            <div className="flex h-16 items-center justify-around px-2">
                {navigation.map((item) => {
                    const isActive = pathname.startsWith(item.href)
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={clsx(
                                isActive ? 'text-white' : 'text-neutral-500',
                                'flex flex-col items-center justify-center w-full h-full py-1'
                            )}
                        >
                            <item.icon
                                className={clsx(
                                    isActive ? 'text-white' : 'text-neutral-500',
                                    'h-6 w-6 mb-1'
                                )}
                            />
                            <span className="text-[10px] font-medium">{item.name}</span>
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}
