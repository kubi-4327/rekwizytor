'use client'

import { useState, useRef, useEffect } from 'react'
import { Download, FileSpreadsheet, FileText, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Database } from '@/types/supabase'
import * as XLSX from 'xlsx'
import { useTranslations } from 'next-intl'
import { format } from 'date-fns'
import { notify } from '@/utils/notify'

type Item = Database['public']['Tables']['items']['Row']

interface ExportButtonProps {
    items: Item[]
}

export function ExportButton({ items }: ExportButtonProps) {
    const t = useTranslations('ExportButton')
    const tToast = useTranslations('toast')
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
        const toastId = notify.loading(tToast('loading.exporting'))
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
            notify.dismiss(toastId)
            notify.success(tToast('success.exported'))
        } catch (error) {
            notify.dismiss(toastId)
            notify.error(tToast('error.export'))
        } finally {
            setIsExporting(false)
            setIsOpen(false)
        }
    }

    const handleExportPDF = async () => {
        setIsExporting(true)
        const toastId = notify.loading(tToast('loading.exporting'))
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
            notify.dismiss(toastId)
            notify.success(tToast('success.exported'))
        } catch (error) {
            notify.dismiss(toastId)
            notify.error(tToast('error.export'))
        } finally {
            setIsExporting(false)
            setIsOpen(false)
        }
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <Button
                onClick={() => setIsOpen(!isOpen)}
                disabled={isExporting}
                variant="secondary"
                className="sm:min-w-[140px]"
                isLoading={isExporting}
                leftIcon={!isExporting && <Download className="h-4 w-4" />}
                rightIcon={<ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />}
            >
                <span className="hidden sm:inline">{t('export')}</span>
            </Button>

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
