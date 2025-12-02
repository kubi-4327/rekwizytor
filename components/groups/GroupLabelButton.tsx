'use client'

import { useState } from 'react'
import { QrCode, Loader2 } from 'lucide-react'
import jsPDF from 'jspdf'
import { loadPdfFonts, loadAppLogo, drawGroupLabel } from '@/utils/pdfUtils'

interface GroupLabelButtonProps {
    groupId: string
    groupName: string
    locationName?: string
}

export function GroupLabelButton({ groupId, groupName, locationName }: GroupLabelButtonProps) {
    const [isGenerating, setIsGenerating] = useState(false)

    const handleGenerateLabel = async (e: React.MouseEvent) => {
        e.preventDefault() // Prevent navigation if inside a link
        e.stopPropagation() // Prevent bubbling

        setIsGenerating(true)
        try {
            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: [100, 50] // 100mm x 50mm label size
            })

            await loadPdfFonts(doc)
            const logoBase64 = await loadAppLogo()

            await drawGroupLabel(
                doc,
                0, // x
                0, // y
                100, // width (full label size for single print)
                50, // height
                {
                    id: groupId,
                    name: groupName,
                    locationName
                },
                logoBase64
            )

            doc.save(`label_${groupName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`)

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
