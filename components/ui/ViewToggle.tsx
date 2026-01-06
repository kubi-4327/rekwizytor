'use client'

import { LayoutGrid, List as ListIcon } from 'lucide-react'
import { clsx } from 'clsx'
import { useTranslations } from 'next-intl'

interface ViewToggleProps {
    viewMode: 'list' | 'grid'
    onViewModeChange: (mode: 'list' | 'grid') => void
}

export function ViewToggle({ viewMode, onViewModeChange }: ViewToggleProps) {
    // Optional: Add translations for aria-labels or tooltips if needed
    // const t = useTranslations('Common') 

    return (
        <div className="flex bg-white/5 border border-white/5 rounded-xl p-1">
            <button
                onClick={() => onViewModeChange('list')}
                className={clsx(
                    "p-2 rounded-lg transition-all",
                    viewMode === 'list'
                        ? 'bg-white/10 text-white shadow-sm'
                        : 'text-neutral-500 hover:text-neutral-300'
                )}
                aria-label="List view"
            >
                <ListIcon className="w-4 h-4" />
            </button>
            <button
                onClick={() => onViewModeChange('grid')}
                className={clsx(
                    "p-2 rounded-lg transition-all",
                    viewMode === 'grid'
                        ? 'bg-white/10 text-white shadow-sm'
                        : 'text-neutral-500 hover:text-neutral-300'
                )}
                aria-label="Grid view"
            >
                <LayoutGrid className="w-4 h-4" />
            </button>
        </div>
    )
}
