'use client'

import { Database } from '@/types/supabase'
import Image from 'next/image'
import { ItemIcon } from '@/components/ui/ItemIcon'
import { Pencil, MapPin, Layers, Calendar, X } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'

type Item = Database['public']['Tables']['items']['Row']
type Location = Database['public']['Tables']['locations']['Row']
type Group = Database['public']['Tables']['groups']['Row']

type Props = {
    item: Item | null
    isOpen: boolean
    onClose: () => void
    onEdit: (item: Item) => void
    locations: Location[]
    groups: Group[]
}

export function ItemDetailsDialog({ item, isOpen, onClose, onEdit, locations, groups }: Props) {
    const t = useTranslations('ItemDetailsDialog')
    const locale = useLocale()

    if (!isOpen || !item) return null

    const locationName = locations.find(l => l.id === item.location_id)?.name || t('unknownLocation')
    const groupName = groups.find(g => g.id === item.group_id)?.name || t('uncategorized')

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative" onClick={e => e.stopPropagation()}>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Header Image */}
                <div className="relative h-64 w-full bg-neutral-800 flex items-center justify-center">
                    {item.image_url ? (
                        <Image
                            src={item.image_url}
                            alt={item.name}
                            fill
                            className="object-cover"
                        />
                    ) : (
                        <ItemIcon name={item.name} className="h-24 w-24 text-neutral-600" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 to-transparent opacity-80" />

                    <div className="absolute bottom-6 left-6 right-6">
                        <h2 className="text-3xl font-bold text-white drop-shadow-md">{item.name}</h2>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Status & Actions */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${item.performance_status === 'active' ? 'bg-red-900/20 text-red-400 border-red-900/50' :
                                item.performance_status === 'upcoming' ? 'bg-yellow-900/20 text-yellow-400 border-yellow-900/50' :
                                    'bg-neutral-800 text-neutral-400 border-neutral-700'
                                }`}>
                                {item.performance_status ? item.performance_status.replace('_', ' ').toUpperCase() : t('unassigned')}
                            </span>
                        </div>
                        <button
                            onClick={() => onEdit(item)}
                            className="inline-flex items-center justify-center rounded-md bg-action-primary px-4 py-2 text-sm font-medium text-white hover:bg-action-hover transition-colors"
                        >
                            <Pencil className="w-4 h-4 mr-2" />
                            {t('editItem')}
                        </button>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <div className="flex items-center text-neutral-500 text-sm mb-1">
                                <MapPin className="w-4 h-4 mr-2" />
                                {t('location')}
                            </div>
                            <p className="text-neutral-200 font-medium pl-6 text-lg">{locationName}</p>
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center text-neutral-500 text-sm mb-1">
                                <Layers className="w-4 h-4 mr-2" />
                                {t('category')}
                            </div>
                            <p className="text-neutral-200 font-medium pl-6 text-lg">{groupName}</p>
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center text-neutral-500 text-sm mb-1">
                                <Calendar className="w-4 h-4 mr-2" />
                                {t('added')}
                            </div>
                            <p className="text-neutral-200 font-medium pl-6 text-lg">
                                {item.created_at ? new Date(item.created_at).toLocaleDateString(locale) : t('unknown')}
                            </p>
                        </div>
                    </div>

                    {/* Notes */}
                    {item.notes && (
                        <div className="bg-neutral-950/50 rounded-lg p-5 border border-neutral-800 mt-4">
                            <h3 className="text-sm font-medium text-neutral-400 mb-2 uppercase tracking-wider">{t('notes')}</h3>
                            <p className="text-neutral-300 text-base leading-relaxed whitespace-pre-wrap">{item.notes}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
