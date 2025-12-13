'use client'

import { useState } from 'react'
import { Download, FileSpreadsheet, FileText } from 'lucide-react'
import { Database } from '@/types/supabase'
import * as XLSX from 'xlsx'
import { useTranslations } from 'next-intl'
import { format } from 'date-fns'
import { notify } from '@/utils/notify'
import { DropdownAction } from '@/components/ui/DropdownAction'

type Item = Pick<Database['public']['Tables']['items']['Row'],
    'name' | 'notes' | 'performance_status' | 'created_at'>

interface ExportButtonProps {
    items: Item[]
}

export function ExportButton({ items }: ExportButtonProps) {
    const t = useTranslations('ExportButton')
    const tToast = useTranslations('toast')
    const [isExporting, setIsExporting] = useState(false)

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
        }
    }

    return (
        <DropdownAction
            label={t('export')}
            variant="secondary"
            isLoading={isExporting}
            icon={<Download className="h-4 w-4" />}
            className="sm:min-w-[140px]"
            items={[
                {
                    label: t('toExcel'),
                    icon: <FileSpreadsheet className="h-4 w-4 text-green-500" />,
                    onClick: handleExportExcel
                },
                {
                    label: t('toPdf'),
                    icon: <FileText className="h-4 w-4 text-red-500" />,
                    onClick: handleExportPDF
                }
            ]}
        />
    )
}
