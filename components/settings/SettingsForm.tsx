'use client'

import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { LogOut, User, Moon, Bell, Shield, Monitor, Clock } from 'lucide-react'
import { useTimeFormat } from '@/hooks/useTimeFormat'
import { useTranslations } from 'next-intl'

type UserData = {
    email: string | undefined
    full_name?: string | null
    id?: string
}

export function SettingsForm({ user }: { user: UserData }) {
    const t = useTranslations('SettingsForm')
    const router = useRouter()
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const [updating, setUpdating] = useState(false)
    const [fullName, setFullName] = useState(user.full_name || '')
    const { is24Hour, toggleFormat, mounted } = useTimeFormat()

    const handleSignOut = async () => {
        setLoading(true)
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    const handleUpdateProfile = async () => {
        if (!user.id) return

        setUpdating(true)
        const { error } = await supabase
            .from('profiles')
            .update({ full_name: fullName })
            .eq('id', user.id)

        if (!error) {
            router.refresh()
        }
        setUpdating(false)
    }

    return (
        <div className="space-y-8">
            {/* Profile Section */}
            <section className="space-y-4">
                <h2 className="text-lg font-medium text-white flex items-center">
                    <User className="mr-2 h-5 w-5 text-blue-400" />
                    {t('account')}
                </h2>
                <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
                    <div className="grid gap-6">
                        <div>
                            <label className="block text-sm font-medium text-neutral-400 mb-2">
                                {t('fullName')}
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="flex-1 rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-white placeholder-neutral-500 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 sm:text-sm"
                                    placeholder="John Doe"
                                />
                                <button
                                    onClick={handleUpdateProfile}
                                    disabled={updating || fullName === user.full_name}
                                    className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-500 disabled:opacity-50"
                                >
                                    {updating ? '...' : t('save')}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-400 mb-2">
                                {t('emailAddress')}
                            </label>
                            <div className="flex items-center rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-neutral-300 cursor-not-allowed opacity-75">
                                {user.email}
                            </div>
                            <p className="mt-2 text-xs text-neutral-500">
                                {t('managedViaSupabase')}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Appearance Section */}
            <section className="space-y-4">
                <h2 className="text-lg font-medium text-white flex items-center">
                    <Monitor className="mr-2 h-5 w-5 text-ai-secondary" />
                    {t('appearance')}
                </h2>
                <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-800">
                                    <Moon className="h-5 w-5 text-neutral-400" />
                                </div>
                                <div>
                                    <p className="font-medium text-white">{t('darkMode')}</p>
                                    <p className="text-sm text-neutral-500">{t('alwaysOn')}</p>
                                </div>
                            </div>
                            <div className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-not-allowed rounded-full border-2 border-transparent bg-neutral-700 transition-colors duration-200 ease-in-out">
                                <span className="translate-x-5 pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out" />
                            </div>
                        </div>

                        {/* Time Format Toggle */}
                        <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
                            <div className="flex items-center space-x-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-800">
                                    <Clock className="h-5 w-5 text-neutral-400" />
                                </div>
                                <div>
                                    <p className="font-medium text-white">{t('timeFormat')}</p>
                                    <p className="text-sm text-neutral-500">{t('timeFormatDescription')}</p>
                                </div>
                            </div>
                            <button
                                onClick={toggleFormat}
                                disabled={!mounted}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ai-primary focus:ring-offset-2 focus:ring-offset-neutral-900 ${is24Hour ? 'bg-ai-primary' : 'bg-neutral-700'}`}
                            >
                                <span
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${is24Hour ? 'translate-x-5' : 'translate-x-0'}`}
                                />
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Notifications Section (Placeholder) */}
            <section className="space-y-4">
                <h2 className="text-lg font-medium text-white flex items-center">
                    <Bell className="mr-2 h-5 w-5 text-yellow-400" />
                    {t('notifications')}
                </h2>
                <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between opacity-50 pointer-events-none">
                            <div>
                                <p className="font-medium text-white">{t('emailNotifications')}</p>
                                <p className="text-sm text-neutral-500">{t('emailNotificationsDescription')}</p>
                            </div>
                            <div className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-neutral-800 transition-colors duration-200 ease-in-out">
                                <span className="translate-x-0 pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out" />
                            </div>
                        </div>
                        <p className="text-xs text-neutral-500 pt-2 border-t border-neutral-800">
                            {t('notificationsComingSoon')}
                        </p>
                    </div>
                </div>
            </section>

            {/* Security Section */}
            <section className="space-y-4">
                <h2 className="text-lg font-medium text-white flex items-center">
                    <Shield className="mr-2 h-5 w-5 text-red-400" />
                    {t('security')}
                </h2>
                <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-white">{t('signOut')}</p>
                            <p className="text-sm text-neutral-500">{t('signOutDescription')}</p>
                        </div>
                        <button
                            onClick={handleSignOut}
                            disabled={loading}
                            className="inline-flex items-center justify-center rounded-md bg-red-900/20 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-900/40 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-neutral-900 disabled:opacity-50"
                        >
                            {loading ? t('signingOut') : (
                                <>
                                    <LogOut className="mr-2 h-4 w-4" />
                                    {t('signOut')}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </section>
        </div>
    )
}
