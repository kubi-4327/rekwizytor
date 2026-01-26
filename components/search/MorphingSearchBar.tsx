'use client'

import React, { useRef, useEffect } from 'react'
import { Search, Loader2, X, Command as CommandIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { clsx } from 'clsx'
// import { useRouter } from 'next/navigation' // removed
import { useGlobalSearch } from './GlobalSearchProvider'
import { useTranslations } from 'next-intl'

type Props = {
    mode: 'trigger' | 'input'
    // Trigger props
    context?: 'item' | 'performance' | 'group' | 'location' | 'note'
    placeholder?: string
    className?: string
    // Input props
    query?: string
    onQueryChange?: (val: string) => void
    loading?: boolean
    autoFocus?: boolean
    rightContent?: React.ReactNode
}

export function MorphingSearchBar({
    mode,
    context,
    placeholder,
    className = '',
    query = '',
    onQueryChange,
    loading = false,
    autoFocus = false,
    rightContent
}: Props) {
    const { openSearch } = useGlobalSearch()
    const t = useTranslations('Navigation')
    const inputRef = useRef<HTMLInputElement>(null)

    const contextLabel = context ? {
        item: t('items'),
        performance: t('productions'),
        group: t('groups'),
        location: t('locations'),
        note: t('notes')
    }[context] : ''

    // Focus input when in input mode
    useEffect(() => {
        if (mode === 'input' && autoFocus) {
            // Small timeout to ensure modal animation is started/ready
            setTimeout(() => {
                inputRef.current?.focus()
            }, 50)
        }
    }, [mode, autoFocus])

    const handleTriggerClick = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        openSearch(context)
    }

    // Common container styles
    const containerClasses = clsx(
        "relative w-full z-30 group",
        className
    )

    if (mode === 'trigger') {
        return (
            <motion.div
                className={containerClasses}
                onClick={handleTriggerClick}
            >
                <div className="flex items-center w-full h-10 px-3 rounded-xl border border-white/5 bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-neutral-200 transition-colors overflow-hidden cursor-pointer">
                    <div className="shrink-0 w-5 h-5 flex items-center justify-center mr-2 opacity-50">
                        <Search className="h-4 w-4" />
                    </div>

                    <span className="text-sm leading-none truncate select-none transform translate-y-px font-sans!">
                        {placeholder || t('searchPlaceholder')}
                    </span>

                    <div className="ml-auto hidden sm:flex gap-1 shrink-0">
                        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-white/10 bg-black/20 px-1.5 font-mono text-[10px] font-medium text-neutral-400 opacity-100">
                            <span className="text-xs">⌘</span>K
                        </kbd>
                    </div>
                </div>

                {/* Context tooltip */}
                {context && (
                    <div className="absolute inset-x-0 -bottom-8 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none text-center">
                        <span className="text-[10px] text-neutral-500 bg-black/80 px-2 py-1 rounded backdrop-blur-sm border border-neutral-800">
                            {t('openGlobalSearchWithContext', { context: contextLabel })}
                        </span>
                    </div>
                )}
            </motion.div>
        )
    }

    // INPUT MODE
    return (
        <motion.div
            className={containerClasses}
        >
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-20">
                <div>
                    <Search className="h-4 w-4 transition-colors text-neutral-400 group-focus-within:text-white" />
                </div>
            </div>

            <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => onQueryChange?.(e.target.value)}
                placeholder={placeholder || t('searchPlaceholder')}
                className={clsx(
                    "block w-full rounded-xl border text-base md:text-sm placeholder-neutral-500 transition-all font-medium shadow-lg backdrop-blur-xl relative z-10",
                    "pl-10 pr-10 py-2.5 focus:outline-none focus:ring-1", // focus:outline-none to remove browser default
                    "bg-neutral-900/40 border-white/5 text-white focus:ring-white/10 focus:border-white/10 focus:bg-neutral-900/60 font-sans!"
                )}
                autoFocus={autoFocus}
            />

            {/* Right side actions */}
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-2 z-20">
                {/* Loading State */}
                {loading && (
                    <Loader2 className="h-4 w-4 animate-spin text-neutral-500" />
                )}

                {/* Clear Button */}
                {!loading && query && (
                    <button
                        onClick={() => onQueryChange?.('')}
                        className="text-neutral-500 hover:text-white transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}

                {rightContent}

                {/* Shortcut Hint */}
                <div className="hidden md:flex items-center gap-1 text-xs text-neutral-600 font-mono bg-white/5 px-2 py-1 rounded">
                    <CommandIcon className="h-3 w-3" /> K
                </div>
            </div>

            {/* Standard Focused Glow Effect */}
            <div className="absolute -inset-0.5 bg-linear-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition duration-500 pointer-events-none" />
        </motion.div>
    )
}
