'use client'

import { useState, useMemo } from 'react'
import { X, Search, Check } from 'lucide-react'
import NextImage from 'next/image'
import { ItemIcon } from '@/components/ui/ItemIcon'
import { useTranslations } from 'next-intl'

type Item = {
    id: string
    name: string
    image_url: string | null
    notes: string | null
    performance_status: string | null
}

type Props = {
    isOpen: boolean
    onClose: () => void
    onConfirm: (selectedIds: string[]) => void
    items: Item[]
    accentColor?: string | null
}

export function ItemSelectionDialog({ isOpen, onClose, onConfirm, items, accentColor }: Props) {
    const t = useTranslations('ItemSelectionDialog')
    const [search, setSearch] = useState('')
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

    const filteredItems = useMemo(() => {
        if (!search) return items
        const lowerSearch = search.toLowerCase()
        return items.filter(item =>
            item.name.toLowerCase().includes(lowerSearch) ||
            (item.notes && item.notes.toLowerCase().includes(lowerSearch))
        )
    }, [items, search])

    if (!isOpen) return null

    const toggleSelection = (id: string) => {
        const newSelected = new Set(selectedIds)
        if (newSelected.has(id)) {
            newSelected.delete(id)
        } else {
            newSelected.add(id)
        }
        setSelectedIds(newSelected)
    }

    const handleConfirm = () => {
        onConfirm(Array.from(selectedIds))
        onClose()
        setSelectedIds(new Set())
        setSearch('')
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="p-4 border-b border-neutral-800 flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-white mb-2">{t('selectProps')}</h2>
                        <p className="text-sm text-neutral-400">{t('selectPropsSubtitle')}</p>
                    </div>
                    <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-neutral-800 shrink-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t('searchPlaceholder')}
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-neutral-600 transition-colors"
                            autoFocus
                        />
                    </div>
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto p-4 min-h-0">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {filteredItems.map(item => {
                            const isSelected = selectedIds.has(item.id)
                            return (
                                <div
                                    key={item.id}
                                    onClick={() => toggleSelection(item.id)}
                                    className={`
                                        group relative cursor-pointer rounded-lg border overflow-hidden transition-all duration-200
                                        ${isSelected
                                            ? 'border-white/50 ring-2 ring-white/20 bg-neutral-800'
                                            : 'border-neutral-800 bg-neutral-900 hover:border-neutral-600'
                                        }
                                    `}
                                >
                                    {/* Selection Indicator */}
                                    <div className={`
                                        absolute top-2 right-2 z-10 w-6 h-6 rounded-full border flex items-center justify-center transition-colors
                                        ${isSelected
                                            ? 'bg-white border-white text-black'
                                            : 'bg-black/50 border-white/30 text-transparent group-hover:border-white/70'
                                        }
                                    `}>
                                        <Check className="w-3.5 h-3.5" strokeWidth={3} />
                                    </div>

                                    {/* Image */}
                                    <div className="aspect-square relative bg-neutral-950">
                                        {item.image_url ? (
                                            <NextImage
                                                src={item.image_url}
                                                alt={item.name}
                                                fill
                                                className={`object-cover transition-opacity ${isSelected ? 'opacity-80' : 'group-hover:opacity-90'}`}
                                                sizes="(max-width: 768px) 50vw, 25vw"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-neutral-700">
                                                <ItemIcon name={item.name} className="w-12 h-12" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="p-3">
                                        <h3 className="font-medium text-sm text-white truncate" title={item.name}>
                                            {item.name}
                                        </h3>
                                        {item.notes && (
                                            <p className="text-xs text-neutral-500 mt-1 line-clamp-2">
                                                {item.notes}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {filteredItems.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-neutral-500 py-12">
                            <Search className="w-8 h-8 mb-2 opacity-50" />
                            <p>{t('noResults')}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-neutral-800 shrink-0 flex justify-between items-center bg-neutral-900">
                    <div className="text-sm text-neutral-400">
                        {t('selectedCount', { count: selectedIds.size })}
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors"
                        >
                            {t('cancel')}
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={selectedIds.size === 0}
                            className="px-6 py-2 text-sm font-medium text-black bg-white rounded-md hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            style={accentColor && selectedIds.size > 0 ? { backgroundColor: accentColor, color: 'white' } : {}}
                        >
                            {t('addSelected', { count: selectedIds.size })}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
