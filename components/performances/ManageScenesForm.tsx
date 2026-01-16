'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { Plus, Trash2, Loader2, Wand2, ChevronDown, ArrowLeft, Layers } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { SceneImportWizard } from './SceneImportWizard'
import { SceneKanbanBoard } from './SceneKanbanBoard'

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
    pageTitle: string
    pageSubtitle?: string
}

export function ManageScenesForm({ performanceId, initialScenes, performanceColor, pageTitle, pageSubtitle }: Props) {
    const t = useTranslations('ManageScenesForm')
    const [scenes, setScenes] = useState<Scene[]>(initialScenes)
    const [loading, setLoading] = useState(false)
    const [showWizard, setShowWizard] = useState(false)

    const router = useRouter()
    const supabase = createClient()

    const [isMenuOpen, setIsMenuOpen] = useState(false)

    // Check if scenes changed significantly
    const hasChanges = JSON.stringify(initialScenes) !== JSON.stringify(scenes)

    const handleBackWithCheck = () => {
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

    const handleDeleteAct = async (actNumber: number) => {
        if (!confirm(t('deleteActConfirm', { actNumber }))) return
        setScenes(scenes.filter(s => s.act_number !== actNumber))
        try {
            const { error } = await supabase.from('scenes').delete().eq('performance_id', performanceId).eq('act_number', actNumber)
            if (error) throw error
            router.refresh()
        } catch (error) {
            console.error('Error deleting act:', error)
            alert(t('deleteError'))
            router.refresh()
        }
    }

    return (
        <div className="space-y-6">


            {showWizard && (
                <SceneImportWizard
                    performanceId={performanceId}
                    existingScenes={scenes.map(s => ({ act: s.act_number, number: s.scene_number }))}
                    onClose={() => setShowWizard(false)}
                />
            )}

            <PageHeader
                title={pageTitle}
                subtitle={pageSubtitle}
                icon={<Layers className="w-6 h-6 text-white" />}
                iconColor="text-purple-400"
            >
                <Button
                    variant="ghost"
                    onClick={() => setShowWizard(true)}
                    leftIcon={<Wand2 className="w-4 h-4" />}
                >
                    {t('aiImport')}
                </Button>
                <Button
                    onClick={handleBackWithCheck}
                    leftIcon={<ArrowLeft className="w-4 h-4" />}
                >
                    Done
                </Button>
            </PageHeader>

            <SceneKanbanBoard
                scenes={scenes}
                onReorder={handleReorder}
                onUpdate={handleUpdate}
                onRemove={handleDelete}
                onRemoveAct={handleDeleteAct}
                onAdd={handleQuickAdd}
            />
        </div>
    )
}
