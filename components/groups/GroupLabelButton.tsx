'use client'

import { useState } from 'react'
import { QrCode, Folder } from 'lucide-react'
import { notify } from '@/utils/notify'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'

import { rasterizeIcon } from '@/utils/icon-rasterizer'

interface GroupLabelButtonProps {
    groupId: string
    groupName: string
    locationName?: string
    icon?: string | null
}



export function GroupLabelButton({ groupId, groupName, locationName, icon }: GroupLabelButtonProps) {
    const [isGenerating, setIsGenerating] = useState(false)
    const t = useTranslations('toast')

    const handleGenerateLabel = async (e: React.MouseEvent) => {
        e.preventDefault() // Prevent navigation if inside a link
        e.stopPropagation() // Prevent bubbling

        setIsGenerating(true)
        const toastId = notify.loading(t('loading.generating'))
        try {
            const response = await fetch('/api/generate-labels', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    groups: [{
                        id: groupId,
                        name: groupName,
                        locationName,
                        iconImage: await rasterizeIcon(icon || 'Folder')
                    }]
                }),
            })

            if (!response.ok) throw new Error('Failed to generate label')

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `label_${groupName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            window.URL.revokeObjectURL(url)

            notify.dismiss(toastId)
            notify.success(t('success.labelGenerated'))
        } catch (error) {
            notify.dismiss(toastId)
            notify.error(t('error.generic'))
        } finally {
            setIsGenerating(false)
        }
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={handleGenerateLabel}
            isLoading={isGenerating}
            className="rounded-full"
            title="Generuj etykietę"
        >
            {!isGenerating && <QrCode className="w-4 h-4" />}
        </Button>
    )
}
