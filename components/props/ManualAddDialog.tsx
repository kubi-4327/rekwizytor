'use client'

import { Fragment, useState } from 'react'
import { X, List, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

import { bulkInsertProps } from '@/app/actions/performance-props'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { notify } from '@/utils/notify'

interface ManualAddDialogProps {
    isOpen: boolean
    onClose: () => void
    performanceId: string
    onItemsAdded?: () => void
}

export function ManualAddDialog({ isOpen, onClose, performanceId, onItemsAdded }: ManualAddDialogProps) {
    const t = useTranslations('PropsChecklist')
    const router = useRouter()
    const [bulkText, setBulkText] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleClose = () => {
        setBulkText('')
        setIsSubmitting(false)
        onClose()
    }

    const handleBulkAdd = async () => {
        if (!bulkText.trim()) return

        const lines = bulkText.split('\n').filter(line => line.trim())
        if (lines.length === 0) return

        setIsSubmitting(true)
        const result = await bulkInsertProps(performanceId, lines)

        if (result.success && result.data) {
            notify.success(t('propsAdded', { count: result.data.length }))
            setBulkText('')
            router.refresh()
            if (onItemsAdded) onItemsAdded()
            handleClose()
        } else {
            notify.error(result.error || t('errorBulkAdding'))
        }
        setIsSubmitting(false)
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={
                <div className="flex items-center justify-center sm:justify-start gap-2">
                    <ClipboardList className="w-5 h-5 text-accent-main" />
                    {t('bulkAddLabel') || 'Manual Quick Add'}
                </div>
            }
        >
            <div className="text-center sm:text-left sm:mt-2">
                <p className="text-sm text-neutral-400 mb-4 text-center sm:text-left">
                    Enter items below, each in a new line.
                </p>

                <div className="mt-2 space-y-4 text-left">
                    <textarea
                        value={bulkText}
                        onChange={(e) => setBulkText(e.target.value)}
                        placeholder={t('bulkAddPlaceholder')}
                        className="w-full h-48 px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-accent-main resize-none font-mono text-sm leading-relaxed"
                        autoFocus
                    />

                    <div className="flex gap-2 pt-2">
                        <Button variant="secondary" onClick={handleClose} className="flex-1">
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleBulkAdd}
                            disabled={!bulkText.trim() || isSubmitting}
                            isLoading={isSubmitting}
                            className="flex-1"
                        >
                            Add Items
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    )
}

