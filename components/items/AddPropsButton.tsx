'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Sparkles, PenLine, ChevronDown } from 'lucide-react'
import { useTranslations } from 'next-intl'

export function AddPropsButton() {
    const t = useTranslations('AddPropsButton')
    const [isOpen, setIsOpen] = useState(false)
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

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="inline-flex items-center justify-center rounded-md bg-action-primary px-4 py-2 text-sm font-medium text-white hover:bg-action-hover focus:outline-none focus:ring-2 focus:ring-action-primary focus:ring-offset-2 focus:ring-offset-neutral-900 transition-colors sm:min-w-[140px] border border-transparent"
            >
                <Plus className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">{t('addItem')}</span>
                <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-md bg-neutral-900 border border-neutral-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                    <div className="py-1">
                        <Link
                            href="/items/fast-add"
                            className="group flex items-center px-4 py-3 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white"
                            onClick={() => setIsOpen(false)}
                        >
                            <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-ai-bg text-ai-primary group-hover:bg-ai-primary group-hover:text-white transition-colors">
                                <Sparkles className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="font-medium">{t('fastAdd')}</p>
                                <p className="text-xs text-neutral-500 group-hover:text-neutral-400">{t('fastAddDesc')}</p>
                            </div>
                        </Link>
                        <Link
                            href="/items/new"
                            className="group flex items-center px-4 py-3 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white"
                            onClick={() => setIsOpen(false)}
                        >
                            <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-neutral-800 text-neutral-400 group-hover:bg-neutral-700 group-hover:text-white transition-colors">
                                <PenLine className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="font-medium">{t('manualAdd')}</p>
                                <p className="text-xs text-neutral-500 group-hover:text-neutral-400">{t('manualAddDesc')}</p>
                            </div>
                        </Link>
                    </div>
                </div>
            )}
        </div>
    )
}
