'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'

type Scene = {
    id: string
    scene_number: number
    name: string | null
    act_number: number
}

type Props = {
    performanceId: string
    initialScenes: Scene[]
    performanceColor?: string | null
}

export function ManageScenesForm({ performanceId, initialScenes, performanceColor }: Props) {
    const t = useTranslations('ManageScenesForm')
    const [scenes, setScenes] = useState<Scene[]>(initialScenes)
    const [loading, setLoading] = useState(false)

    // New scene state
    const [newSceneNumber, setNewSceneNumber] = useState(
        initialScenes.length > 0
            ? Math.max(...initialScenes.map(s => s.scene_number)) + 1
            : 1
    )
    const [newSceneName, setNewSceneName] = useState('')
    const [newSceneAct, setNewSceneAct] = useState(
        initialScenes.length > 0
            ? initialScenes[initialScenes.length - 1].act_number
            : 1
    )

    const router = useRouter()
    const supabase = createClient()

    const handleAdd = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('scenes')
                .insert({
                    performance_id: performanceId,
                    scene_number: newSceneNumber,
                    name: newSceneName || null,
                    act_number: newSceneAct
                })
                .select()
                .single()

            if (error) throw error

            setScenes([...scenes, { ...data, act_number: data.act_number ?? 1 }].sort((a, b) => a.scene_number - b.scene_number))

            // Prepare for next entry
            setNewSceneNumber(data.scene_number + 1)
            setNewSceneName('')
            setNewSceneAct(data.act_number ?? 1)

            router.refresh()
        } catch (error) {
            console.error('Error adding scene:', error)
            alert(t('addError'))
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm(t('deleteConfirm'))) return

        try {
            const { error } = await supabase
                .from('scenes')
                .delete()
                .eq('id', id)

            if (error) throw error

            setScenes(scenes.filter(s => s.id !== id))
            router.refresh()
        } catch (error) {
            console.error('Error deleting scene:', error)
            alert(t('deleteError'))
        }
    }

    const handleUpdate = async (id: string, updates: Partial<Scene>) => {
        try {
            const { error } = await supabase
                .from('scenes')
                .update(updates)
                .eq('id', id)

            if (error) throw error

            setScenes(scenes.map(s => s.id === id ? { ...s, ...updates } : s))
            router.refresh()
        } catch (error) {
            console.error('Error updating scene:', error)
            alert(t('updateError'))
        }
    }

    // Group scenes by act for display
    const scenesByAct: Record<number, Scene[]> = {}
    scenes.forEach(scene => {
        if (!scenesByAct[scene.act_number]) scenesByAct[scene.act_number] = []
        scenesByAct[scene.act_number].push(scene)
    })

    return (
        <div className="space-y-8">
            {/* Add New Scene Form */}
            <div className="bg-neutral-900/50 p-6 rounded-xl border border-neutral-800 space-y-4">
                <h3 className="text-lg font-medium text-white flex items-center">
                    <Plus
                        className="mr-2 h-5 w-5"
                        style={{ color: performanceColor || '#60a5fa' }} // Default to blue-400
                    />
                    {t('addNewScene')}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-neutral-400 mb-1">{t('actNumber')}</label>
                        <input
                            type="number"
                            min="1"
                            value={newSceneAct}
                            onChange={(e) => setNewSceneAct(parseInt(e.target.value) || 1)}
                            className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-white text-sm focus:border-neutral-500 focus:outline-none"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-neutral-400 mb-1">{t('sceneNumber')}</label>
                        <input
                            type="number"
                            min="1"
                            value={newSceneNumber}
                            onChange={(e) => setNewSceneNumber(parseInt(e.target.value) || 1)}
                            className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-white text-sm focus:border-neutral-500 focus:outline-none"
                        />
                    </div>
                    <div className="md:col-span-5">
                        <label className="block text-xs font-medium text-neutral-400 mb-1">{t('sceneNameOptional')}</label>
                        <input
                            type="text"
                            value={newSceneName}
                            onChange={(e) => setNewSceneName(e.target.value)}
                            placeholder={t('sceneNamePlaceholder')}
                            className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-white text-sm focus:border-neutral-500 focus:outline-none"
                        />
                    </div>
                    <div className="md:col-span-3">
                        <button
                            onClick={handleAdd}
                            disabled={loading}
                            className="w-full flex items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed h-[38px]"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('addScene')}
                        </button>
                    </div>
                </div>
            </div>

            {/* List of Scenes */}
            <div className="space-y-6">
                {Object.entries(scenesByAct).sort((a, b) => parseInt(a[0]) - parseInt(b[0])).map(([actNum, actScenes]) => (
                    <div key={actNum} className="space-y-3">
                        <div className="flex items-center gap-4">
                            <h3 className="text-lg font-bold text-white">{t('act')} {actNum}</h3>
                            <div className="h-px flex-1 bg-neutral-800"></div>
                        </div>

                        <div className="grid gap-2">
                            {actScenes.sort((a, b) => a.scene_number - b.scene_number).map((scene) => (
                                <div key={scene.id} className="flex items-center gap-4 p-3 rounded-lg bg-neutral-900 border border-neutral-800 group hover:border-neutral-700 transition-colors">
                                    <div className="w-16 flex-shrink-0">
                                        <span className="text-xs text-neutral-500 uppercase block">{t('scene')}</span>
                                        <span className="text-lg font-bold text-white">#{scene.scene_number}</span>
                                    </div>

                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            value={scene.name || ''}
                                            onChange={(e) => handleUpdate(scene.id, { name: e.target.value })}
                                            placeholder={t('sceneName')}
                                            className="w-full bg-transparent border-none p-0 text-white placeholder-neutral-600 focus:ring-0 text-sm font-medium"
                                        />
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className="flex flex-col items-end mr-4">
                                            <label className="text-[10px] text-neutral-500 uppercase">{t('act')}</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={scene.act_number}
                                                onChange={(e) => handleUpdate(scene.id, { act_number: parseInt(e.target.value) || 1 })}
                                                className="w-12 bg-neutral-950 border border-neutral-800 rounded px-1 py-0.5 text-right text-xs text-white focus:border-neutral-500 focus:outline-none"
                                            />
                                        </div>

                                        <button
                                            onClick={() => handleDelete(scene.id)}
                                            className="p-2 text-neutral-600 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {scenes.length === 0 && (
                    <div className="text-center py-12 text-neutral-500 border border-dashed border-neutral-800 rounded-xl">
                        {t('noScenes')}
                    </div>
                )}
            </div>
        </div>
    )
}
