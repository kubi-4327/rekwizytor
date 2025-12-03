'use client'

import { useState } from 'react'
import { Download, Loader2, FileText } from 'lucide-react'
import { Database } from '@/types/supabase'
import { useTranslations } from 'next-intl'
import { format } from 'date-fns'

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
            const response = await fetch('/api/generate-performance-pdf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ production, items, user }),
            })

            if (!response.ok) throw new Error('Failed to generate PDF')

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            const safeTitle = production.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()
            a.download = `${safeTitle}_export_${format(new Date(), 'yyyy-MM-dd')}.pdf`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            window.URL.revokeObjectURL(url)
        } catch (error) {
            console.error("Export failed", error)
            alert("Failed to generate PDF. Please try again.")
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
