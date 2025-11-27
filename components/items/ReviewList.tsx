'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Check, Trash2, Save, X, Loader2 } from 'lucide-react'
import NextImage from 'next/image'
import { useRouter } from 'next/navigation'
import { Database } from '@/types/supabase'
import { useTranslations } from 'next-intl'

type Item = Database['public']['Tables']['items']['Row']
type Location = { id: string; name: string }
type Group = { id: string; name: string }

type Props = {
    initialItems: Item[]
    locations: Location[]
    groups: Group[]
}

export function ReviewList({ initialItems, locations, groups }: Props) {
    const t = useTranslations('ReviewList')
    const [items, setItems] = useState<Item[]>(initialItems)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editForm, setEditForm] = useState<Partial<Item>>({})
    const [processingId, setProcessingId] = useState<string | null>(null)

    const supabase = createClient()
    const router = useRouter()

    const handleEdit = (item: Item) => {
        setEditingId(item.id)
        setEditForm({
            name: item.name,
            location_id: item.location_id,
            group_id: item.group_id,
            notes: item.notes
        })
    }

    const handleCancelEdit = () => {
        setEditingId(null)
        setEditForm({})
    }

    const handleSave = async (id: string) => {
        setProcessingId(id)
        try {
            const { error } = await supabase
                .from('items')
                .update(editForm)
                .eq('id', id)

            if (error) throw error

            setItems(items.map(item => item.id === id ? { ...item, ...editForm } : item))
            setEditingId(null)
        } catch (error) {
            console.error('Error updating item:', error)
            alert(t('updateError'))
        } finally {
            setProcessingId(null)
        }
    }

    const handleConfirm = async (id: string) => {
        setProcessingId(id)
        try {
            const { error } = await supabase
                .from('items')
                .update({ status: 'active' })
                .eq('id', id)

            if (error) throw error

            setItems(items.filter(item => item.id !== id))
            router.refresh()
        } catch (error) {
            console.error('Error confirming item:', error)
            alert(t('confirmError'))
        } finally {
            setProcessingId(null)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm(t('deleteConfirmation'))) return

        setProcessingId(id)
        try {
            const { error } = await supabase
                .from('items')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id)

            if (error) throw error

            setItems(items.filter(item => item.id !== id))
            router.refresh()
        } catch (error) {
            console.error('Error deleting item:', error)
            alert(t('deleteError'))
        } finally {
            setProcessingId(null)
        }
    }

    if (items.length === 0) {
        return (
            <div className="text-center py-20 bg-neutral-900/50 rounded-xl border border-neutral-800">
                <h3 className="text-lg font-medium text-white mb-2">{t('allCaughtUp')}</h3>
                <p className="text-neutral-400 mb-6">{t('noDraftItems')}</p>
                <button
                    onClick={() => router.push('/items/fast-add')}
                    className="inline-flex items-center px-4 py-2 bg-white text-black rounded-md font-medium hover:bg-neutral-200"
                >
                    {t('addMoreItems')}
                </button>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 gap-4">
            {items.map(item => (
                <div key={item.id} className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 flex flex-col sm:flex-row gap-4">
                    {/* Image */}
                    <div className="relative w-full sm:w-32 h-32 flex-shrink-0 bg-neutral-800 rounded-md overflow-hidden">
                        {item.image_url ? (
                            <NextImage src={item.image_url} alt={item.name} fill className="object-cover" />
                        ) : (
                            <div className="flex items-center justify-center h-full text-neutral-600">{t('noImage')}</div>
                        )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-3">
                        {editingId === item.id ? (
                            <div className="space-y-3">
                                <input
                                    type="text"
                                    value={editForm.name || ''}
                                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                    className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white focus:border-ai-primary outline-none"
                                    placeholder={t('itemName')}
                                />
                                <div className="grid grid-cols-2 gap-2">
                                    <select
                                        value={editForm.location_id || ''}
                                        onChange={e => setEditForm({ ...editForm, location_id: e.target.value })}
                                        className="bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white text-sm"
                                    >
                                        <option value="">{t('selectLocation')}</option>
                                        {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                    </select>
                                    <select
                                        value={editForm.group_id || ''}
                                        onChange={e => setEditForm({ ...editForm, group_id: e.target.value })}
                                        className="bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white text-sm"
                                    >
                                        <option value="">{t('selectGroup')}</option>
                                        {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                    </select>
                                </div>
                                <textarea
                                    value={editForm.notes || ''}
                                    onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                                    className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white text-sm h-20 resize-none"
                                    placeholder={t('notes')}
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleSave(item.id)}
                                        disabled={!!processingId}
                                        className="flex items-center px-3 py-1.5 btn-burgundy text-white rounded text-sm"
                                    >
                                        <Save className="w-4 h-4 mr-1" /> {t('save')}
                                    </button>
                                    <button
                                        onClick={handleCancelEdit}
                                        disabled={!!processingId}
                                        className="flex items-center px-3 py-1.5 bg-neutral-800 text-white rounded text-sm hover:bg-neutral-700"
                                    >
                                        <X className="w-4 h-4 mr-1" /> {t('cancel')}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="flex justify-between items-start">
                                    <h3 className="text-lg font-medium text-white truncate pr-4">{item.name}</h3>
                                    <span className="inline-flex items-center rounded-full bg-yellow-400/10 px-2 py-1 text-xs font-medium text-yellow-400 ring-1 ring-inset ring-yellow-400/20">
                                        {t('draft')}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-neutral-400">
                                    <div>{t('location')}: <span className="text-neutral-300">{locations.find(l => l.id === item.location_id)?.name || '-'}</span></div>
                                    <div>{t('group')}: <span className="text-neutral-300">{groups.find(g => g.id === item.group_id)?.name || '-'}</span></div>
                                </div>
                                {item.notes && (
                                    <p className="text-sm text-neutral-500 line-clamp-2">{item.notes}</p>
                                )}
                                {item.ai_description && (
                                    <p className="text-xs text-ai-secondary/70 line-clamp-2 font-mono mt-1">
                                        AI: {item.ai_description}
                                    </p>
                                )}
                            </>
                        )}
                    </div>

                    {/* Actions */}
                    {editingId !== item.id && (
                        <div className="flex sm:flex-col gap-2 justify-end sm:justify-center border-t sm:border-t-0 sm:border-l border-neutral-800 pt-3 sm:pt-0 sm:pl-4">
                            <button
                                onClick={() => handleConfirm(item.id)}
                                disabled={!!processingId}
                                className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 transition-colors"
                                title={t('confirm')}
                            >
                                {processingId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                <span className="sm:hidden ml-2">{t('confirm')}</span>
                            </button>
                            <button
                                onClick={() => handleEdit(item)}
                                disabled={!!processingId}
                                className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-neutral-800 text-white rounded hover:bg-neutral-700 transition-colors"
                                title={t('edit')}
                            >
                                {t('edit')}
                            </button>
                            <button
                                onClick={() => handleDelete(item.id)}
                                disabled={!!processingId}
                                className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-red-900/20 text-red-400 rounded hover:bg-red-900/40 transition-colors"
                                title={t('edit')}
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}
