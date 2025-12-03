'use client'

import { useState, useRef, useEffect } from 'react'
import { Download, FileSpreadsheet, FileText, ChevronDown, Loader2 } from 'lucide-react'
import { Database } from '@/types/supabase'
import * as XLSX from 'xlsx'
import { useTranslations } from 'next-intl'
import { format } from 'date-fns'

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
                [t('generatedOn')]: item.created_at ? format(new Date(item.created_at), 'dd/MM/yyyy') : ''
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
            const response = await fetch('/api/generate-items-pdf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ items }),
            })

            if (!response.ok) throw new Error('Failed to generate PDF')

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `items_list_${format(new Date(), 'yyyy-MM-dd')}.pdf`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            window.URL.revokeObjectURL(url)
        } catch (error) {
            console.error("Export failed", error)
            alert("Failed to generate PDF. Please try again.")
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
