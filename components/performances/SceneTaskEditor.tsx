'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Database } from '@/types/supabase'
import { useTranslations } from 'next-intl'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { notify } from '@/utils/notify'

type Scene = Database['public']['Tables']['scenes']['Row']
type SceneTask = Database['public']['Tables']['scene_tasks']['Row']

type Props = {
    performanceId: string
    scenes: Scene[]
}

export function SceneTaskEditor({ performanceId, scenes }: Props) {
    const [tasks, setTasks] = useState<Record<string, SceneTask[]>>({})
    const [loading, setLoading] = useState(true)
    const [newTaskContent, setNewTaskContent] = useState<Record<string, string>>({})
    const supabase = createClient()
    const t = useTranslations('ProductionDetails')

    // Load tasks for all scenes
    useEffect(() => {
        loadTasks()
    }, [scenes])

    const loadTasks = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('scene_tasks')
                .select('*')
                .in('scene_id', scenes.map(s => s.id))
                .order('order_index', { ascending: true })

            if (error) throw error

            // Group by scene_id
            const grouped: Record<string, SceneTask[]> = {}
            data?.forEach(task => {
                if (!grouped[task.scene_id]) grouped[task.scene_id] = []
                grouped[task.scene_id].push(task)
            })

            setTasks(grouped)
        } catch (error) {
            console.error('Error loading tasks:', error)
            notify.error('Błąd ładowania zadań')
        } finally {
            setLoading(false)
        }
    }

    const handleAddTask = async (sceneId: string) => {
        const content = newTaskContent[sceneId]?.trim()
        if (!content) return

        try {
            const sceneTasks = tasks[sceneId] || []
            const maxOrder = Math.max(0, ...sceneTasks.map(t => t.order_index))

            const { data, error } = await supabase
                .from('scene_tasks')
                .insert({
                    scene_id: sceneId,
                    content,
                    order_index: maxOrder + 1
                })
                .select()
                .single()

            if (error) throw error

            setTasks(prev => ({
                ...prev,
                [sceneId]: [...(prev[sceneId] || []), data]
            }))

            setNewTaskContent(prev => ({ ...prev, [sceneId]: '' }))
            notify.success('Zadanie dodane')
        } catch (error) {
            console.error('Error adding task:', error)
            notify.error('Błąd dodawania zadania')
        }
    }

    const handleDeleteTask = async (sceneId: string, taskId: string) => {
        if (!confirm('Czy na pewno chcesz usunąć to zadanie?')) return

        try {
            const { error } = await supabase
                .from('scene_tasks')
                .delete()
                .eq('id', taskId)

            if (error) throw error

            setTasks(prev => ({
                ...prev,
                [sceneId]: (prev[sceneId] || []).filter(t => t.id !== taskId)
            }))

            notify.success('Zadanie usunięte')
        } catch (error) {
            console.error('Error deleting task:', error)
            notify.error('Błąd usuwania zadania')
        }
    }

    const handleUpdateTask = async (taskId: string, sceneId: string, newContent: string) => {
        try {
            const { error } = await supabase
                .from('scene_tasks')
                .update({ content: newContent })
                .eq('id', taskId)

            if (error) throw error

            setTasks(prev => ({
                ...prev,
                [sceneId]: (prev[sceneId] || []).map(t =>
                    t.id === taskId ? { ...t, content: newContent } : t
                )
            }))
        } catch (error) {
            console.error('Error updating task:', error)
            notify.error('Błąd aktualizacji zadania')
        }
    }

    // Group scenes by act
    const scenesByAct: Record<number, Scene[]> = {}
    scenes.forEach(scene => {
        const act = scene.act_number || 1
        if (!scenesByAct[act]) scenesByAct[act] = []
        scenesByAct[act].push(scene)
    })

    const sortedActs = Object.keys(scenesByAct).map(Number).sort((a, b) => a - b)

    if (loading) {
        return <div className="p-6 text-center text-neutral-400">Ładowanie...</div>
    }

    return (
        <div className="space-y-8">
            {sortedActs.map(actNum => (
                <div key={actNum} className="space-y-4">
                    {/* Act Header */}
                    <div className="flex items-center gap-2 px-2">
                        <div className="h-px flex-1 bg-neutral-800" />
                        <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                            {t('act', { actNum })}
                        </span>
                        <div className="h-px flex-1 bg-neutral-800" />
                    </div>

                    {/* Scenes in this act */}
                    {scenesByAct[actNum]
                        .sort((a, b) => a.scene_number - b.scene_number)
                        .map(scene => {
                            const sceneTasks = tasks[scene.id] || []

                            return (
                                <div
                                    key={scene.id}
                                    className="bg-neutral-900 border border-neutral-800 rounded-lg p-4"
                                >
                                    {/* Scene Header */}
                                    <div className="flex items-baseline gap-2 mb-4 pb-3 border-b border-neutral-800">
                                        <span className="text-lg font-bold text-white">
                                            {scene.scene_number}
                                        </span>
                                        {scene.name && (
                                            <span className="text-sm text-neutral-400">
                                                {scene.name}
                                            </span>
                                        )}
                                    </div>

                                    {/* Tasks List */}
                                    <div className="space-y-2 mb-4">
                                        {sceneTasks.length === 0 ? (
                                            <p className="text-sm text-neutral-600 italic">
                                                Brak zadań dla tej sceny
                                            </p>
                                        ) : (
                                            sceneTasks.map(task => (
                                                <div
                                                    key={task.id}
                                                    className="group flex items-start gap-3 p-2 rounded hover:bg-neutral-800/50 transition-colors"
                                                >
                                                    <GripVertical className="w-4 h-4 text-neutral-600 mt-0.5 shrink-0" />
                                                    <input
                                                        type="text"
                                                        value={task.content}
                                                        onChange={(e) => handleUpdateTask(task.id, scene.id, e.target.value)}
                                                        className="flex-1 bg-transparent text-sm text-neutral-300 border-none outline-none focus:text-white"
                                                    />
                                                    <button
                                                        onClick={() => handleDeleteTask(scene.id, task.id)}
                                                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-neutral-500 hover:text-red-400 transition-all"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    {/* Add Task Input */}
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={newTaskContent[scene.id] || ''}
                                            onChange={(e) => setNewTaskContent(prev => ({
                                                ...prev,
                                                [scene.id]: e.target.value
                                            }))}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleAddTask(scene.id)
                                                }
                                            }}
                                            placeholder="Dodaj nowe zadanie..."
                                            className="flex-1 px-3 py-2 bg-neutral-900/50 border border-neutral-700/50 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600 focus:bg-neutral-900"
                                        />
                                        <Button
                                            onClick={() => handleAddTask(scene.id)}
                                            variant="glassy-primary"
                                            size="sm"
                                            leftIcon={<Plus className="w-4 h-4" />}
                                        >
                                            Dodaj
                                        </Button>
                                    </div>
                                </div>
                            )
                        })}
                </div>
            ))}

            {scenes.length === 0 && (
                <div className="text-center py-12 text-neutral-500">
                    <p>Brak zdefiniowanych scen.</p>
                    <p className="text-sm mt-2">Najpierw dodaj sceny w zarządzaniu scenami.</p>
                </div>
            )}
        </div>
    )
}
