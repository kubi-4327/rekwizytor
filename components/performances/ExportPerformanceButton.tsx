'use client'

import { useState } from 'react'
import { Download, Loader2, FileText } from 'lucide-react'
import { Database } from '@/types/supabase'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useTranslations } from 'next-intl'
import { loadPdfFonts, loadAppLogo } from '@/utils/pdfUtils'

type Performance = Database['public']['Tables']['performances']['Row']
type PerformanceItem = Database['public']['Tables']['performance_items']['Row'] & {
    items: {
        name: string
        image_url: string | null
    } | null
}
type User = {
    full_name: string | null
    email: string | undefined
}

interface ExportPerformanceButtonProps {
    production: Performance
    items: PerformanceItem[]
    user: User | null
    variant?: 'default' | 'menu'
}

export function ExportPerformanceButton({ production, items, user, variant = 'default' }: ExportPerformanceButtonProps) {
    const t = useTranslations('ExportButton') // Reusing existing translations or we might need new ones
    const [isExporting, setIsExporting] = useState(false)

    const handleExportPDF = async () => {
        setIsExporting(true)
        try {
            const doc = new jsPDF()

            // Load fonts and logo using utility
            await loadPdfFonts(doc)
            const logoBase64 = await loadAppLogo()

            // Load Poster Image
            let posterBase64: string | null = null
            if (production.image_url) {
                try {
                    const response = await fetch(production.image_url)
                    const blob = await response.blob()
                    const reader = new FileReader()
                    await new Promise((resolve) => {
                        reader.onloadend = () => {
                            posterBase64 = reader.result as string
                            resolve(null)
                        }
                        reader.readAsDataURL(blob)
                    })
                } catch (e) {
                    console.error("Failed to load poster", e)
                }
            }
            let yPos = 15
            const margin = 14
            const pageWidth = doc.internal.pageSize.getWidth()

            // 1. Header Info (Top Right)
            doc.setFontSize(8)
            doc.setTextColor(100)
            const dateStr = new Date().toLocaleString('pl-PL')
            const userStr = user?.full_name || user?.email || 'Unknown User'

            doc.text(`${t('generatedOn')}: ${dateStr}`, pageWidth - margin, yPos, { align: 'right' })
            yPos += 4
            doc.text(`${t('generatedBy')}: ${userStr}`, pageWidth - margin, yPos, { align: 'right' })

            // Add Logo if available
            // Add Logo if available
            if (logoBase64) {
                const imgProps = doc.getImageProperties(logoBase64)
                const pdfWidth = 40
                const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width
                doc.addImage(logoBase64, 'PNG', margin, 10, pdfWidth, pdfHeight)

                // Move Y down based on logo height
                yPos = Math.max(yPos, 10 + pdfHeight + 15)
            } else {
                yPos = 30
            }

            // 2. Poster & Title
            if (posterBase64) {
                // Add image (approx 40mm width)
                const imgWidth = 40
                const imgHeight = 60 // Aspect ratio might vary, but fixed box for now
                doc.addImage(posterBase64, 'JPEG', margin, yPos, imgWidth, imgHeight)

                // Title next to poster
                doc.setFontSize(24)
                doc.setTextColor(0)
                // Wrap title if too long
                const maxTitleWidth = pageWidth - (margin * 2) - imgWidth - 10
                const splitTitle = doc.splitTextToSize(production.title, maxTitleWidth)
                doc.text(splitTitle, margin + imgWidth + 10, yPos + 10)

                // Status
                doc.setFontSize(12)
                doc.setTextColor(100)
                // Adjust Y based on title lines
                const titleHeight = splitTitle.length * 10
                doc.text(`Status: ${production.status}`, margin + imgWidth + 10, yPos + 10 + titleHeight)

                // Move Y below poster
                yPos += imgHeight + 15
            } else {
                // No poster, just title
                doc.setFontSize(24)
                doc.setTextColor(0)
                doc.text(production.title, margin, yPos + 10)
                yPos += 25
            }

            // 3. Master Note
            if (production.notes) {
                doc.setFontSize(14)
                doc.setTextColor(0)
                doc.text('Master Note', margin, yPos)
                yPos += 7

                doc.setFontSize(11)
                doc.setTextColor(60)
                const splitNotes = doc.splitTextToSize(production.notes, pageWidth - (margin * 2))
                doc.text(splitNotes, margin, yPos)
                yPos += (splitNotes.length * 5) + 10
            }

            // 4. Props Checklist
            doc.setFontSize(14)
            doc.setTextColor(0)
            doc.text('Lista Rekwizytów', margin, yPos)
            yPos += 5

            const tableData = items.map(item => [
                item.items?.name || 'Unknown Item',
                item.scene_number ? `Scena ${item.scene_number}` : 'Unassigned',
                '' // Checkbox column
            ])

            autoTable(doc, {
                startY: yPos,
                head: [['Nazwa', 'Scena', 'Sprawdzone']],
                body: tableData,
                theme: 'grid',
                headStyles: { fillColor: [40, 40, 40] },
                styles: { font: 'Roboto', fontSize: 10 },
                columnStyles: {
                    0: { cellWidth: 'auto' },
                    1: { cellWidth: 30 },
                    2: { cellWidth: 25 }
                },
                didParseCell: (data) => {
                    // Empty content for checkbox column to ensure it's clean
                    if (data.section === 'body' && data.column.index === 2) {
                        data.cell.text = ['[   ]']
                    }
                }
            })

            // Save
            const safeTitle = production.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()
            doc.save(`${safeTitle}_export_${new Date().toISOString().split('T')[0]}.pdf`)

        } catch (error) {
            console.error("Export failed", error)
            alert("Export failed. Please try again.")
        } finally {
            setIsExporting(false)
        }
    }

    if (variant === 'menu') {
        return (
            <button
                onClick={handleExportPDF}
                disabled={isExporting}
                className="w-full text-left px-4 py-2.5 text-sm text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isExporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <FileText className="w-4 h-4" />
                )}
                {isExporting ? 'Generowanie...' : 'Eksportuj PDF'}
            </button>
        )
    }

    return (
        <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="px-4 py-2 text-sm font-medium text-neutral-400 hover:text-white border border-neutral-800 rounded-md hover:bg-neutral-900 transition-colors text-center flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
                <FileText className="w-4 h-4" />
            )}
            {isExporting ? 'Generowanie...' : 'Eksportuj PDF'}
        </button>
    )
}
