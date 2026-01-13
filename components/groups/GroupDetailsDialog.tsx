'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import {
    MapPin,
    Calendar,
    Folder,
    Edit2,
    Trash2,
    QrCode
} from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import { useTranslations } from 'next-intl'
import { notify } from '@/utils/notify'
import { rasterizeIcon } from '@/utils/icon-rasterizer'

interface GroupDetailsDialogProps {
    group: {
        id: string
        name: string
        icon: string | null
        color: string | null
        created_at: string | null
        locations?: { name: string } | null
    } | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onEdit: (group: any) => void
    onDelete: (group: any) => void
}

export function GroupDetailsDialog({
    group,
    open,
    onOpenChange,
    onEdit,
    onDelete
}: GroupDetailsDialogProps) {
    const t = useTranslations('Groups')
    const [isGeneratingLabel, setIsGeneratingLabel] = useState(false)

    if (!group) return null

    // Resolve icon component
    const IconComponent = group.icon && group.icon in LucideIcons
        // @ts-ignore
        ? LucideIcons[group.icon]
        : Folder

    const locationName = group.locations?.name || t('locations.unassigned')
    const formattedDate = group.created_at
        ? format(new Date(group.created_at), 'd MMMM yyyy, HH:mm', { locale: pl })
        : '-'

    const handlePrintLabel = async () => {
        const generatePromise = (async () => {
            // Use the rasterizeIcon utility
            const iconPng = await rasterizeIcon(group.icon || 'Folder', group.color || '#000000')

            const response = await fetch('/api/generate-labels', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    groups: [{
                        id: group.id,
                        name: group.name,
                        locationName: group.locations?.name,
                        iconImage: iconPng // Use iconImage as expected by the API
                    }]
                })
            })

            if (!response.ok) throw new Error('Label generation failed')

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `label_${group.name.replace(/[^a-z0-9]/gi, '_')}.pdf`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            window.URL.revokeObjectURL(url)
        })()

        setIsGeneratingLabel(true)
        notify.promise(generatePromise, {
            loading: t('labels.generating'),
            success: t('labels.success'),
            error: t('labels.error')
        }, 'pdf').finally(() => setIsGeneratingLabel(false))
    }

    return (
        <Modal
            isOpen={open}
            onClose={() => onOpenChange(false)}
            className="group-details-modal !p-0 gap-0 overflow-hidden sm:max-w-[500px] border-neutral-800 bg-neutral-900/95 backdrop-blur-xl shadow-2xl"
        >
            {/* Header with Color Strip */}
            <div className="relative h-32 w-full overflow-hidden">
                <div
                    className="absolute inset-0 opacity-20"
                    style={{ backgroundColor: group.color || '#3b82f6' }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 to-transparent" />

                <div className="absolute bottom-4 left-6 flex items-end gap-4 z-10 w-full pr-6">
                    <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transform transition-transform duration-300 hover:scale-105 shrink-0"
                        style={{
                            backgroundColor: group.color || '#3b82f6',
                            boxShadow: `0 8px 32px -4px ${group.color}40`
                        }}
                    >
                        <IconComponent className="w-8 h-8 text-white" />
                    </div>
                    <div className="mb-1 min-w-0 flex-1">
                        <h2 className="text-2xl font-bold text-white tracking-tight leading-none truncate pr-2">
                            {group.name}
                        </h2>
                        <div className="flex items-center gap-2 mt-2 text-sm font-medium text-neutral-400">
                            <MapPin className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                            <span className="truncate">{locationName}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* Metadata Grid */}
                <div className="grid grid-cols-1 gap-4">
                    <div className="p-3 rounded-xl bg-neutral-800/50 border border-neutral-800 space-y-1 hover:bg-neutral-800 transition-colors">
                        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                            <Calendar className="w-3.5 h-3.5" />
                            {t('details.created')}
                        </div>
                        <div className="text-sm font-medium text-neutral-300 truncate">
                            {formattedDate}
                        </div>
                    </div>

                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                    <Button
                        variant="secondary"
                        onClick={handlePrintLabel}
                        disabled={isGeneratingLabel}
                        className="bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-200 w-full"
                    >
                        <QrCode className="w-4 h-4 mr-2" />
                        {isGeneratingLabel ? t('labels.generating') : t('labels.print')}
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => {
                            onOpenChange(false)
                            onEdit(group)
                        }}
                        className="bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-200 w-full"
                    >
                        <Edit2 className="w-4 h-4 mr-2" />
                        {t('actions.edit')}
                    </Button>
                </div>

                <div className="pt-4 border-t border-neutral-800">
                    <Button
                        variant="destructive"
                        onClick={() => {
                            onOpenChange(false)
                            onDelete(group)
                        }}
                        className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20"
                    >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {t('actions.delete')}
                    </Button>
                </div>
            </div>
        </Modal>
    )
}
