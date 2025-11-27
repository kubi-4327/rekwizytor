'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, Save, Sparkles } from 'lucide-react'
import { Database } from '@/types/supabase'
import { updateItem } from '@/app/actions/update-item'
import { generateItemDescriptions } from '@/app/actions/generate-description'
import NextImage from 'next/image'
import { ItemIcon } from '@/components/ui/ItemIcon'
import { useRouter } from 'next/navigation'

type Item = Database['public']['Tables']['items']['Row']
type Location = Database['public']['Tables']['locations']['Row']
type Group = Database['public']['Tables']['groups']['Row']

type Props = {
    item: Item | null
    isOpen: boolean
    onClose: () => void
    locations: Location[]
    groups: Group[]
}

export function EditItemDialog({ item, isOpen, onClose, locations, groups }: Props) {
    const [isSaving, setIsSaving] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const [aiDescription, setAiDescription] = useState('')
    const router = useRouter()

    useEffect(() => {
        if (item) {
            setAiDescription(item.ai_description || '')
        }
    }, [item])

    if (!isOpen || !item) return null

    const handleGenerateAI = async () => {
        setIsGenerating(true)
        try {
            const result = await generateItemDescriptions(item.id, item.name, item.notes, item.image_url)
            if (result.success && result.data) {
                setAiDescription(result.data.ai_description || '')
                // Optionally update other fields if they are empty or user wants to overwrite?
                // For now, we just update the AI description state which is bound to the textarea
                // and maybe trigger a refresh of the item data if needed, but the form submission will save it all.

                // We also update the notes textarea if it's empty
                const notesTextarea = document.querySelector('textarea[name="notes"]') as HTMLTextAreaElement
                if (notesTextarea && !notesTextarea.value && result.data.description) {
                    notesTextarea.value = result.data.description
                }

                router.refresh()
            } else {
                alert('Failed to generate descriptions')
            }
        } catch (error) {
            console.error('AI Generation error:', error)
            alert('Error generating descriptions')
        } finally {
            setIsGenerating(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsSaving(true)

        try {
            const formData = new FormData(e.currentTarget)
            const result = await updateItem(item.id, formData)

            if (result.error) {
                alert(result.error)
            } else {
                onClose()
                router.refresh()
            }
        } catch (error) {
            console.error('Failed to update item:', error)
            alert('Failed to update item')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
                <div className="flex items-center justify-between p-4 border-b border-neutral-800 flex-shrink-0">
                    <h2 className="text-lg font-semibold text-white">Edit Item</h2>
                    <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 p-6">
                    <form id="edit-item-form" onSubmit={handleSubmit} className="space-y-6">
                        <div className="flex flex-col sm:flex-row gap-6">
                            {/* Image Preview */}
                            <div className="w-full sm:w-1/3">
                                <div className="aspect-square rounded-lg bg-neutral-800 relative overflow-hidden border border-neutral-700">
                                    {item.image_url ? (
                                        <NextImage
                                            src={item.image_url}
                                            alt={item.name}
                                            fill
                                            className="object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <ItemIcon name={item.name} className="w-16 h-16 text-neutral-600" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Fields */}
                            <div className="flex-1 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-neutral-400 mb-1">Name</label>
                                    <input
                                        name="name"
                                        defaultValue={item.name}
                                        required
                                        className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3 py-2 text-white focus:border-ai-primary focus:outline-none transition-colors"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-neutral-400 mb-1">Description / Notes</label>
                                    <textarea
                                        name="notes"
                                        defaultValue={item.notes || ''}
                                        rows={4}
                                        className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3 py-2 text-white focus:border-ai-primary focus:outline-none transition-colors resize-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-neutral-400 mb-1">Category</label>
                                <select
                                    name="groupId"
                                    defaultValue={item.group_id || ''}
                                    className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3 py-2 text-white focus:border-ai-primary focus:outline-none transition-colors"
                                >
                                    <option value="">No Category</option>
                                    {groups.map(g => (
                                        <option key={g.id} value={g.id}>{g.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-400 mb-1">Location</label>
                                <select
                                    name="locationId"
                                    defaultValue={item.location_id || ''}
                                    className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3 py-2 text-white focus:border-ai-primary focus:outline-none transition-colors"
                                >
                                    <option value="">No Location</option>
                                    {locations.map(l => (
                                        <option key={l.id} value={l.id}>{l.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-400 mb-1">Status</label>
                                <select
                                    name="status"
                                    defaultValue={item.status}
                                    className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3 py-2 text-white focus:border-ai-primary focus:outline-none transition-colors"
                                >
                                    <option value="active">Active</option>
                                    <option value="draft">Draft</option>
                                </select>
                            </div>
                        </div>

                        <div className="bg-neutral-950/50 p-4 rounded-lg border border-neutral-800 space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="block text-sm font-medium text-ai-secondary">AI Data</label>
                                <button
                                    type="button"
                                    onClick={handleGenerateAI}
                                    disabled={isGenerating}
                                    className="text-xs flex items-center gap-1 text-ai-secondary hover:text-ai-secondary/80 transition-colors disabled:opacity-50"
                                >
                                    {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                    {isGenerating ? 'Generating...' : 'Generate Descriptions'}
                                </button>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-neutral-500 mb-1">AI Description (Keywords)</label>
                                <textarea
                                    name="ai_description"
                                    value={aiDescription}
                                    onChange={(e) => setAiDescription(e.target.value)}
                                    rows={2}
                                    className="w-full rounded bg-neutral-900 border border-neutral-800 px-2 py-1.5 text-xs text-neutral-300 focus:border-ai-primary/50 focus:outline-none transition-colors resize-none font-mono"
                                    placeholder="Keywords generated by AI..."
                                />
                            </div>
                        </div>
                    </form>
                </div>

                <div className="p-4 border-t border-neutral-800 flex-shrink-0 bg-neutral-900 rounded-b-xl">
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="edit-item-form"
                            disabled={isSaving}
                            className="flex items-center px-4 py-2 rounded-lg text-sm font-medium btn-burgundy text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
