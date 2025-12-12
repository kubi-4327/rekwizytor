'use client'

import { useState, useRef, useEffect } from 'react'
import { Settings } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { PerformanceLabelButton } from './PerformanceLabelButton'
import { ExportPerformanceButton } from './ExportPerformanceButton'
import { Database } from '@/types/supabase'

type Performance = Database['public']['Tables']['performances']['Row']
type Scene = Database['public']['Tables']['scenes']['Row']
type Note = Database['public']['Tables']['notes']['Row']
type PerformanceItem = Database['public']['Tables']['performance_items']['Row'] & {
    items: {
        name: string
        image_url: string | null
    } | null
}

type Props = {
    performanceId: string
    title: string
    premiereDate: string | null
    production: Performance
    assignedProps: PerformanceItem[]
    scenes: Scene[]
    notes: Note[]
    user: {
        full_name: string | null
        email: string | undefined
    } | null
}

export function PerformanceDetailActions({
    performanceId,
    title,
    premiereDate,
    production,
    assignedProps,
    scenes,
    notes,
    user
}: Props) {
    const t = useTranslations('ProductionDetails')
    const [isOpen, setIsOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [])

    return (
        <div className="relative" ref={menuRef}>
            <Button
                variant="outline"
                leftIcon={<Settings className="w-4 h-4" />}
                className="bg-neutral-900 border-neutral-700 hover:bg-neutral-800 hover:text-white"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="hidden sm:inline">{t('actions')}</span>
                <span className="sm:hidden">{t('actions')}</span>
            </Button>

            {isOpen && (
                <div className="absolute right-0 top-full pt-2 w-56 z-50">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl overflow-hidden ring-1 ring-white/5">
                        <Link
                            href={`/performances/${performanceId}/edit`}
                            className="block px-4 py-2.5 text-sm text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
                            onClick={() => setIsOpen(false)}
                        >
                            {t('editDetails')}
                        </Link>
                        <Link
                            href={`/performances/${performanceId}/scenes`}
                            className="block px-4 py-2.5 text-sm text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors border-t border-neutral-800"
                            onClick={() => setIsOpen(false)}
                        >
                            {t('manageScenes')}
                        </Link>
                        <div className="border-t border-neutral-800">
                            <PerformanceLabelButton
                                performanceId={performanceId}
                                performanceTitle={title}
                                premiereDate={premiereDate}
                                variant="menu"
                            />
                            <ExportPerformanceButton
                                production={production}
                                items={assignedProps || []}
                                scenes={scenes || []}
                                notes={notes || []}
                                user={user}
                                variant="menu"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
