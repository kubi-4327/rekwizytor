'use client'

import { useState } from 'react'
import { QrCode, Loader2 } from 'lucide-react'

interface PerformanceLabelButtonProps {
    performanceId: string
    performanceTitle: string
    premiereDate?: string | null
}

export function PerformanceLabelButton({ performanceId, performanceTitle, premiereDate }: PerformanceLabelButtonProps) {
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
                        premiereDate: premiereDate ? new Date(premiereDate).toLocaleDateString('pl-PL') : undefined
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

    return (
        <button
            onClick={handleGenerateLabel}
            disabled={isGenerating}
            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-full transition-colors"
            title="Generuj etykietę"
        >
            {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
                <QrCode className="w-4 h-4" />
            )}
        </button>
    )
}
