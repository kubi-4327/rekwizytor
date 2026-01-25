'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { clsx } from 'clsx'
import {
    CheckCircle2,
    Circle,
    Menu,
    X,
    Play,
    Pause,
    RotateCcw,
    User,
    AlertTriangle
} from 'lucide-react'
import { Database } from '@/types/supabase'

type Scene = Database['public']['Tables']['scenes']['Row']
type Task = Database['public']['Tables']['scene_tasks']['Row']

type Props = {
    performanceId: string
    initialScenes: Scene[]
    initialTasks: Task[]
    profiles?: { id: string; full_name: string | null; avatar_url: string | null }[]
}

export function SimpleLiveView({
    performanceId,
    initialScenes,
    initialTasks,
    profiles = []
}: Props) {
    const t = useTranslations('LivePerformance')
    const router = useRouter()
    const [supabase] = useState(() => createClient())

    // State
    const [scenes, setScenes] = useState<Scene[]>(initialScenes)
    const [tasks, setTasks] = useState<Task[]>(initialTasks)
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [connectionError, setConnectionError] = useState<string | null>(null)

    // Timer state
    const [isTimerRunning, setIsTimerRunning] = useState(false)
    const [elapsedTime, setElapsedTime] = useState(0) // in milliseconds
    const [timerStartTime, setTimerStartTime] = useState<number | null>(null)

    // Sort scenes by act and scene number
    const sortedScenes = useMemo(() => {
        return [...scenes].sort((a, b) => {
            if (a.act_number !== b.act_number) {
                return (a.act_number || 0) - (b.act_number || 0)
            }
            return a.scene_number - b.scene_number
        })
    }, [scenes])

    // Active scene (first one by default)
    const [activeSceneId, setActiveSceneId] = useState<string>(sortedScenes[0]?.id)

    // Filter tasks for current scene
    const currentSceneTasks = useMemo(() => {
        return tasks.filter(task => task.scene_id === activeSceneId)
    }, [tasks, activeSceneId])

    const currentScene = sortedScenes.find(s => s.id === activeSceneId)

    // Timer effect
    useEffect(() => {
        if (!isTimerRunning) return

        const interval = setInterval(() => {
            if (timerStartTime) {
                setElapsedTime(Date.now() - timerStartTime)
            }
        }, 100) // Update every 100ms for smooth display

        return () => clearInterval(interval)
    }, [isTimerRunning, timerStartTime])

    // Realtime Subscriptions
    useEffect(() => {
        const channelName = `live-performance-${performanceId}-${Date.now()}`
        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'scene_tasks',
                },
                (payload) => {
                    const newTask = payload.new as Task
                    const updateTask = (prev: Task[]) => prev.map(task =>
                        task.id === newTask.id
                            ? {
                                ...task,
                                is_completed: newTask.is_completed,
                                live_notes: newTask.live_notes,
                                assigned_to: newTask.assigned_to
                            }
                            : task
                    )
                    setTasks(updateTask)
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

    // Timer controls
    const startTimer = () => {
        if (!isTimerRunning) {
            const now = Date.now()
            setTimerStartTime(now - elapsedTime) // Continue from where we left off
            setIsTimerRunning(true)
        }
    }

    const pauseTimer = () => {
        setIsTimerRunning(false)
    }

    const resetTimer = () => {
        setIsTimerRunning(false)
        setElapsedTime(0)
        setTimerStartTime(null)
    }

    // Toggle task completion
    const toggleCompleted = async (id: string, currentState: boolean | null) => {
        const newState = !currentState

        // Optimistic update
        setTasks(prev => prev.map(task =>
            task.id === id ? { ...task, is_completed: newState } : task
        ))

        const { error } = await supabase
            .from('scene_tasks')
            .update({ is_completed: newState })
            .eq('id', id)

        if (error) {
            console.error('Error updating completion status:', error)
            // Revert
            setTasks(prev => prev.map(task =>
                task.id === id ? { ...task, is_completed: currentState } : task
            ))
        }
    }

    // Assign user to task
    const handleAssign = async (taskId: string, userId: string) => {
        // Optimistic
        setTasks(prev => prev.map(task =>
            task.id === taskId ? { ...task, assigned_to: userId } : task
        ))

        const { error } = await supabase
            .from('scene_tasks')
            .update({ assigned_to: userId })
            .eq('id', taskId)

        if (error) {
            console.error('Error assigning user:', error)
        }
    }

    // Reset all tasks for this performance
    const resetAllTasks = async () => {
        if (!confirm(t('confirmResetAll') || 'Czy na pewno chcesz zresetować wszystkie oznaczenia?')) {
            return
        }

        const allSceneIds = scenes.map(s => s.id)

        // Optimistic update
        setTasks(prev => prev.map(task => ({ ...task, is_completed: false })))

        const { error } = await supabase
            .from('scene_tasks')
            .update({ is_completed: false })
            .in('scene_id', allSceneIds)

        if (error) {
            console.error('Error resetting tasks:', error)
            // Could revert here, but let's just refresh
            window.location.reload()
        }
    }

    // Format duration helper
    const formatDuration = (ms: number) => {
        if (ms < 0) ms = 0
        const seconds = Math.floor((ms / 1000) % 60)
        const minutes = Math.floor((ms / (1000 * 60)) % 60)
        const hours = Math.floor((ms / (1000 * 60 * 60)))

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        }
        return `${minutes}:${seconds.toString().padStart(2, '0')}`
    }

    // Safe vibrate
    const safeVibrate = () => {
        try {
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate(50)
            }
        } catch (e) {
            // Ignore vibration errors
        }
    }

    return (
        <div className="fixed inset-0 z-100 md:static md:z-0 md:inset-auto flex h-dvh md:h-[calc(100vh-4rem)] bg-black text-white overflow-hidden">
            {/* Connection Error Overlay */}
            {connectionError && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-200 w-[90%] max-w-md">
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
                    {sortedScenes.map((scene, index) => {
                        // Calculate progress for this scene
                        const sceneTasks = tasks.filter(t => t.scene_id === scene.id)
                        const total = sceneTasks.length
                        const completed = sceneTasks.filter(t => t.is_completed).length
                        const isComplete = total > 0 && completed === total

                        // Check for Act change
                        const prevScene = sortedScenes[index - 1]
                        const isNewAct = prevScene && prevScene.act_number !== scene.act_number

                        return (
                            <div key={scene.id}>
                                {isNewAct && (
                                    <div className="px-3 py-2 text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                                        <div className="h-px bg-neutral-800 flex-1" />
                                        {t('act', { number: scene.act_number ?? 0 })}
                                        <div className="h-px bg-neutral-800 flex-1" />
                                    </div>
                                )}
                                <button
                                    onClick={() => {
                                        setActiveSceneId(scene.id)
                                        setIsSidebarOpen(false)
                                    }}
                                    className={clsx(
                                        "w-full text-left p-3 rounded-lg text-sm transition-colors relative overflow-hidden",
                                        activeSceneId === scene.id
                                            ? "bg-burgundy-main/20 text-burgundy-light border border-burgundy-main/50"
                                            : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
                                    )}
                                >
                                    <div className="flex justify-between items-center relative z-10">
                                        <span className="font-medium">
                                            {t('scene', { number: scene.scene_number })}
                                        </span>
                                        {isComplete && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                                    </div>
                                    {scene.name && (
                                        <div className="text-xs opacity-70 truncate relative z-10 mt-0.5">
                                            {scene.name}
                                        </div>
                                    )}

                                    {/* Progress Bar */}
                                    {total > 0 && (
                                        <div
                                            className="absolute bottom-0 left-0 h-0.5 bg-green-500/50 transition-all duration-500"
                                            style={{ width: `${(completed / total) * 100}%` }}
                                        />
                                    )}
                                </button>
                            </div>
                        )
                    })}
                </div>

                {/* Reset Button in Sidebar */}
                <div className="p-4 border-t border-neutral-800 space-y-2">
                    <button
                        onClick={resetAllTasks}
                        className="w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-neutral-800 text-neutral-400 hover:bg-yellow-900/20 hover:text-yellow-400 transition-colors text-sm font-medium"
                    >
                        <RotateCcw className="w-4 h-4" />
                        {t('resetAll') || 'Reset wszystkich'}
                    </button>
                    <button
                        onClick={() => router.push('/')}
                        className="w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-neutral-800 text-neutral-400 hover:bg-red-900/20 hover:text-red-400 transition-colors text-sm font-medium"
                    >
                        <X className="w-4 h-4" />
                        {t('exit') || 'Wyjdź'}
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-black relative min-w-0">
                {/* Header with Timer */}
                <div className="h-16 border-b border-neutral-800 flex items-center justify-between px-4 bg-neutral-900 shrink-0 z-30 relative">
                    <div className="flex items-center gap-3 flex-1 overflow-hidden">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="md:hidden p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 shrink-0"
                        >
                            <Menu className="w-5 h-5" />
                        </button>

                        <div className="font-bold text-white">
                            {t('scene', { number: currentScene?.scene_number || '?' })}
                            {currentScene?.name && (
                                <span className="text-sm text-neutral-400 ml-2 font-normal">
                                    {currentScene.name}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Timer Controls */}
                    <div className="flex items-center gap-3">
                        <div className="font-mono text-lg text-white">
                            {formatDuration(elapsedTime)}
                        </div>
                        <div className="flex gap-2">
                            {!isTimerRunning ? (
                                <button
                                    onClick={startTimer}
                                    className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                                    title="Start"
                                >
                                    <Play className="w-4 h-4" />
                                </button>
                            ) : (
                                <button
                                    onClick={pauseTimer}
                                    className="p-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 transition-colors"
                                    title="Pause"
                                >
                                    <Pause className="w-4 h-4" />
                                </button>
                            )}
                            <button
                                onClick={resetTimer}
                                className="p-2 bg-neutral-700 text-white rounded-lg hover:bg-neutral-600 transition-colors"
                                title="Reset"
                            >
                                <RotateCcw className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tasks List */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3">
                    {currentSceneTasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-neutral-500">
                            <p>{t('noItemsInScene') || 'Brak zadań w tej scenie'}</p>
                        </div>
                    ) : (
                        currentSceneTasks.map((task) => (
                            <div
                                key={task.id}
                                className={clsx(
                                    "flex items-center justify-between p-4 rounded-xl border transition-all duration-200",
                                    task.is_completed
                                        ? "bg-green-900/20 border-green-900/50"
                                        : "bg-neutral-900/50 border-neutral-800"
                                )}
                            >
                                <div className="flex items-center flex-1 min-w-0 mr-3">
                                    {/* Task Content */}
                                    <div className="flex-1 min-w-0">
                                        <h4 className={clsx(
                                            "text-base font-medium wrap-break-word whitespace-normal leading-tight",
                                            task.is_completed ? "text-green-400" : "text-white"
                                        )}>
                                            {task.content}
                                        </h4>
                                        {task.live_notes && (
                                            <p className="text-xs text-yellow-500 mt-1 wrap-break-word whitespace-normal">
                                                {task.live_notes}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Assignee Avatar */}
                                <div className="relative mr-4 shrink-0">
                                    <select
                                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                                        value={task.assigned_to || ''}
                                        onChange={(e) => handleAssign(task.id, e.target.value)}
                                    >
                                        <option value="">{t('unassigned')}</option>
                                        {profiles.map(p => (
                                            <option key={p.id} value={p.id}>{p.full_name || 'User'}</option>
                                        ))}
                                    </select>
                                    <div className={clsx(
                                        "h-8 w-8 rounded-full flex items-center justify-center border transition-colors overflow-hidden",
                                        task.assigned_to ? "border-neutral-600 bg-neutral-800" : "border-dashed border-neutral-700 bg-transparent text-neutral-600"
                                    )}>
                                        {task.assigned_to ? (
                                            (() => {
                                                const profile = profiles.find(p => p.id === task.assigned_to)
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

                                {/* Completion Toggle */}
                                <button
                                    onClick={() => {
                                        safeVibrate()
                                        toggleCompleted(task.id, task.is_completed)
                                    }}
                                    className={clsx(
                                        "flex items-center justify-center h-12 w-12 rounded-xl border-2 transition-all active:scale-95 touch-manipulation",
                                        task.is_completed
                                            ? "bg-green-500/20 border-green-500 text-green-400"
                                            : "bg-neutral-950 border-neutral-700 text-neutral-600 hover:border-neutral-500"
                                    )}
                                >
                                    {task.is_completed ? (
                                        <CheckCircle2 className="h-6 w-6" />
                                    ) : (
                                        <Circle className="h-6 w-6" />
                                    )}
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
