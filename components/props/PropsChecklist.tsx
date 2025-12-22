'use client'

import { useState } from 'react'
import { Check, Plus, Trash2, Edit2, X, Camera } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { addProp, deleteProp, updatePropStatus, updatePropName, bulkInsertProps } from '@/app/actions/performance-props'
import { useTranslations } from 'next-intl'
import toast from 'react-hot-toast'
import { PropsScannerDialog } from './PropsScannerDialog'
import { ManualAddDialog } from './ManualAddDialog'
import { DropdownAction } from '@/components/ui/DropdownAction'
import { useRouter } from 'next/navigation'

type Prop = {
    id: string
    item_name: string
    is_checked: boolean | null
    created_at: string | null
    performance_id: string
    order: number | null
}

type Props = {
    performanceId: string
    initialProps: Prop[]
    variant?: 'manage' | 'checklist'
}

export function PropsChecklist({ performanceId, initialProps, variant = 'checklist' }: Props) {
    const t = useTranslations('PropsChecklist')
    const router = useRouter()
    const [props, setProps] = useState<Prop[]>(initialProps)
    const [newPropName, setNewPropName] = useState('')
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editingName, setEditingName] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isScannerOpen, setIsScannerOpen] = useState(false)
    const [isManualAddOpen, setIsManualAddOpen] = useState(false)

    const handleToggleCheck = async (propId: string, currentStatus: boolean) => {
        // Optimistic update
        setProps(prev => prev.map(p =>
            p.id === propId ? { ...p, is_checked: !currentStatus } : p
        ))

        const result = await updatePropStatus(propId, !currentStatus)

        if (!result.success) {
            // Revert on error
            setProps(prev => prev.map(p =>
                p.id === propId ? { ...p, is_checked: currentStatus } : p
            ))
            toast.error(t('errorUpdating'))
        }
    }

    const handleAddProp = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newPropName.trim()) return

        setIsSubmitting(true)
        const result = await addProp(performanceId, newPropName)

        if (result.success && result.data) {
            setProps(prev => [...prev, result.data])
            setNewPropName('')
            toast.success(t('propAdded'))
        } else {
            toast.error(result.error || t('errorAdding'))
        }
        setIsSubmitting(false)
    }

    const handleDelete = async (propId: string) => {
        // Optimistic delete
        const originalProps = [...props]
        setProps(prev => prev.filter(p => p.id !== propId))

        const result = await deleteProp(propId, performanceId)

        if (!result.success) {
            // Revert on error
            setProps(originalProps)
            toast.error(t('errorDeleting'))
        } else {
            toast.success(t('propDeleted'))
        }
    }

    const handleStartEdit = (prop: Prop) => {
        setEditingId(prop.id)
        setEditingName(prop.item_name)
    }

    const handleCancelEdit = () => {
        setEditingId(null)
        setEditingName('')
    }

    const handleSaveEdit = async (propId: string) => {
        if (!editingName.trim()) {
            handleCancelEdit()
            return
        }

        const result = await updatePropName(propId, editingName, performanceId)

        if (result.success && result.data) {
            setProps(prev => prev.map(p =>
                p.id === propId ? result.data : p
            ))
            setEditingId(null)
            setEditingName('')
            toast.success(t('propUpdated'))
        } else {
            toast.error(result.error || t('errorUpdating'))
        }
    }

    const checkedCount = props.filter(p => p.is_checked).length
    const totalCount = props.length

    return (
        <div className="space-y-6">
            {/* Header with stats */}
            <div className="flex items-center justify-between gap-2">
                {variant === 'checklist' ? (
                    <div className="text-sm text-neutral-400">
                        {t('progress', { checked: checkedCount, total: totalCount })}
                    </div>
                ) : <div />}
                {variant === 'manage' && (
                    <div className="flex gap-2">
                        <DropdownAction
                            label="Add Items"
                            icon={<Plus className="h-4 w-4" />}
                            variant="primary"
                            items={[
                                {
                                    label: 'Scan Photo',
                                    icon: <Camera className="h-4 w-4" />,
                                    onClick: () => setIsScannerOpen(true)
                                },
                                {
                                    label: 'Manual List',
                                    icon: <Edit2 className="h-4 w-4" />,
                                    onClick: () => setIsManualAddOpen(true)
                                }
                            ]}
                        />
                    </div>
                )}
            </div>

            {/* Props List - Two Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {props.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-neutral-500">
                        {t('noProps')}
                    </div>
                ) : (
                    props.map((prop) => (
                        <div
                            key={prop.id}
                            className="group flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900/40 p-3 hover:bg-neutral-900/60 transition-colors"
                        >
                            {/* Checkbox (Only in checklist mode) */}
                            {variant === 'checklist' && (
                                <button
                                    onClick={() => handleToggleCheck(prop.id, prop.is_checked ?? false)}
                                    className={`flex-shrink-0 h-5 w-5 rounded border-2 flex items-center justify-center transition-all ${prop.is_checked
                                        ? 'border-transparent'
                                        : 'border-neutral-600 hover:border-neutral-500'
                                        }`}
                                    style={{
                                        backgroundColor: prop.is_checked ? '#A0232F' : 'transparent',
                                    }}
                                >
                                    {prop.is_checked && (
                                        <Check className="h-3 w-3 text-white" />
                                    )}
                                </button>
                            )}

                            {/* Name */}
                            {editingId === prop.id ? (
                                <input
                                    type="text"
                                    value={editingName}
                                    onChange={(e) => setEditingName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveEdit(prop.id)
                                        if (e.key === 'Escape') handleCancelEdit()
                                    }}
                                    className="flex-1 px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    autoFocus
                                />
                            ) : (
                                <span
                                    className={`flex-1 ${prop.is_checked && variant === 'checklist'
                                        ? 'text-neutral-500 line-through'
                                        : 'text-white'
                                        }`}
                                >
                                    {prop.item_name}
                                </span>
                            )}

                            {/* Actions (Always visible or only in manage? Usually needed for manage. Checklist might just be checking off) */}
                            {variant === 'manage' && (
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {editingId === prop.id ? (
                                        <>
                                            <button
                                                onClick={() => handleSaveEdit(prop.id)}
                                                className="p-1.5 rounded hover:bg-neutral-800 text-green-400"
                                            >
                                                <Check className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={handleCancelEdit}
                                                className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => handleStartEdit(prop)}
                                                className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(prop.id)}
                                                className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-red-400"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* AI Scanner Dialog */}
            <PropsScannerDialog
                isOpen={isScannerOpen}
                onClose={() => setIsScannerOpen(false)}
                performanceId={performanceId}
                onItemsAdded={() => {
                    // Optimistically update props list
                    router.refresh()
                    setIsScannerOpen(false)
                }}
            />

            {/* Manual Add Dialog */}
            <ManualAddDialog
                isOpen={isManualAddOpen}
                onClose={() => setIsManualAddOpen(false)}
                performanceId={performanceId}
                onItemsAdded={() => {
                    router.refresh()
                }}
            />
        </div>
    )
}
