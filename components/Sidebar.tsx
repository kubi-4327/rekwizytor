'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Theater, Box, Layers, ClipboardList, Settings, LogOut, Sparkles, BarChart, Notebook } from 'lucide-react'
import { clsx } from 'clsx'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

export function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()
    const t = useTranslations('Navigation')

    const navigation = [
        { name: t('items'), href: '/items', icon: Box },
        { name: t('productions'), href: '/performances', icon: Layers },
        { name: t('checklists'), href: '/checklists', icon: ClipboardList },
        { name: t('notes'), href: '/notes', icon: Notebook },
        { name: t('reviewDrafts'), href: '/items/review', icon: Sparkles },
        { name: t('aiStats'), href: '/ai-stats', icon: BarChart },
    ]

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    return (
        <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
            <div className="flex min-h-0 flex-1 flex-col bg-[#1a1a1a] border-r border-neutral-800">
                <div className="flex h-16 flex-shrink-0 items-center px-4 bg-[#2a2a2a] border-b border-neutral-800">
                    <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
                        <Theater className="h-8 w-8 text-neutral-200 mr-2" />
                        <span className="text-lg font-bold font-boldonse text-white tracking-tight">Rekwizytorium</span>
                    </Link>
                </div>
                <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
                    <nav className="mt-5 flex-1 space-y-1 px-2">
                        {navigation.map((item) => {
                            const isActive = pathname.startsWith(item.href)
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={clsx(
                                        isActive
                                            ? 'bg-neutral-800 text-white'
                                            : 'text-neutral-400 hover:bg-neutral-800 hover:text-white',
                                        'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors'
                                    )}
                                >
                                    <item.icon
                                        className={clsx(
                                            isActive ? 'text-white' : 'text-neutral-500 group-hover:text-white',
                                            'mr-3 flex-shrink-0 h-6 w-6 transition-colors'
                                        )}
                                        aria-hidden="true"
                                    />
                                    {item.name}
                                </Link>
                            )
                        })}
                    </nav>
                </div>
                <div className="flex flex-col gap-1 bg-[#2a2a2a] border-t border-neutral-800 p-4">
                    <Link
                        href="/settings"
                        className="group flex items-center px-2 py-2 text-sm font-medium text-neutral-400 rounded-md hover:bg-neutral-800 hover:text-white transition-colors"
                    >
                        <Settings className="mr-3 h-5 w-5 text-neutral-500 group-hover:text-white transition-colors" />
                        {t('settings')}
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
