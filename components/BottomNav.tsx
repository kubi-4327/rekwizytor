'use client'

import { Link } from '@/i18n/routing'
import { usePathname } from 'next/navigation'
import { Box, Layers, ClipboardList, Menu, Tag, Notebook, Search, House } from 'lucide-react'
import { clsx } from 'clsx'
import { useState } from 'react'
import { MobileMenu } from './layout/MobileMenu'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'

export function BottomNav() {
    const rawPathname = usePathname()
    // Strip locale (e.g. /pl or /en) from the beginning of the path
    const pathname = rawPathname.replace(/^\/(?:pl|en)\b/, '') || '/'
    const t = useTranslations('Navigation')

    const navigation = [
        { name: t('home'), href: '/', icon: House },
        { name: t('notes'), href: '/notes', icon: Notebook },
        { name: t('search'), href: '/search', icon: Search }, // href is dummy for 'search'
        { name: t('more'), href: '/more', icon: Menu }, // href is dummy for 'more'
    ]

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    if (pathname.includes('/live')) {
        return null
    }

    return (
        <>
            <div className="fixed bottom-0 left-0 right-0 z-50 block md:hidden bg-[#1a1a1a] border-t border-neutral-800 pb-safe">
                <div className="flex h-16 items-center justify-around px-2">
                    {navigation.map((item) => {
                        const isMore = item.href === '/more'
                        const isActive = !isMore && (
                            item.href === '/'
                                ? pathname === '/'
                                : pathname.startsWith(item.href)
                        )

                        if (isMore) {
                            return (
                                <button
                                    key={item.name}
                                    onClick={() => setIsMobileMenuOpen(true)}
                                    className={clsx(
                                        'text-neutral-500 hover:text-white',
                                        'relative flex flex-col items-center justify-center w-full h-full py-1 transition-colors'
                                    )}
                                >
                                    <item.icon className="h-6 w-6 mb-1 relative z-10" />
                                    <span className="text-[10px] font-medium relative z-10">{item.name}</span>
                                </button>
                            )
                        }



                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={clsx(
                                    isActive ? 'text-burgundy-main' : 'text-neutral-500 hover:text-white',
                                    'relative flex flex-col items-center justify-center w-full h-full py-1 transition-colors duration-200'
                                )}
                            >
                                <AnimatePresence>
                                    {isActive && (
                                        <motion.div
                                            layoutId="bottom-nav-active"
                                            className="absolute inset-x-0 top-0 h-0.5 bg-burgundy-main shadow-[0_0_10px_rgba(160,35,47,0.5)]"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{
                                                type: "spring",
                                                stiffness: 350,
                                                damping: 30
                                            }}
                                        />
                                    )}
                                </AnimatePresence>
                                <AnimatePresence>
                                    {isActive && (
                                        <motion.div
                                            className="absolute inset-0 bg-gradient-to-b from-burgundy-main/10 to-transparent"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                        />
                                    )}
                                </AnimatePresence>
                                <item.icon
                                    className={clsx(
                                        isActive ? 'text-burgundy-main' : 'text-neutral-500',
                                        'h-6 w-6 mb-1 transition-colors duration-200 relative z-10'
                                    )}
                                />
                                <span className="text-[10px] font-medium relative z-10">{item.name}</span>
                            </Link>
                        )
                    })}
                </div>
            </div>
            <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
        </>
    )
}
