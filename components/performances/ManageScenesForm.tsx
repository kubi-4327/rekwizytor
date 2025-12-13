'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Loader2, Wand2, ChevronDown, CheckCheck, ArrowLeft } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { SceneImportWizard } from './SceneImportWizard'
import { SceneKanbanBoard } from './SceneKanbanBoard'
import { generateSceneNoteContent, syncSceneNoteContent } from '@/components/notes/utils'
import { SmartSyncDialog } from './smart-sync-dialog'

type Scene = {
    id: string
    scene_number: number
    name: string | null
    act_number: number
    performance_id?: string
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
    const [showWizard, setShowWizard] = useState(false)
    const [showSyncDialog, setShowSyncDialog] = useState(false)
    const [isSyncing, setIsSyncing] = useState(false)

    const router = useRouter()
    const supabase = createClient()

    const [isMenuOpen, setIsMenuOpen] = useState(false)

    // Check if scenes changed significantly
    const hasChanges = JSON.stringify(initialScenes) !== JSON.stringify(scenes)

    const handleBackWithCheck = () => {
        if (hasChanges) {
            setShowSyncDialog(true)
        } else {
            router.back()
        }
    }

    const performSync = async (scenesToSave: Scene[]) => {
        setIsSyncing(true)
        try {
            // 1. Get Performance Title
            const { data: performance } = await supabase.from('performances').select('title').eq('id', performanceId).single()
            if (!performance) throw new Error('Performance not found')

            const noteTitle = `Notatka sceniczna - ${performance.title}`

            // 2. Find existing note
            const { data: existingNote } = await supabase
                .from('notes')
                .select('*')
                .eq('performance_id', performanceId)
                .eq('title', noteTitle)
                .single()

            if (existingNote) {
                // Sync existing
                const newContent = syncSceneNoteContent(existingNote.content, initialScenes, scenesToSave)
                const { error: updateError } = await supabase
                    .from('notes')
                    .update({ content: newContent })
                    .eq('id', existingNote.id)

                if (updateError) throw updateError
            } else {
                // Create new
                const newContent = generateSceneNoteContent(scenesToSave)
                const { data: userData } = await supabase.auth.getUser()

                const { error: insertError } = await supabase.from('notes').insert({
                    performance_id: performanceId,
                    title: noteTitle,
                    content: newContent,
                    created_by: userData.user?.id
                })

                if (insertError) throw insertError
            }
        } catch (error) {
            console.error('Sync error:', error)
            alert(t('updateError') + ': ' + (error as any).message)
        } finally {
            setIsSyncing(false)
        }
    }

    const handleConfirmSync = async () => {
        await performSync(scenes)
        router.back()
    }

    const handleIgnoreSync = () => {
        router.back()
    }

    // Handlers for Kanban
    const handleReorder = async (newScenes: Scene[]) => {
        setScenes(newScenes)
        try {
            const updates = newScenes.map(s => ({
                id: s.id,
                performance_id: performanceId,
                act_number: s.act_number,
                scene_number: s.scene_number,
                name: s.name
            }))
            const { error } = await supabase.from('scenes').upsert(updates)
            if (error) throw error
        } catch (error) {
            console.error('Error reordering scenes:', error)
            alert(t('updateError'))
            router.refresh()
        }
    }

    const handleQuickAdd = async (act: number, name: string) => {
        const actScenes = scenes.filter(s => s.act_number === act)
        const maxNum = Math.max(0, ...actScenes.map(s => s.scene_number))
        const nextNum = maxNum + 1
        const tempId = crypto.randomUUID()
        const newScene: Scene = { id: tempId, act_number: act, scene_number: nextNum, name: name, performance_id: performanceId }

        setScenes([...scenes, newScene])

        try {
            const { data, error } = await supabase
                .from('scenes')
                .insert({ performance_id: performanceId, act_number: act, scene_number: nextNum, name: name })
                .select()
                .single()

            if (error) throw error
            setScenes(prev => prev.map(s => s.id === tempId ? { ...s, id: data.id } : s))
            router.refresh()
        } catch (error) {
            console.error('Error adding scene:', error)
            alert(t('addError'))
            setScenes(scenes)
        }
    }

    const handleUpdate = async (id: string, updates: Partial<Scene>) => {
        setScenes(scenes.map(s => s.id === id ? { ...s, ...updates } : s))
        try {
            const { error } = await supabase.from('scenes').update(updates).eq('id', id)
            if (error) throw error
            router.refresh()
        } catch (error) {
            console.error('Error updating scene:', error)
            alert(t('updateError'))
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm(t('deleteConfirm'))) return
        setScenes(scenes.filter(s => s.id !== id))
        try {
            const { error } = await supabase.from('scenes').delete().eq('id', id)
            if (error) throw error
            router.refresh()
        } catch (error) {
            console.error('Error deleting scene:', error)
            alert(t('deleteError'))
            router.refresh()
        }
    }

    return (
        <div className="space-y-6">
            <SmartSyncDialog
                isOpen={showSyncDialog}
                onConfirm={handleConfirmSync}
                onCancel={() => setShowSyncDialog(false)}
                onIgnore={handleIgnoreSync}
                isSyncing={isSyncing}
            />

            {showWizard && (
                <SceneImportWizard
                    performanceId={performanceId}
                    existingScenes={scenes.map(s => ({ act: s.act_number, number: s.scene_number }))}
                    onClose={() => setShowWizard(false)}
                />
            )}

            <div className="flex justify-between items-center bg-neutral-900/50 p-4 rounded-xl border border-neutral-800">
                <div className="flex items-center gap-4">
                    <button onClick={handleBackWithCheck} className="p-2 hover:bg-neutral-800 rounded-full text-neutral-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h3 className="text-lg font-medium text-white flex items-center">
                        <span className="w-2 h-8 rounded-full mr-3" style={{ backgroundColor: performanceColor || '#C92F3E' }} />
                        {t('manageScenes')}
                    </h3>
                </div>

                <div className="relative flex gap-2">
                    <button
                        onClick={handleBackWithCheck}
                        className="hidden sm:flex items-center gap-2 px-4 py-2 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-md transition-colors"
                    >
                        <CheckCheck className="w-4 h-4" />
                        Done
                    </button>

                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="flex items-center gap-2 px-4 py-2 bg-[#C92F3E] text-white text-sm font-medium rounded-md hover:bg-[#A62733] transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        {t('addScene')}
                        <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isMenuOpen && (
                        <div className="absolute right-0 mt-12 w-48 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl z-50 overflow-hidden">
                            <button
                                onClick={() => { setIsMenuOpen(false) }}
                                className="w-full text-left px-4 py-3 text-sm text-neutral-300 hover:bg-neutral-800 flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                {t('manualEntry')}
                            </button>
                            <button
                                onClick={() => { setIsMenuOpen(false); setShowWizard(true) }}
                                className="w-full text-left px-4 py-3 text-sm text-purple-400 hover:bg-neutral-800 flex items-center gap-2 border-t border-neutral-800"
                            >
                                <Wand2 className="w-4 h-4" />
                                {t('aiImport')}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <SceneKanbanBoard
                scenes={scenes}
                onReorder={handleReorder}
                onUpdate={handleUpdate}
                onRemove={handleDelete}
                onAdd={handleQuickAdd}
            />
        </div>
    )
}
