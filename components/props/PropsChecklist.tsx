'use client'

import { useState } from 'react'
import { Check, Plus, Trash2, Edit2, X, Camera } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { addProp, deleteProp, updatePropStatus, updatePropName, bulkInsertProps } from '@/app/actions/performance-props'
import { useTranslations } from 'next-intl'
import { notify } from '@/utils/notify'
import { PropsScannerDialog } from './PropsScannerDialog'
import { ManualAddDialog } from './ManualAddDialog'
import { DropdownAction } from '@/components/ui/DropdownAction'
import { useRouter } from 'next/navigation'
import { PropsKanbanBoard } from './PropsKanbanBoard'

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
            notify.error(t('errorUpdating'))
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
            notify.success(t('propAdded'))
        } else {
            notify.error(result.error || t('errorAdding'))
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
            notify.error(t('errorDeleting'))
        } else {
            notify.success(t('propDeleted'))
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
            notify.success(t('propUpdated'))
        } else {
            notify.error(result.error || t('errorUpdating'))
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

            {/* Props Kanban Board */}
            <PropsKanbanBoard
                performanceId={performanceId}
                initialProps={props}
                variant={variant}
                onDelete={handleDelete}
            />

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
