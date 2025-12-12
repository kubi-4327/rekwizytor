'use client'

import { useState } from 'react'
import { QrCode, Ticket } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { rasterizeIcon } from '@/utils/icon-rasterizer'

interface PerformanceLabelButtonProps {
    performanceId: string
    performanceTitle: string
    premiereDate?: string | null
}

export function PerformanceLabelButton({ performanceId, performanceTitle, premiereDate, variant = 'icon' }: PerformanceLabelButtonProps & { variant?: 'icon' | 'menu' }) {
    const [isGenerating, setIsGenerating] = useState(false)



    const handleGenerateLabel = async (e: React.MouseEvent) => {
        e.preventDefault() // Prevent navigation if inside a link
        e.stopPropagation() // Prevent bubbling

        setIsGenerating(true)
        try {
            const response = await fetch('/api/generate-performance-labels', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    performances: [{
                        id: performanceId,
                        title: performanceTitle,
                        premiereDate: premiereDate ? new Date(premiereDate).toLocaleDateString('pl-PL') : undefined,
                        iconImage: await rasterizeIcon('Ticket')
                    }]
                }),
            })

            if (!response.ok) throw new Error('Failed to generate label')

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `label_${performanceTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            window.URL.revokeObjectURL(url)

        } catch (error) {
            console.error("Label generation failed", error)
            alert("Failed to generate label")
        } finally {
            setIsGenerating(false)
        }
    }

    if (variant === 'menu') {
        return (
            <Button
                onClick={handleGenerateLabel}
                disabled={isGenerating}
                variant="ghost"
                className="w-full justify-start px-4 py-2.5 text-neutral-300 hover:text-white hover:bg-neutral-800 border-t border-neutral-800 rounded-none h-auto"
                isLoading={isGenerating}
                leftIcon={!isGenerating && <QrCode className="w-4 h-4" />}
            >
                Generuj etykietę
            </Button>
        )
    }

    return (
        <Button
            onClick={handleGenerateLabel}
            disabled={isGenerating}
            variant="ghost"
            size="icon"
            className="rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800"
            isLoading={isGenerating}
            title="Generuj etykietę"
        >
            {!isGenerating && <QrCode className="w-4 h-4" />}
        </Button>
    )
}
