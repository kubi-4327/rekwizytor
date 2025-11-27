'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { ItemSelectionDialog } from './ItemSelectionDialog'
import NextImage from 'next/image'
import { ItemIcon } from '@/components/ui/ItemIcon'
import { useTranslations } from 'next-intl'

type Item = {
    id: string
    name: string
    image_url: string | null
    notes: string | null
    performance_status: string | null
}

type Assignment = {
    id: string
    item_id: string
    scene_number: string | null
    scene_name: string | null
    setup_instructions: string | null
    items: Item | null // Join result
}

type Scene = {
    id: string
    scene_number: number
    name: string | null
    act_number: number
}

type Props = {
    performanceId: string
    initialAssignments: Assignment[]
    availableItems: Item[]
    definedScenes: Scene[]
    accentColor?: string | null
}

export function ManagePropsForm({ performanceId, initialAssignments, availableItems, definedScenes, accentColor }: Props) {
    const t = useTranslations('ManagePropsForm')
    const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments)
    const [loading, setLoading] = useState(false)

    // New assignment state
    const [selectedSceneId, setSelectedSceneId] = useState('')
    const [customSceneNumber, setCustomSceneNumber] = useState('')
    const [customSceneName, setCustomSceneName] = useState('')


    const [instructions, setInstructions] = useState('')

    const router = useRouter()
    const supabase = createClient()

    const [isDialogOpen, setIsDialogOpen] = useState(false)

    const handleMultiAdd = async (selectedIds: string[]) => {
        let sceneNum = customSceneNumber
        let sceneName = customSceneName

        if (selectedSceneId) {
            const scene = definedScenes.find(s => s.id === selectedSceneId)
            if (scene) {
                sceneNum = scene.scene_number.toString()
                sceneName = scene.name || ''
            }
        }

        if (!sceneNum || selectedIds.length === 0) return

        setLoading(true)
        try {
            const newAssignmentsData = selectedIds.map(itemId => ({
                performance_id: performanceId,
                item_id: itemId,
                scene_number: sceneNum,
                scene_name: sceneName || null,
                setup_instructions: instructions || null
            }))

            const { data, error } = await supabase
                .from('performance_items')
                .insert(newAssignmentsData)
                .select(`
          *,
          items (
            id,
            name,
            image_url,
            notes,
            performance_status
          )
        `)

            if (error) throw error

            // Update items status
            await supabase
                .from('items')
                .update({
                    performance_status: 'active',
                    status: 'active' // Promote draft to active if assigned
                } as any)
                .in('id', selectedIds)

            // Optimistic update
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const newAssignments: Assignment[] = (data as unknown as any[]).map(d => ({
                ...d,
                items: d.items as Item
            }))

            setAssignments([...assignments, ...newAssignments].sort((a, b) => {
                const aVal = a.scene_number || ''
                const bVal = b.scene_number || ''
                const aNum = parseInt(aVal)
                const bNum = parseInt(bVal)
                if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum
                return aVal.localeCompare(bVal)
            }))

            // Reset form
            setInstructions('')
            // Keep scene selection

            router.refresh()
        } catch (error) {
            console.error('Error adding props:', error)
            alert(t('addError'))
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm(t('deleteConfirm'))) return

        try {
            const { error } = await supabase
                .from('performance_items')
                .delete()
                .eq('id', id)

            if (error) throw error

            setAssignments(assignments.filter(a => a.id !== id))
            router.refresh()
        } catch (error) {
            console.error('Error deleting prop:', error)
            alert(t('deleteError'))
        }
    }



    return (
        <div className="space-y-8">
            {/* Add New Assignment Form */}
            <div className="bg-neutral-900/50 p-6 rounded-xl border border-neutral-800 space-y-4">
                <h3 className="text-lg font-medium text-white flex items-center">
                    <Plus
                        className="mr-2 h-5 w-5"
                        style={{ color: accentColor || '#60a5fa' }} // Default to blue-400
                    />
                    {t('addPropToScene')}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-5">
                        <label className="block text-xs font-medium text-neutral-400 mb-1">{t('scene')}</label>
                        {definedScenes.length > 0 ? (
                            <select
                                value={selectedSceneId}
                                onChange={(e) => {
                                    setSelectedSceneId(e.target.value)
                                    if (e.target.value === 'custom') {
                                        setCustomSceneNumber('')
                                        setCustomSceneName('')
                                    }
                                }}
                                className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-white text-sm focus:border-neutral-500 focus:outline-none"
                            >
                                <option value="">{t('selectScene')}</option>
                                {definedScenes.map(scene => (
                                    <option key={scene.id} value={scene.id}>
                                        {t('actScene', { act: scene.act_number, scene: scene.scene_number })} {scene.name ? `- ${scene.name}` : ''}
                                    </option>
                                ))}
                                <option value="custom">{t('customScene')}</option>
                            </select>
                        ) : (
                            <div className="text-sm text-neutral-500 py-2">
                                {t('noScenesDefined')} <a href={`/performances/${performanceId}/scenes`} className="text-blue-400 hover:underline">{t('manageScenes')}</a> {t('orUseCustom')}
                            </div>
                        )}

                        {(selectedSceneId === 'custom' || definedScenes.length === 0) && (
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                <input
                                    type="text"
                                    value={customSceneNumber}
                                    onChange={(e) => setCustomSceneNumber(e.target.value)}
                                    placeholder={t('sceneNumPlaceholder')}
                                    className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-white text-sm focus:border-neutral-500 focus:outline-none"
                                />
                                <input
                                    type="text"
                                    value={customSceneName}
                                    onChange={(e) => setCustomSceneName(e.target.value)}
                                    placeholder={t('nameOptPlaceholder')}
                                    className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-white text-sm focus:border-neutral-500 focus:outline-none"
                                />
                            </div>
                        )}
                    </div>
                    <div className="md:col-span-7">
                        <div className="flex gap-4 items-end">
                            <div className="flex-1">
                                <label className="block text-xs font-medium text-neutral-400 mb-1">{t('setupInstructions')}</label>
                                <input
                                    type="text"
                                    value={instructions}
                                    onChange={(e) => setInstructions(e.target.value)}
                                    placeholder={t('instructionsPlaceholder')}
                                    className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-white text-sm focus:border-neutral-500 focus:outline-none h-[38px]"
                                />
                            </div>
                            <button
                                onClick={() => setIsDialogOpen(true)}
                                disabled={loading || (!selectedSceneId && !customSceneNumber)}
                                className="flex items-center justify-center rounded-md bg-white px-6 py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed h-[38px] whitespace-nowrap"
                                style={accentColor ? { backgroundColor: accentColor, color: 'white' } : {}}
                            >
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                                {t('selectPropsButton')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <ItemSelectionDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                onConfirm={handleMultiAdd}
                items={availableItems}
                accentColor={accentColor}
            />

            {/* List of Assignments */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium text-white">{t('assignedPropsScript')}</h3>

                <div className="rounded-lg border border-neutral-800 bg-neutral-900 overflow-hidden overflow-x-auto">
                    <table className="min-w-full divide-y divide-neutral-800">
                        <thead className="bg-neutral-950">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider w-24">{t('columns.scene')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">{t('columns.item')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">{t('columns.instructions')}</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-neutral-400 uppercase tracking-wider w-20">{t('columns.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-800">
                            {assignments.map((assignment) => (
                                <tr key={assignment.id} className="hover:bg-neutral-800/50">
                                    <td className="px-6 py-4 whitespace-nowrap align-top">
                                        <div className="text-sm font-bold text-white">#{assignment.scene_number || '?'}</div>
                                        <div className="text-xs text-neutral-500">{assignment.scene_name}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap align-top">
                                        <div className="flex items-center">
                                            <div className="h-10 w-10 flex-shrink-0 relative bg-neutral-800 rounded overflow-hidden flex items-center justify-center">
                                                {assignment.items?.image_url ? (
                                                    <NextImage src={assignment.items.image_url} alt="" fill className="object-cover" unoptimized />
                                                ) : (
                                                    <ItemIcon name={assignment.items?.name || ''} className="h-5 w-5 text-neutral-600" />
                                                )}
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-bold text-white">{assignment.items?.name || t('unknownItem')}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 align-top">
                                        <div className="text-sm text-neutral-400">{assignment.setup_instructions || '-'}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium align-top">
                                        <button
                                            onClick={() => handleDelete(assignment.id)}
                                            className="text-neutral-500 hover:text-red-400 transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {assignments.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-neutral-500 text-sm">
                                        {t('noPropsAssigned')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div >
    )
}
