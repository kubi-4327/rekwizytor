'use client'

import { Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

type Props = {
    context: 'item' | 'performance' | 'group' | 'location' | 'note'
    placeholder?: string
    className?: string
}

export function ContextSearchTrigger({ context, placeholder, className = '' }: Props) {
    const router = useRouter()
    const t = useTranslations('Navigation')

    const contextLabel = {
        item: t('items'),
        performance: t('productions'),
        group: t('groups'),
        location: t('locations'),
        note: t('notes')
    }[context]

    const handleClick = () => {
        // Navigate to search page with the context pre-selected
        router.push(`/search?type=${context}`)
    }

    return (
        <div
            onClick={handleClick}
            className={`cursor-pointer relative group ${className}`}
        >
            <div className="flex items-center w-full h-10 px-3 rounded-md border border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700 hover:text-neutral-300 transition-colors overflow-hidden">
                <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center mr-2 opacity-50">
                    <Search className="h-4 w-4" />
                </div>
                <span className="text-sm leading-none truncate select-none transform translate-y-[1px]">
                    {placeholder || t('searchPlaceholder')}
                </span>
                <div className="ml-auto hidden sm:flex gap-1 flex-shrink-0">
                    <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-neutral-800 bg-neutral-900 px-1.5 font-mono text-[10px] font-medium text-neutral-400 opacity-100">
                        <span className="text-xs">⌘</span>K
                    </kbd>
                </div>
            </div>

            {/* Visual cue that this opens global search */}
            <div className="absolute inset-x-0 -bottom-8 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none text-center">
                <span className="text-[10px] text-neutral-500 bg-black/80 px-2 py-1 rounded backdrop-blur-sm border border-neutral-800">
                    {t('openGlobalSearchWithContext', { context: contextLabel })}
                </span>
            </div>
        </div>
    )
}
