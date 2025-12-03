'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { ClipboardList, Calendar, Settings, Power, RotateCcw, X, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

type Checklist = {
    id: string
    scene_number: number
    scene_name: string | null
    show_date: string
    is_active: boolean
    performance_id: string
    performances: {
        title: string
        color: string | null
    } | null
}

type Props = {
    initialChecklists: Checklist[]
}

export function ActiveChecklistsList({ initialChecklists }: Props) {
    const t = useTranslations('Checklists')
    const router = useRouter()
    const [supabase] = useState(() => createClient())
    const [managingShowId, setManagingShowId] = useState<string | null>(null)
    const [connectionError, setConnectionError] = useState<string | null>(null)

    // ... (existing code)

    // Realtime Subscription to refresh list when shows become active/inactive
    useEffect(() => {
        let channel: ReturnType<typeof supabase.channel> | null = null

        try {
            channel = supabase
                .channel('active-checklists-list')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'scene_checklists',
                    },
                    () => {
                        router.refresh()
                    }
                )

            channel.subscribe((status, err) => {
                if (status === 'SUBSCRIBED') {
                    setConnectionError(null)
                } else if (status === 'CHANNEL_ERROR') {
                    console.error('Error subscribing to active checklists channel:', err)
                    setConnectionError('Błąd połączenia z serwerem (Realtime). Odśwież stronę.')
                } else if (status === 'TIMED_OUT') {
                    console.error('Subscription timed out')
                    setConnectionError('Przekroczono limit czasu połączenia. Odśwież stronę.')
                }
            })
        } catch (error) {
            console.error('Failed to setup realtime subscription:', error)
            setConnectionError('Nie udało się nawiązać połączenia.')
        }

        return () => {
            if (channel) {
                supabase.removeChannel(channel)
            }
        }
    }, [supabase, router])

    // ... (existing code)

    return (
        <>
            {connectionError && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <p className="text-sm font-medium">{connectionError}</p>
                </div>
            )}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {nearestShows.map((show) => (
                    <div key={show.performanceId} className="relative group">
                        <Link
                            href={`/performances/${show.performanceId}/live`}
                            className="relative overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 hover:border-neutral-700 transition-all hover:shadow-lg hover:shadow-neutral-900/50 block h-full"
                        >
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    {show.isActive ? (
                                        <span className="text-xs font-bold text-green-400 bg-green-400/10 px-3 py-1 rounded-full animate-pulse flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-green-400"></span>
                                            {t('live')}
                                        </span>
                                    ) : (
                                        <span className="text-xs font-bold text-burgundy-light bg-burgundy-main/10 px-3 py-1 rounded-full flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-burgundy-main"></span>
                                            {t('upcoming')}
                                        </span>
                                    )}
                                    <div className="flex items-center text-xs text-neutral-400 bg-neutral-800/50 px-2 py-1 rounded-md">
                                        <Calendar className="h-3 w-3 mr-1.5" />
                                        {format(new Date(show.showDate), 'dd/MM/yyyy')}
                                        <span className="mx-1.5 text-neutral-600">|</span>
                                        {format(new Date(show.showDate), 'HH:mm')}
                                    </div>
                                </div>
                                <h3
                                    className="text-xl font-bold text-white mb-2 transition-colors duration-300"
                                >
                                    <span className="group-hover:text-[var(--hover-color)]" style={{ '--hover-color': show.performanceColor } as React.CSSProperties}>
                                        {show.performanceTitle}
                                    </span>
                                </h3>
                                <div className="flex items-center text-neutral-400 text-sm mb-4">
                                    <span className="group-hover:translate-x-1 transition-transform duration-300 flex items-center">
                                        {t('openLiveView')}
                                        <ClipboardList className="ml-2 h-4 w-4" />
                                    </span>
                                </div>
                            </div>
                        </Link>

                        {/* Manage Button (Only for active shows) */}
                        {show.isActive && (
                            <button
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    setManagingShowId(show.performanceId)
                                }}
                                className="absolute top-4 right-4 p-2 rounded-lg bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white transition-colors z-10 opacity-0 group-hover:opacity-100 focus:opacity-100"
                                title={t('manageLiveView')}
                            >
                                <Settings className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                ))}

                {nearestShows.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center rounded-lg border border-dashed border-neutral-800 py-12 text-center">
                        <div className="rounded-full bg-neutral-900 p-3 mb-4">
                            <ClipboardList className="h-6 w-6 text-neutral-600" />
                        </div>
                        <h3 className="mt-2 text-sm font-semibold text-white">{t('noActiveShows')}</h3>
                        <p className="mt-1 text-sm text-neutral-500 max-w-sm">
                            {t('noActiveShowsDesc')}
                        </p>
                    </div>
                )}
            </div>

            {/* Management Modal */}
            {managingShowId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-6 relative">
                        <button
                            onClick={() => setManagingShowId(null)}
                            className="absolute top-4 right-4 text-neutral-500 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div>
                            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                                <Settings className="w-5 h-5 text-neutral-400" />
                                {t('manageLiveView')}
                            </h2>
                            <p className="text-neutral-400 text-sm">
                                {t('manageLiveViewDesc')}
                            </p>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={() => restartShow(managingShowId)}
                                disabled={isResetting}
                                className="w-full p-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 transition-all flex items-center gap-4 group text-left"
                            >
                                <div className="w-10 h-10 rounded-full bg-burgundy-main/10 flex items-center justify-center group-hover:bg-burgundy-main/20 transition-colors">
                                    <RotateCcw className="w-5 h-5 text-burgundy-main" />
                                </div>
                                <div>
                                    <div className="font-bold text-white">{t('restartShow')}</div>
                                    <div className="text-xs text-neutral-400">{t('restartShowDesc')}</div>
                                </div>
                            </button>

                            <button
                                onClick={() => stopShow(managingShowId)}
                                disabled={isResetting}
                                className="w-full p-4 rounded-xl bg-red-900/10 hover:bg-red-900/20 border border-red-900/30 hover:border-red-900/50 transition-all flex items-center gap-4 group text-left"
                            >
                                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                                    <Power className="w-5 h-5 text-red-500" />
                                </div>
                                <div>
                                    <div className="font-bold text-red-400">{t('stopShow')}</div>
                                    <div className="text-xs text-red-400/60">{t('stopShowDesc')}</div>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
