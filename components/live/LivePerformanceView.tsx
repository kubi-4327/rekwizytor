'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { clsx } from 'clsx'
import { CheckCircle2, Circle, ArrowRight, Menu, X, Clock, Calendar, PauseCircle, User, AlertTriangle } from 'lucide-react'
import NextImage from 'next/image'
import { ItemIcon } from '@/components/ui/ItemIcon'
import { format } from 'date-fns'
import { pl, enUS } from 'date-fns/locale'
import { useLocale } from 'next-intl'
import { Database } from '@/types/supabase'

type ChecklistItem = {
    id: string
    scene_checklist_id: string
    item_id: string
    is_prepared: boolean | null
    is_on_stage: boolean | null
    live_notes: string | null
    items: {
        name: string
        image_url: string | null
    } | null
    assigned_to: string | null
}

type Checklist = {
    id: string
    act_number: number
    scene_number: number
    scene_name: string | null
    show_date: string
    is_active: boolean | null
    cast: string | null
    last_heartbeat?: string | null
}

type Props = {
    performanceId: string
    initialChecklists: Checklist[]
    initialItems: ChecklistItem[]
    profiles?: { id: string, full_name: string | null, avatar_url: string | null }[]
}

export function LivePerformanceView({ performanceId, initialChecklists, initialItems, profiles = [] }: Props) {
    const t = useTranslations('LivePerformance')
    const locale = useLocale()
    const dateLocale = locale === 'pl' ? pl : enUS
    const [supabase] = useState(() => createClient())

    // State
    const [checklists, setChecklists] = useState<Checklist[]>(initialChecklists)
    const [items, setItems] = useState<ChecklistItem[]>(initialItems)
    const [forceStageAllId, setForceStageAllId] = useState<string | null>(null) // ID of scene where Stage All was clicked but items weren't ready
    const [isConfirmed, setIsConfirmed] = useState(() => {
        // If any checklist is already active, we assume the show is running and skip confirmation
        return initialChecklists.some(c => c.is_active)
    })
    const [showStats, setShowStats] = useState(false)
    const [startTime, setStartTime] = useState<number | null>(null)
    const [actStartTime, setActStartTime] = useState<number | null>(null)
    const [now, setNow] = useState(0) // For updating UI every second
    const router = useRouter()

    const [showCancelConfirmation, setShowCancelConfirmation] = useState(false)
    const [connectionError, setConnectionError] = useState<string | null>(null)

    // Sort checklists by scene number
    const sortedChecklists = useMemo(() => {
        return [...checklists].sort((a, b) => {
            const numA = a.scene_number || 0
            const numB = b.scene_number || 0
            return numA - numB
        })
    }, [checklists])

    const activeSceneId = useMemo(() => {
        return checklists.find(c => c.is_active)?.id || sortedChecklists[0]?.id
    }, [checklists, sortedChecklists])

    // Local state for navigation (defaults to global active scene)
    const [localActiveSceneId, setLocalActiveSceneId] = useState<string>(activeSceneId)

    // Filter items for current scene
    const currentSceneItems = useMemo(() => {
        return items.filter(item => item.scene_checklist_id === localActiveSceneId)
    }, [items, localActiveSceneId])

    // Sync local state when global active scene changes (e.g. Act change)
    useEffect(() => {
        if (activeSceneId) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setLocalActiveSceneId(activeSceneId)
        }
    }, [activeSceneId])

    const currentChecklist = sortedChecklists.find(c => c.id === localActiveSceneId)

    const [endTime, setEndTime] = useState<number | null>(null)

    // Clear storage on finish
    const clearLiveStorage = useMemo(() => () => {
        localStorage.removeItem(`live_view_start_${performanceId}`)
        // Clear all act keys for this performance
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(`live_view_act_start_${performanceId}_`)) {
                localStorage.removeItem(key)
            }
        })
    }, [performanceId])

    const finishScene = React.useCallback(async (forceFinish = false) => {
        // We need to use the latest state, so we might need refs or functional updates if we were not using useCallback with dependencies.
        // However, since we are moving this inside the component, we can just use the state variables and include them in dependency array.
        // But wait, finishScene is complex and uses many state variables.
        // To avoid stale closures in useEffect, we must include all dependencies.

        // Note: currentChecklist is derived from sortedChecklists and localActiveSceneId.
        // We need to ensure we access the latest values.

        const currentId = currentChecklist?.id || localActiveSceneId
        if (!currentId && !forceFinish) return

        const currentIndex = sortedChecklists.findIndex(c => c.id === currentId)
        const nextChecklist = sortedChecklists[currentIndex + 1]

        // Check if we need to perform a global action (Finish Act or Finish Show)
        const isEndOfAct = nextChecklist && nextChecklist.act_number !== sortedChecklists[currentIndex].act_number
        const isLastScene = !nextChecklist

        if (forceFinish || isLastScene || isEndOfAct) {
            // GLOBAL ACTION
            const updates = []

            // Deactivate ALL currently active scenes to be safe
            const activeIds = checklists.filter(c => c.is_active).map(c => c.id)
            if (activeIds.length > 0) {
                updates.push(
                    supabase
                        .from('scene_checklists')
                        .update({ is_active: false })
                        .in('id', activeIds)
                )
            }

            if (nextChecklist && !forceFinish && !isLastScene) {
                // Activate next scene (Start of new Act)
                updates.push(
                    supabase
                        .from('scene_checklists')
                        .update({ is_active: true })
                        .eq('id', nextChecklist.id)
                )
            } else {
                // End of show OR Forced Finish
                const now = Date.now()
                setEndTime(now)
                localStorage.setItem(`live_view_end_${performanceId}`, now.toString())

                clearLiveStorage()
                setShowStats(true)
                if (forceFinish) {
                    setChecklists(prev => prev.map(c => ({ ...c, is_active: false })))
                    return
                }
            }

            // Optimistic update for global state
            setChecklists(prev => prev.map(c => {
                // Deactivate all
                const newC = { ...c, is_active: false }
                // Activate next if applicable
                if (nextChecklist && !forceFinish && !isLastScene && c.id === nextChecklist.id) {
                    newC.is_active = true
                }
                return newC
            }))

            await Promise.all(updates)

        } else {
            // LOCAL ACTION (Next Scene within Act)
            if (nextChecklist) {
                setLocalActiveSceneId(nextChecklist.id)
            }
        }
    }, [currentChecklist, localActiveSceneId, sortedChecklists, checklists, supabase, performanceId, clearLiveStorage])

    // Load End Time
    useEffect(() => {
        const storedEndTime = localStorage.getItem(`live_view_end_${performanceId}`)
        if (storedEndTime) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setEndTime(parseInt(storedEndTime))
        }
    }, [performanceId])

    // Timer & Auto-Shutdown Logic
    useEffect(() => {
        if (!isConfirmed) return

        // 1. Load/Set Show Start Time
        const storedStartTime = localStorage.getItem(`live_view_start_${performanceId}`)
        if (storedStartTime) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setStartTime(parseInt(storedStartTime))
        } else {
            const newStartTime = Date.now()
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setStartTime(newStartTime)
            localStorage.setItem(`live_view_start_${performanceId}`, newStartTime.toString())
        }

        // 2. Tick & Check Limits
        const interval = setInterval(() => {
            const currentTime = Date.now()
            setNow(currentTime)

            // Auto-shutdown after 3 hours (3 * 60 * 60 * 1000 = 10800000 ms)
            const start = storedStartTime ? parseInt(storedStartTime) : startTime
            if (start && (currentTime - start > 10800000)) {
                // Force finish show
                finishScene(true)
            }
        }, 1000)

        return () => clearInterval(interval)
    }, [isConfirmed, performanceId, startTime])

    // Act Timer Logic
    useEffect(() => {
        if (!isConfirmed || !currentChecklist) return

        const actKey = `live_view_act_start_${performanceId}_${currentChecklist.act_number}`
        const storedActStart = localStorage.getItem(actKey)

        if (storedActStart) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setActStartTime(parseInt(storedActStart))
        } else {
            const newActStart = Date.now()
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setActStartTime(newActStart)
            localStorage.setItem(actKey, newActStart.toString())
        }
    }, [isConfirmed, currentChecklist?.act_number, performanceId])

    // Heartbeat Effect
    useEffect(() => {
        if (!isConfirmed || !activeSceneId) return

        // Initial heartbeat
        const sendHeartbeat = async () => {
            await supabase
                .from('scene_checklists')
                .update({ last_heartbeat: new Date().toISOString() } as Database['public']['Tables']['scene_checklists']['Update'])
                .eq('id', activeSceneId)
        }
        sendHeartbeat()

        const interval = setInterval(sendHeartbeat, 30000) // Every 30s
        return () => clearInterval(interval)
    }, [isConfirmed, activeSceneId, supabase])

    // Realtime Subscriptions
    useEffect(() => {
        const channelName = `live-performance-${performanceId}`

        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'scene_checklist_items',
                },
                (payload) => {
                    const newItem = payload.new as ChecklistItem
                    setItems(prev => prev.map(item =>
                        item.id === newItem.id
                            ? {
                                ...item,
                                is_prepared: newItem.is_prepared,
                                is_on_stage: newItem.is_on_stage,
                                live_notes: newItem.live_notes,
                                assigned_to: newItem.assigned_to
                            }
                            : item
                    ))
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'scene_checklists',
                },
                (payload) => {
                    const newChecklist = payload.new as Checklist
                    setChecklists(prev => prev.map(c =>
                        c.id === newChecklist.id
                            ? { ...c, is_active: newChecklist.is_active }
                            : c
                    ))
                }
            )
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') {
                    setConnectionError(null)
                } else if (status === 'CHANNEL_ERROR') {
                    console.error('Error subscribing to live performance channel:', err)
                    setConnectionError('Błąd połączenia z serwerem (Realtime). Zmiany mogą nie być widoczne.')
                } else if (status === 'TIMED_OUT') {
                    setConnectionError('Przekroczono limit czasu połączenia. Odśwież stronę.')
                }
            })

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase, performanceId])

    // Global Finish Listener
    useEffect(() => {
        // If we had an active scene, and now we don't (and it's not just initial load), show stats
        const hasActiveScene = checklists.some(c => c.is_active)
        if (!hasActiveScene && isConfirmed && !showStats && startTime) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setShowStats(true)
            // Set end time if not set
            if (!endTime) {
                const now = Date.now()
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setEndTime(now)
                localStorage.setItem(`live_view_end_${performanceId}`, now.toString())
            }
            clearLiveStorage()
        }
    }, [checklists, isConfirmed, showStats, startTime, endTime, performanceId])



    const [isSidebarOpen, setIsSidebarOpen] = useState(false)

    const safeVibrate = () => {
        try {
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate(50)
            }
        } catch (e) {
            // Ignore vibration errors (e.g. NotAllowedError)
        }
    }

    const cancelLiveView = async () => {
        // Global cancel: Deactivate all scenes AND reset all items
        const activeIds = checklists.filter(c => c.is_active).map(c => c.id)

        const updates = []

        // 1. Deactivate scenes
        if (activeIds.length > 0) {
            updates.push(
                supabase
                    .from('scene_checklists')
                    .update({ is_active: false })
                    .in('id', activeIds)
            )
        }

        // 2. Reset ALL items for this performance
        // We need all checklist IDs for this performance
        const allChecklistIds = checklists.map(c => c.id)
        if (allChecklistIds.length > 0) {
            updates.push(
                supabase
                    .from('scene_checklist_items')
                    .update({
                        is_prepared: false,
                        is_on_stage: false,
                        live_notes: null,
                        assigned_to: null // Optional: do we reset assignment? Probably not. Let's keep it.
                    })
                    .in('scene_checklist_id', allChecklistIds)
            )
        }

        await Promise.all(updates)

        clearLiveStorage()
        router.push('/')
    }




    const previousScene = async () => {
        if (!currentChecklist) return

        const currentIndex = sortedChecklists.findIndex(c => c.id === currentChecklist.id)
        if (currentIndex <= 0) return // No previous scene

        const prevChecklist = sortedChecklists[currentIndex - 1]

        // Local navigation only
        setLocalActiveSceneId(prevChecklist.id)
    }

    // Actions
    const togglePrepared = async (id: string, currentState: boolean | null) => {
        const newState = !currentState

        // If unchecking ready, also uncheck stage
        const updates: Partial<ChecklistItem> = { is_prepared: newState }
        if (!newState) {
            updates.is_on_stage = false
        }

        // Optimistic update
        setItems(prev => prev.map(item =>
            item.id === id ? { ...item, ...updates } : item
        ))

        const { error } = await supabase
            .from('scene_checklist_items')
            .update(updates)
            .eq('id', id)

        if (error) {
            console.error('Error updating prepared status:', error)
            // Revert
            setItems(prev => prev.map(item =>
                item.id === id ? { ...item, is_prepared: currentState, is_on_stage: currentState ? item.is_on_stage : item.is_on_stage } : item
            ))
        }
    }

    const toggleOnStage = async (id: string, currentState: boolean | null) => {
        const newState = !currentState

        // Optimistic update
        setItems(prev => prev.map(item =>
            item.id === id ? { ...item, is_on_stage: newState } : item
        ))

        const { error } = await supabase
            .from('scene_checklist_items')
            .update({ is_on_stage: newState })
            .eq('id', id)

        if (error) {
            console.error('Error updating on stage status:', error)
            // Revert
            setItems(prev => prev.map(item =>
                item.id === id ? { ...item, is_on_stage: currentState } : item
            ))
        }
    }

    const handleAssign = async (itemId: string, userId: string) => {
        // Optimistic
        setItems(prev => prev.map(item =>
            item.id === itemId ? { ...item, assigned_to: userId } : item
        ))

        const { error } = await supabase
            .from('scene_checklist_items')
            .update({ assigned_to: userId })
            .eq('id', itemId)

        if (error) {
            console.error('Error assigning user:', error)
            // Revert (omitted for brevity)
        }
    }

    const stageAll = async () => {
        if (!currentChecklist) return

        const sceneItems = items.filter(i => i.scene_checklist_id === currentChecklist.id)
        const unreadyItems = sceneItems.filter(i => !i.is_prepared)

        // If there are unready items and we haven't forced it yet
        if (unreadyItems.length > 0 && forceStageAllId !== currentChecklist.id) {
            // Find first unready item and scroll to it
            const firstUnready = unreadyItems[0]
            const element = document.getElementById(`item-${firstUnready.id}`)
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' })
                // Trigger animation (handled via prop/class in render)
                setForceStageAllId(currentChecklist.id)

                // Reset force state after animation (e.g. 2s)
                setTimeout(() => {
                    setForceStageAllId(null)
                }, 2000)
            }
            return
        }

        // Proceed to stage all
        safeVibrate()
        const idsToUpdate = sceneItems.map(i => i.id)

        // Optimistic
        setItems(prev => prev.map(item =>
            idsToUpdate.includes(item.id) ? { ...item, is_on_stage: true } : item
        ))

        const { error } = await supabase
            .from('scene_checklist_items')
            .update({ is_on_stage: true })
            .in('id', idsToUpdate)

        if (error) {
            console.error('Error staging all:', error)
            // Revert (complex, maybe just refresh)
        }

        // Reset force state
        setForceStageAllId(null)
    }


    // Format helper
    const formatDuration = (ms: number) => {
        const seconds = Math.floor((ms / 1000) % 60)
        const minutes = Math.floor((ms / (1000 * 60)) % 60)
        const hours = Math.floor((ms / (1000 * 60 * 60)))

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        }
        return `${minutes}:${seconds.toString().padStart(2, '0')}`
    }

    if (showCancelConfirmation) {
        return (
            <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center p-4">
                <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center space-y-6">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
                        <X className="w-8 h-8 text-red-500" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-2">{t('cancelLiveViewTitle')}</h2>
                        <p className="text-neutral-400">{t('cancelLiveViewWarning')}</p>
                    </div>
                    <div className="space-y-3">
                        <button
                            onClick={cancelLiveView}
                            className="w-full py-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors text-lg"
                        >
                            {t('confirmCancel')}
                        </button>
                        <button
                            onClick={() => setShowCancelConfirmation(false)}
                            className="w-full py-3 text-neutral-400 font-medium hover:text-white transition-colors"
                        >
                            {t('goBack')}
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    if (showStats) {
        const totalItems = items.length
        const stagedItems = items.filter(i => i.is_on_stage).length
        // Use endTime if available, otherwise current time (fallback)
        const end = endTime || now
        const duration = startTime ? end - startTime : 0
        const durationFormatted = formatDuration(duration)

        return (
            <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center p-4">
                <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center space-y-6">
                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-8 h-8 text-green-500" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-2">{t('showFinished')}</h2>
                        <div className="grid grid-cols-2 gap-4 mt-6">
                            <div className="bg-neutral-800 p-4 rounded-xl">
                                <div className="text-2xl font-bold text-white">{durationFormatted}</div>
                                <div className="text-xs text-neutral-400 uppercase tracking-wider mt-1">{t('duration')}</div>
                            </div>
                            <div className="bg-neutral-800 p-4 rounded-xl">
                                <div className="text-2xl font-bold text-white">{stagedItems}/{totalItems}</div>
                                <div className="text-xs text-neutral-400 uppercase tracking-wider mt-1">{t('itemsStaged')}</div>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => router.push('/')}
                        className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-neutral-200 transition-colors text-lg"
                    >
                        {t('returnToDashboard')}
                    </button>
                </div>
            </div>
        )
    }

    if (!isConfirmed) {
        return (
            <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center p-4">
                <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center space-y-6">
                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-8 h-8 text-green-500" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-2">{t('startLiveViewTitle')}</h2>
                        <p className="text-neutral-400">{t('startLiveViewDesc')}</p>
                    </div>
                    <div className="space-y-3">
                        <button
                            onClick={async () => {
                                setIsConfirmed(true)
                                const now = Date.now()
                                setStartTime(now)
                                localStorage.setItem(`live_view_start_${performanceId}`, now.toString())

                                // Activate first scene if none are active
                                const hasActive = checklists.some(c => c.is_active)
                                if (!hasActive && sortedChecklists.length > 0) {
                                    const firstScene = sortedChecklists[0]

                                    // Optimistic update
                                    setChecklists(prev => prev.map(c =>
                                        c.id === firstScene.id ? { ...c, is_active: true } : c
                                    ))

                                    // Supabase update
                                    await supabase
                                        .from('scene_checklists')
                                        .update({ is_active: true })
                                        .eq('id', firstScene.id)
                                }
                            }}
                            className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-neutral-200 transition-colors text-lg"
                        >
                            {t('startLiveViewAction')}
                        </button>
                        <button
                            onClick={() => setShowCancelConfirmation(true)}
                            className="w-full py-3 text-neutral-400 font-medium hover:text-white transition-colors"
                        >
                            {t('cancel')}
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 z-[100] md:static md:z-0 md:inset-auto flex h-[100dvh] md:h-[calc(100vh-4rem)] bg-black text-white overflow-hidden">
            {/* Connection Error Overlay */}
            {connectionError && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-md">
                    <div className="bg-red-500/90 backdrop-blur-sm text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-in slide-in-from-top-2">
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        <p className="text-sm font-medium flex-1">{connectionError}</p>
                        <button
                            onClick={() => setConnectionError(null)}
                            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar / Scene List */}
            <div className={clsx(
                "fixed md:relative z-50 w-64 h-full bg-neutral-900 border-r border-neutral-800 transform transition-transform duration-300 ease-in-out flex flex-col shrink-0",
                isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
            )}>
                <div className="p-4 border-b border-neutral-800 flex justify-between items-center shrink-0 h-16">
                    <h2 className="font-bold text-white">{t('scenes')}</h2>
                    <button
                        onClick={() => setIsSidebarOpen(false)}
                        className="md:hidden text-neutral-400 hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {sortedChecklists.map((checklist, index) => {
                        // Calculate progress for this scene
                        const sceneItems = items.filter(i => i.scene_checklist_id === checklist.id)
                        const total = sceneItems.length
                        const onStage = sceneItems.filter(i => i.is_on_stage).length
                        const isComplete = total > 0 && onStage === total

                        // Check for Act change
                        const prevChecklist = sortedChecklists[index - 1]
                        const isNewAct = prevChecklist && prevChecklist.act_number !== checklist.act_number

                        return (
                            <div key={checklist.id}>
                                {isNewAct && (
                                    <div className="px-3 py-2 text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                                        <div className="h-px bg-neutral-800 flex-1" />
                                        {t('act', { number: checklist.act_number })}
                                        <div className="h-px bg-neutral-800 flex-1" />
                                    </div>
                                )}
                                <button
                                    onClick={() => {
                                        // Local navigation only
                                        setLocalActiveSceneId(checklist.id)
                                        setIsSidebarOpen(false)
                                    }}
                                    className={clsx(
                                        "w-full text-left p-3 rounded-lg text-sm transition-colors relative overflow-hidden",
                                        localActiveSceneId === checklist.id
                                            ? "bg-burgundy-main/20 text-burgundy-light border border-burgundy-main/50"
                                            : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
                                    )}
                                >
                                    <div className="flex justify-between items-center relative z-10">
                                        <span className="font-medium">
                                            {t('scene', { number: checklist.scene_number })}
                                        </span>
                                        {isComplete && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                                    </div>
                                    {checklist.scene_name && (
                                        <div className="text-xs opacity-70 truncate relative z-10 mt-0.5">
                                            {checklist.scene_name}
                                        </div>
                                    )}

                                    {/* Progress Bar Background */}
                                    {total > 0 && (
                                        <div
                                            className="absolute bottom-0 left-0 h-0.5 bg-green-500/50 transition-all duration-500"
                                            style={{ width: `${(onStage / total) * 100}%` }}
                                        />
                                    )}
                                </button>
                            </div>
                        )
                    })}
                </div>

                {/* Cancel Button in Sidebar */}
                <div className="p-4 border-t border-neutral-800">
                    <button
                        onClick={() => setShowCancelConfirmation(true)}
                        className="w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-neutral-800 text-neutral-400 hover:bg-red-900/20 hover:text-red-400 transition-colors text-sm font-medium"
                    >
                        <X className="w-4 h-4" />
                        {t('cancelLiveView')}
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-black relative min-w-0">
                {/* Header with Scene Indicators */}
                <div className="h-16 border-b border-neutral-800 flex items-center justify-between px-4 bg-neutral-900 shrink-0 z-30 relative">
                    <div className="flex items-center gap-3 flex-1 overflow-hidden">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="md:hidden p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 shrink-0"
                        >
                            <Menu className="w-5 h-5" />
                        </button>

                        <div className="flex-1 flex gap-1 h-8 items-center overflow-x-auto no-scrollbar mask-linear-fade">
                            {sortedChecklists.map((checklist, index) => {
                                const isCurrent = checklist.id === localActiveSceneId
                                const sceneItems = items.filter(i => i.scene_checklist_id === checklist.id)
                                const total = sceneItems.length
                                const prepared = sceneItems.filter(i => i.is_prepared).length
                                const onStage = sceneItems.filter(i => i.is_on_stage).length
                                const allPrepared = total > 0 && prepared === total
                                const allOnStage = total > 0 && onStage === total

                                const prevChecklist = sortedChecklists[index - 1]
                                const isNewAct = prevChecklist && prevChecklist.act_number !== checklist.act_number

                                return (
                                    <React.Fragment key={checklist.id}>
                                        {isNewAct && (
                                            <div className="w-px h-4 bg-neutral-600 mx-1 shrink-0" />
                                        )}
                                        <div
                                            className={clsx(
                                                "h-2 rounded-full flex-1 min-w-[20px] max-w-[60px] transition-all duration-300 shrink-0",
                                                isCurrent ? "h-4 opacity-100 animate-pulse ring-1 ring-white/20" : "opacity-60",
                                                allOnStage ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" :
                                                    allPrepared ? "bg-burgundy-main shadow-[0_0_8px_rgba(160,35,47,0.5)]" :
                                                        "bg-neutral-800 border border-neutral-600"
                                            )}
                                            title={`${t('scene', { number: checklist.scene_number })} - ${checklist.scene_name || ''}`}
                                        />
                                    </React.Fragment>
                                )
                            })}
                        </div>
                    </div>

                    <div className="ml-4 shrink-0 flex items-center gap-4">
                        {/* Timers */}
                        <div className="hidden md:flex flex-col items-end text-xs font-mono text-neutral-400">
                            {actStartTime && (
                                <div className="flex items-center gap-1">
                                    <span className="text-neutral-500">ACT:</span>
                                    <span className="text-white">{formatDuration(now - actStartTime)}</span>
                                </div>
                            )}
                            {startTime && (
                                <div className="flex items-center gap-1">
                                    <span className="text-neutral-500">TOTAL:</span>
                                    <span className="text-white">{formatDuration(now - startTime)}</span>
                                </div>
                            )}
                        </div>

                        <div className="font-bold text-white">
                            {t('scene', { number: currentChecklist?.scene_number || '?' })}
                        </div>
                    </div>
                </div>

                {/* Items List */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
                    {currentSceneItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-neutral-500">
                            <p>{t('noItemsInScene')}</p>
                        </div>
                    ) : (
                        currentSceneItems.map((item) => (
                            <div
                                key={item.id}
                                id={`item-${item.id}`}
                                className={clsx(
                                    "flex items-center justify-between p-4 rounded-xl border transition-all duration-200",
                                    forceStageAllId === localActiveSceneId && !item.is_prepared ? "border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse" : "",
                                    item.is_on_stage
                                        ? "bg-green-900/20 border-green-900/50"
                                        : item.is_prepared
                                            ? "bg-burgundy-main/20 border-burgundy-main/50"
                                            : "bg-neutral-900/50 border-neutral-800"
                                )}
                            >
                                <div className="flex items-center flex-1 min-w-0 mr-3">
                                    {/* Item Image/Icon */}
                                    <div className="h-12 w-12 flex-shrink-0 relative bg-neutral-800 rounded-lg overflow-hidden flex items-center justify-center mr-4">
                                        {item.items?.image_url ? (
                                            <NextImage
                                                src={item.items.image_url}
                                                alt={item.items.name}
                                                fill
                                                className="object-cover"
                                                sizes="48px"
                                            />
                                        ) : (
                                            <ItemIcon name={item.items?.name || ''} className="h-6 w-6 text-neutral-600" />
                                        )}
                                    </div>

                                    {/* Item Details */}
                                    <div className="flex-1 min-w-0">
                                        <h4 className={clsx(
                                            "text-base font-medium break-words whitespace-normal leading-tight",
                                            item.is_on_stage ? "text-green-400" : item.is_prepared ? "text-burgundy-light" : "text-white"
                                        )}>
                                            {item.items?.name}
                                        </h4>
                                        {item.live_notes && (
                                            <p className="text-xs text-yellow-500 mt-1 break-words whitespace-normal">
                                                {t('note', { note: item.live_notes })}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Assignee Avatar */}
                                <div className="relative mr-4 shrink-0">
                                    <select
                                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                                        value={item.assigned_to || ''}
                                        onChange={(e) => handleAssign(item.id, e.target.value)}
                                    >
                                        <option value="">{t('unassigned')}</option>
                                        {profiles.map(p => (
                                            <option key={p.id} value={p.id}>{p.full_name || 'User'}</option>
                                        ))}
                                    </select>
                                    <div className={clsx(
                                        "h-8 w-8 rounded-full flex items-center justify-center border transition-colors overflow-hidden",
                                        item.assigned_to ? "border-neutral-600 bg-neutral-800" : "border-dashed border-neutral-700 bg-transparent text-neutral-600"
                                    )}>
                                        {item.assigned_to ? (
                                            (() => {
                                                const profile = profiles.find(p => p.id === item.assigned_to)
                                                if (profile?.avatar_url) {
                                                    return <img src={profile.avatar_url} alt={profile.full_name || ''} className="h-full w-full object-cover" />
                                                }
                                                return <span className="text-xs font-bold text-white">{profile?.full_name?.[0] || '?'}</span>
                                            })()
                                        ) : (
                                            <User className="h-4 w-4" />
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 shrink-0">
                                    {/* Prepared Toggle */}
                                    <button
                                        onClick={() => {
                                            safeVibrate()
                                            togglePrepared(item.id, item.is_prepared)
                                        }}
                                        className={clsx(
                                            "flex flex-col items-center justify-center h-14 w-14 sm:h-16 sm:w-16 rounded-xl border-2 transition-all active:scale-95 touch-manipulation",
                                            item.is_prepared
                                                ? "bg-burgundy-main/20 border-burgundy-main text-burgundy-light shadow-[0_0_15px_rgba(160,35,47,0.3)]"
                                                : "bg-neutral-950 border-neutral-700 text-neutral-600 hover:border-neutral-500"
                                        )}
                                    >
                                        {item.is_prepared ? <CheckCircle2 className="h-6 w-6 sm:h-8 sm:w-8" /> : <Circle className="h-6 w-6 sm:h-8 sm:w-8" />}
                                        <span className="text-[9px] sm:text-[10px] font-bold mt-1 uppercase tracking-wider">{t('ready')}</span>
                                    </button>

                                    {/* On Stage Toggle */}
                                    <button
                                        onClick={() => {
                                            safeVibrate()
                                            toggleOnStage(item.id, item.is_on_stage)
                                        }}
                                        disabled={!item.is_prepared}
                                        className={clsx(
                                            "flex flex-col items-center justify-center h-14 w-14 sm:h-16 sm:w-16 rounded-xl border-2 transition-all active:scale-95 touch-manipulation",
                                            !item.is_prepared ? "opacity-30 cursor-not-allowed border-neutral-800 bg-neutral-900" :
                                                item.is_on_stage
                                                    ? "bg-green-500/20 border-green-500 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                                                    : "bg-neutral-950 border-neutral-700 text-neutral-600 hover:border-neutral-500"
                                        )}
                                    >
                                        <ArrowRight className="h-6 w-6 sm:h-8 sm:w-8" />
                                        <span className="text-[9px] sm:text-[10px] font-bold mt-1 uppercase tracking-wider">{t('stage')}</span>
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Bottom Navigation Bar */}
                <div className="h-20 border-t border-neutral-800 bg-neutral-900 p-4 flex gap-4 items-center shrink-0 z-30 pb-safe relative">
                    {/* Stage All Button */}
                    <button
                        onClick={stageAll}
                        className="h-full aspect-square flex items-center justify-center rounded-xl bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white transition-colors border border-neutral-700"
                        title={t('stageAll')}
                    >
                        <CheckCircle2 className="w-6 h-6" />
                    </button>

                    {/* Navigation Buttons */}
                    <div className="flex-1 flex gap-4 h-full">
                        {/* Previous Button - Always visible but disabled if first */}
                        <button
                            onClick={previousScene}
                            disabled={sortedChecklists.findIndex(c => c.id === currentChecklist?.id) <= 0}
                            className="flex-1 bg-neutral-800 text-white rounded-xl font-bold hover:bg-neutral-700 transition-colors flex items-center justify-center gap-2 border border-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed"
                            style={{ flex: '1' }}
                        >
                            <ArrowRight className="w-5 h-5 rotate-180" />
                            <span className="hidden sm:inline">{t('prev')}</span>
                        </button>

                        {/* Next Button - 2/3 width or full */}
                        {(() => {
                            const currentIndex = sortedChecklists.findIndex(c => c.id === currentChecklist?.id)
                            const isLastScene = currentIndex === sortedChecklists.length - 1
                            const nextChecklist = sortedChecklists[currentIndex + 1]
                            const isEndOfAct = nextChecklist && nextChecklist.act_number !== currentChecklist?.act_number

                            // Check if we are viewing the currently active scene
                            const isLive = currentChecklist?.id === activeSceneId

                            // If we are NOT on the live scene, we are in "Review Mode"
                            // We should only allow navigation, not state changes
                            if (!isLive) {
                                if (isLastScene) {
                                    // If reviewing the very last scene, show nothing or disabled
                                    return (
                                        <button
                                            disabled
                                            className="bg-neutral-800 text-neutral-500 rounded-xl font-bold flex items-center justify-center gap-2 cursor-not-allowed"
                                            style={{ flex: '2' }}
                                        >
                                            {t('endOfShow')}
                                        </button>
                                    )
                                }
                                return (
                                    <button
                                        onClick={() => setLocalActiveSceneId(nextChecklist.id)}
                                        className="bg-neutral-800 text-white rounded-xl font-bold hover:bg-neutral-700 transition-colors flex items-center justify-center gap-2 border border-neutral-700"
                                        style={{ flex: '2' }}
                                    >
                                        {t('nextScene')}
                                        <ArrowRight className="w-5 h-5" />
                                    </button>
                                )
                            }

                            // Normal Live Mode Logic
                            if (isLastScene) {
                                return (
                                    <button
                                        onClick={() => finishScene()}
                                        className="bg-green-500 text-black rounded-xl font-bold hover:bg-green-400 transition-colors flex items-center justify-center gap-2"
                                        style={{ flex: '2' }}
                                    >
                                        <CheckCircle2 className="w-5 h-5" />
                                        {t('finishShow')}
                                    </button>
                                )
                            } else if (isEndOfAct) {
                                return (
                                    <button
                                        onClick={() => finishScene()}
                                        className="bg-yellow-500 text-black rounded-xl font-bold hover:bg-yellow-400 transition-colors flex items-center justify-center gap-2"
                                        style={{ flex: '2' }}
                                    >
                                        <PauseCircle className="w-5 h-5" />
                                        {t('finishAct')}
                                    </button>
                                )
                            } else {
                                return (
                                    <button
                                        onClick={() => finishScene()}
                                        className="bg-white text-black rounded-xl font-bold hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2"
                                        style={{ flex: '2' }}
                                    >
                                        {t('nextScene')}
                                        <ArrowRight className="w-5 h-5" />
                                    </button>
                                )
                            }
                        })()}
                    </div>
                </div>
            </div>
        </div>
    )
}

