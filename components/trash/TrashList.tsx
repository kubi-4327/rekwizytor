'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { RefreshCw, Trash2, Package, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { pl, enUS } from 'date-fns/locale'
import { useLocale } from 'next-intl'
import NextImage from 'next/image'
import { Box } from 'lucide-react' // ItemIcon removed

import { Database } from '@/types/supabase'

interface TrashListProps {
    // items table removed - only performances supported now
    initialItems: never[]
    initialPerformances: Database['public']['Tables']['performances']['Row'][]
}

export function TrashList({ initialItems, initialPerformances }: TrashListProps) {
    const t = useTranslations('Trash')
    const locale = useLocale()
    const dateLocale = locale === 'pl' ? pl : enUS
    const router = useRouter()
    const supabase = createClient()

    const [activeTab, setActiveTab] = useState<'items' | 'performances'>('items')
    const [items, setItems] = useState(initialItems)
    const [performances, setPerformances] = useState(initialPerformances)
    const [loading, setLoading] = useState<string | null>(null)

    const handleRestore = async (id: string, type: 'items' | 'performances') => {
        setLoading(id)
        const { error } = await supabase
            .from(type)
            .update({ deleted_at: null })
            .eq('id', id)

        if (!error) {
            if (type === 'items') {
                setItems(items.filter(i => i.id !== id))
            } else {
                setPerformances(performances.filter(p => p.id !== id))
            }
            router.refresh()
        }
        setLoading(null)
    }

    const handleDeleteForever = async (id: string, type: 'items' | 'performances') => {
        if (!confirm(t('deleteForeverConfirm'))) return

        setLoading(id)
        const { error } = await supabase
            .from(type)
            .delete()
            .eq('id', id)

        if (!error) {
            if (type === 'items') {
                setItems(items.filter(i => i.id !== id))
            } else {
                setPerformances(performances.filter(p => p.id !== id))
            }
            router.refresh()
        }
        setLoading(null)
    }

    return (
        <div className="space-y-6">
            {/* Tabs */}
            <div className="flex gap-4 border-b border-neutral-800">
                <button
                    onClick={() => setActiveTab('items')}
                    className={`pb-3 px-1 text-sm font-medium transition-colors relative ${activeTab === 'items' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                >
                    {t('items')} ({items.length})
                    {activeTab === 'items' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-white rounded-t-full" />}
                </button>
                <button
                    onClick={() => setActiveTab('performances')}
                    className={`pb-3 px-1 text-sm font-medium transition-colors relative ${activeTab === 'performances' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                >
                    {t('performances')} ({performances.length})
                    {activeTab === 'performances' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-white rounded-t-full" />}
                </button>
            </div>

            {/* Content */}
            <div className="space-y-4">
                {activeTab === 'items' ? (
                    items.length === 0 ? (
                        <div className="text-center py-12 text-neutral-500">
                            <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>{t('noDeletedItems')}</p>
                        </div>
                    ) : (
                        items.map(item => (
                            <div key={item.id} className="flex items-center justify-between p-4 bg-neutral-900 rounded-xl border border-neutral-800">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 relative bg-neutral-800 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                                        {item.image_url ? (
                                            <NextImage
                                                src={item.image_url}
                                                alt={item.name}
                                                fill
                                                className="object-cover opacity-50 grayscale"
                                                sizes="48px"
                                            />
                                        ) : (
                                            <Box className="h-6 w-6 text-neutral-600" />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-neutral-300 line-through decoration-neutral-500">{item.name}</h3>
                                        <p className="text-xs text-neutral-500">
                                            {t('deletedOn', { date: format(new Date(item.deleted_at || new Date()), 'PPP', { locale: dateLocale }) })}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleRestore(item.id, 'items')}
                                        disabled={loading === item.id}
                                        className="p-2 rounded-lg bg-neutral-800 text-neutral-400 hover:bg-green-900/20 hover:text-green-400 transition-colors"
                                        title={t('restore')}
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteForever(item.id, 'items')}
                                        disabled={loading === item.id}
                                        className="p-2 rounded-lg bg-neutral-800 text-neutral-400 hover:bg-red-900/20 hover:text-red-400 transition-colors"
                                        title={t('deleteForever')}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )
                ) : (
                    performances.length === 0 ? (
                        <div className="text-center py-12 text-neutral-500">
                            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>{t('noDeletedPerformances')}</p>
                        </div>
                    ) : (
                        performances.map(perf => (
                            <div key={perf.id} className="flex items-center justify-between p-4 bg-neutral-900 rounded-xl border border-neutral-800">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 relative bg-neutral-800 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                                        {perf.thumbnail_url ? (
                                            <NextImage
                                                src={perf.thumbnail_url}
                                                alt={perf.title}
                                                fill
                                                className="object-cover opacity-50 grayscale"
                                                sizes="48px"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
                                                <span className="text-xs font-bold text-neutral-600">{perf.title[0]}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-neutral-300 line-through decoration-neutral-500">{perf.title}</h3>
                                        <p className="text-xs text-neutral-500">
                                            {t('deletedOn', { date: format(new Date(perf.deleted_at || new Date()), 'PPP', { locale: dateLocale }) })}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleRestore(perf.id, 'performances')}
                                        disabled={loading === perf.id}
                                        className="p-2 rounded-lg bg-neutral-800 text-neutral-400 hover:bg-green-900/20 hover:text-green-400 transition-colors"
                                        title={t('restore')}
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteForever(perf.id, 'performances')}
                                        disabled={loading === perf.id}
                                        className="p-2 rounded-lg bg-neutral-800 text-neutral-400 hover:bg-red-900/20 hover:text-red-400 transition-colors"
                                        title={t('deleteForever')}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )
                )}
            </div>
        </div>
    )
}
