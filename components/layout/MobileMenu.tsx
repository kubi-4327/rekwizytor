'use client'

import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { X, BarChart, Settings, LogOut, Tag, Layers, ClipboardList } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

type Props = {
    isOpen: boolean
    onClose: () => void
}

export function MobileMenu({ isOpen, onClose }: Props) {
    const t = useTranslations('Navigation')
    const router = useRouter()
    const supabase = createClient()

    const menuItems = [
        { name: t('productions'), href: '/performances', icon: Layers },
        { name: t('groups'), href: '/groups', icon: Tag },
        { name: t('settings'), href: '/settings', icon: Settings },
    ]

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    return (
        <Transition.Root show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50 md:hidden" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-in-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in-out duration-300"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/80 transition-opacity" />
                </Transition.Child>

                <div className="fixed inset-0 z-10 overflow-y-auto">
                    <div className="flex min-h-full items-end justify-center text-center sm:items-center sm:p-0">
                        <Transition.Child
                            as={Fragment}
                            enter="transform transition ease-in-out duration-300"
                            enterFrom="translate-y-full"
                            enterTo="translate-y-0"
                            leave="transform transition ease-in-out duration-300"
                            leaveFrom="translate-y-0"
                            leaveTo="translate-y-full"
                        >
                            <Dialog.Panel className="relative w-full transform overflow-hidden rounded-t-2xl bg-[#1a1a1a] px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-sm sm:p-6">
                                <div className="absolute right-4 top-4">
                                    <button
                                        type="button"
                                        className="rounded-md text-neutral-400 hover:text-white focus:outline-none"
                                        onClick={onClose}
                                    >
                                        <X className="h-6 w-6" aria-hidden="true" />
                                    </button>
                                </div>

                                <div className="mt-3">
                                    <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-white mb-6">
                                        {t('more')}
                                    </Dialog.Title>
                                    <div className="grid grid-cols-1 gap-2">
                                        {menuItems.map((item) => (
                                            <Link
                                                key={item.name}
                                                href={item.href}
                                                onClick={onClose}
                                                className="flex items-center gap-3 rounded-lg p-3 text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors"
                                            >
                                                <item.icon className="h-5 w-5" />
                                                <span className="font-medium">{item.name}</span>
                                            </Link>
                                        ))}

                                        <div className="my-2 border-t border-neutral-800" />

                                        <button
                                            onClick={handleSignOut}
                                            className="flex w-full items-center gap-3 rounded-lg p-3 text-red-400 hover:bg-red-900/20 transition-colors"
                                        >
                                            <LogOut className="h-5 w-5" />
                                            <span className="font-medium">{t('signOut')}</span>
                                        </button>
                                    </div>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition.Root>
    )
}
