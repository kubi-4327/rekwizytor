'use client'

import { useState, useRef, useEffect } from 'react'
import { Download, FileSpreadsheet, FileText, ChevronDown, Loader2 } from 'lucide-react'
import { Database } from '@/types/supabase'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useTranslations } from 'next-intl'
import { loadPdfFonts, loadAppLogo } from '@/utils/pdfUtils'

type Item = Database['public']['Tables']['items']['Row']

interface ExportButtonProps {
    items: Item[]
}

export function ExportButton({ items }: ExportButtonProps) {
    const t = useTranslations('ExportButton')
    const [isOpen, setIsOpen] = useState(false)
    const [isExporting, setIsExporting] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [])

    const handleExportExcel = () => {
        setIsExporting(true)
        try {
            const data = items.map(item => ({
                [t('columns.name')]: item.name,
                [t('columns.notes')]: item.notes || '',
                [t('columns.status')]: item.performance_status || 'Unassigned',
                [t('generatedOn')]: item.created_at ? new Date(item.created_at).toLocaleDateString() : ''
            }))

            const ws = XLSX.utils.json_to_sheet(data)
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, "Items")
            XLSX.writeFile(wb, "props_inventory.xlsx")
        } catch (error) {
            console.error("Export failed", error)
        } finally {
            setIsExporting(false)
            setIsOpen(false)
        }
    }

    const handleExportPDF = async () => {
        setIsExporting(true)
        try {
            const doc = new jsPDF()

            // Load fonts and logo using utility
            await loadPdfFonts(doc)
            const logoBase64 = await loadAppLogo()

            doc.setFontSize(18)

            let yPos = 20

            if (logoBase64) {
                const imgProps = doc.getImageProperties(logoBase64)
                const pdfWidth = 40
                const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width
                doc.addImage(logoBase64, 'PNG', 14, 10, pdfWidth, pdfHeight)
                yPos = 10 + pdfHeight + 10
                doc.text(t('pdfTitle'), 14, yPos)
            } else {
                doc.text(t('pdfTitle'), 14, yPos)
            }

            yPos += 10
            doc.setFontSize(11)
            doc.text(`${t('generatedOn')} ${new Date().toLocaleDateString()}`, 14, yPos)

            const tableData = items.map(item => [
                item.name,
                item.notes || '',
                item.performance_status || 'Unassigned',
                '' // Empty check column as requested
            ])

            autoTable(doc, {
                head: [[t('columns.name'), t('columns.notes'), t('columns.status'), t('columns.check')]],
                body: tableData,
                startY: yPos + 5,
                styles: {
                    fontSize: 10,
                    font: 'Roboto', // Use the custom font
                    overflow: 'linebreak',
                    cellPadding: 3
                },
                columnStyles: {
                    0: { cellWidth: 50 },
                    1: { cellWidth: 'auto' }, // Allow notes to take remaining space
                    2: { cellWidth: 30 },
                    3: { cellWidth: 15 }
                },
                headStyles: {
                    fillColor: [23, 23, 23], // neutral-900
                    textColor: 255
                },
                didDrawPage: () => {
                    // Footer
                    const pageSize = doc.internal.pageSize
                    const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight()
                    const pageWidth = pageSize.width ? pageSize.width : pageSize.getWidth()

                    doc.setFontSize(10)
                    doc.setTextColor(150)

                    // Watermark / Logo text
                    doc.text('Rekwizytorium', 14, pageHeight - 10)

                    // Page number
                    const pageStr = `${t('page')} ${doc.getNumberOfPages()}`
                    doc.text(pageStr, pageWidth - 25, pageHeight - 10)
                }
            })

            doc.save("props_checklist.pdf")
        } catch (error) {
            console.error("Export failed", error)
        } finally {
            setIsExporting(false)
            setIsOpen(false)
        }
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={isExporting}
                className="inline-flex items-center justify-center rounded-md border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500 disabled:opacity-50 sm:min-w-[140px]"
            >
                {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                <span className="hidden sm:inline">{t('export')}</span>
                <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 origin-top-right rounded-md bg-neutral-900 border border-neutral-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                    <div className="py-1">
                        <button
                            onClick={handleExportExcel}
                            className="group flex w-full items-center px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white"
                        >
                            <FileSpreadsheet className="mr-3 h-4 w-4 text-green-500" />
                            {t('toExcel')}
                        </button>
                        <button
                            onClick={handleExportPDF}
                            className="group flex w-full items-center px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white"
                        >
                            <FileText className="mr-3 h-4 w-4 text-red-500" />
                            {t('toPdf')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
