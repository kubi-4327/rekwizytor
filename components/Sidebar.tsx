'use client'

import { Link, usePathname, useRouter } from '@/i18n/routing'
import { Theater, Box, Layers, ClipboardList, Settings, LogOut, Sparkles, Notebook, Tag, CheckCircle2 } from 'lucide-react'
import { clsx } from 'clsx'
import { createClient } from '@/utils/supabase/client'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'

import Image from 'next/image'

export function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()
    const t = useTranslations('Navigation')

    const navigation = [
        { name: t('productions'), href: '/performances', icon: Layers },
        { name: t('groups'), href: '/groups', icon: Tag },
        { name: t('notes'), href: '/notes', icon: Notebook },
        { name: t('checklists'), href: '/checklists', icon: ClipboardList },
        { name: t('items'), href: '/items', icon: Box },
        { name: t('reviewDrafts'), href: '/items/review', icon: CheckCircle2 },
    ]

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    return (
        <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
            <div className="flex min-h-0 flex-1 flex-col bg-[#1a1a1a] border-r border-neutral-800">
                <div className="flex h-24 flex-shrink-0 items-center justify-center bg-[#2a2a2a] border-b border-neutral-800">
                    <Link href="/" className="flex items-center hover:opacity-80 transition-opacity w-full h-full justify-center">
                        <div className="relative w-full h-full">
                            <Image
                                src="/logo-sidebar.png"
                                alt="Rekwizytor"
                                fill
                                className="object-contain"
                                priority
                            />
                        </div>
                    </Link>
                </div>
                <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
                    <nav className="mt-5 flex-1 space-y-1 px-2">
                        {navigation.map((item) => {
                            const isActive = pathname.startsWith(item.href) && !navigation.some(nav =>
                                nav !== item &&
                                nav.href.startsWith(item.href) &&
                                nav.href.length > item.href.length &&
                                pathname.startsWith(nav.href)
                            )
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={clsx(
                                        isActive
                                            ? 'text-burgundy-main'
                                            : 'text-neutral-400 hover:text-white',
                                        'group relative flex items-center px-2 py-2 text-sm font-medium rounded-r-md transition-colors duration-200'
                                    )}
                                >
                                    <AnimatePresence>
                                        {isActive && (
                                            <motion.div
                                                layoutId="sidebar-active"
                                                className="absolute inset-0 bg-burgundy-main/10 border-l-4 border-burgundy-main rounded-r-md"
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
                                    <span className="relative z-10 flex items-center">
                                        <item.icon
                                            className={clsx(
                                                isActive ? 'text-burgundy-main' : 'text-neutral-500 group-hover:text-white',
                                                'mr-3 flex-shrink-0 h-6 w-6 transition-colors duration-200'
                                            )}
                                            aria-hidden="true"
                                        />
                                        {item.name}
                                    </span>
                                </Link>
                            )
                        })}
                    </nav>
                </div>
                <div className="flex flex-col gap-1 bg-[#2a2a2a] border-t border-neutral-800 p-4">
                    <Link
                        href="/settings"
                        className={clsx(
                            pathname.startsWith('/settings')
                                ? 'text-burgundy-main'
                                : 'text-neutral-400 hover:text-white',
                            'group relative flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors'
                        )}
                    >
                        <AnimatePresence>
                            {pathname.startsWith('/settings') && (
                                <motion.div
                                    layoutId="sidebar-active"
                                    className="absolute inset-0 bg-burgundy-main/10 border-l-4 border-burgundy-main rounded-md"
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
                        <span className="relative z-10 flex items-center">
                            <Settings className={clsx(
                                pathname.startsWith('/settings') ? 'text-burgundy-main' : 'text-neutral-500 group-hover:text-white',
                                'mr-3 h-5 w-5 transition-colors'
                            )} />
                            {t('settings')}
                        </span>
                    </Link>
                    <button
                        onClick={handleSignOut}
                        className="group flex w-full items-center px-2 py-2 text-sm font-medium text-neutral-400 rounded-md hover:bg-neutral-800 hover:text-white transition-colors"
                    >
                        <LogOut className="mr-3 h-5 w-5 text-neutral-500 group-hover:text-white transition-colors" />
                        {t('signOut')}
                    </button>
                </div>
            </div>
        </div>
    )
}
