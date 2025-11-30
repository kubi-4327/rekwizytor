'use client'

import { useState } from 'react'
import { Calendar, Filter, LayoutGrid, List as ListIcon, Layers } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { Database } from '@/types/supabase'
import { SearchInput } from '@/components/ui/SearchInput'
import { FilterSelect } from '@/components/ui/FilterSelect'
import { useTranslations } from 'next-intl'
import { format } from 'date-fns'

type Performance = Database['public']['Tables']['performances']['Row']

type Props = {
    performances: Performance[]
}

const PerformanceListItem = ({ show }: { show: Performance }) => {
    const t = useTranslations('PerformancesList')
    const tStatus = useTranslations('PerformancesList.statuses')
    const [isHovered, setIsHovered] = useState(false)

    return (
        <Link
            href={`/performances/${show.id}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="group flex items-center gap-4 bg-neutral-900/50 border border-neutral-800 rounded-lg p-4 transition-all"
            style={{
                borderLeftColor: show.color || undefined,
                borderLeftWidth: show.color ? '4px' : '1px',
                borderColor: isHovered && show.color ? show.color : undefined
            }}
        >
            {/* Thumbnail */}
            <div className="relative h-16 w-16 flex-shrink-0 rounded-md overflow-hidden bg-neutral-800">
                {show.thumbnail_url ? (
                    <Image
                        src={show.thumbnail_url}
                        alt={show.title}
                        fill
                        className="object-cover"
                        unoptimized
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-600">
                        <Layers className="w-6 h-6" />
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <h3
                    className="text-lg font-medium text-white truncate transition-colors"
                    style={{ color: isHovered && show.color ? show.color : undefined }}
                >
                    {show.title}
                </h3>
                <div className="flex items-center gap-3 text-sm text-neutral-400 mt-1">
                    <span>{show.premiere_date ? format(new Date(show.premiere_date), 'MM/dd/yyyy') : t('tbd')}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs border ${show.status === 'active' ? 'bg-emerald-900/20 text-emerald-400 border-emerald-900/50' :
                        show.status === 'upcoming' ? 'bg-yellow-900/20 text-yellow-400 border-yellow-900/50' :
                            'bg-neutral-800 text-neutral-400 border-neutral-700'
                        }`}>
                        {tStatus(show.status as Database['public']['Enums']['performance_status_enum'])}
                    </span>
                </div>
            </div>
        </Link>
    )
}

const PerformanceGridItem = ({ show }: { show: Performance }) => {
    const t = useTranslations('PerformancesList')
    const tStatus = useTranslations('PerformancesList.statuses')
    const [isHovered, setIsHovered] = useState(false)

    return (
        <Link
            href={`/performances/${show.id}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="group relative bg-neutral-900/50 border border-neutral-800 rounded-xl overflow-hidden transition-all flex flex-col"
            style={{
                borderColor: isHovered && show.color ? show.color : undefined
            }}
        >
            {/* Poster Area */}
            <div className="relative aspect-[2/3] w-full bg-neutral-800">
                {show.image_url ? (
                    <Image
                        src={show.image_url}
                        alt={show.title}
                        fill
                        className="object-cover"
                        unoptimized
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-700">
                        <Layers className="w-12 h-12" />
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3
                        className="text-lg font-bold text-white leading-tight transition-colors"
                        style={{ color: isHovered && show.color ? show.color : undefined }}
                    >
                        {show.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs border backdrop-blur-sm ${show.status === 'active' ? 'bg-emerald-900/40 text-emerald-300 border-emerald-500/30' :
                            show.status === 'upcoming' ? 'bg-yellow-900/40 text-yellow-300 border-yellow-500/30' :
                                'bg-neutral-800/80 text-neutral-400 border-neutral-700'
                            }`}>
                            {tStatus(show.status as Database['public']['Enums']['performance_status_enum'])}
                        </span>
                        <span className="text-xs text-neutral-300">
                            {show.premiere_date ? format(new Date(show.premiere_date), 'MM/dd/yyyy') : t('tbd')}
                        </span>
                    </div>
                </div>
            </div>

            {/* Color Strip */}
            {show.color && (
                <div className="h-1 w-full" style={{ backgroundColor: show.color }} />
            )}
        </Link>
    )
}

export function PerformancesList({ performances }: Props) {
    const t = useTranslations('PerformancesList')
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'upcoming' | 'archived'>('all')
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

    const filteredPerformances = performances.filter(p => {
        const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesStatus = statusFilter === 'all' || p.status === statusFilter
        return matchesSearch && matchesStatus
    })

    return (
        <div className="space-y-6">
            {/* Controls */}
            <div className="bg-neutral-900/50 p-4 rounded-lg border border-neutral-800 space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <SearchInput
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t('searchPlaceholder')}
                        />
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                    <FilterSelect
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'upcoming' | 'archived')}
                        icon={<Filter className="w-4 h-4 text-neutral-500" />}
                    >
                        <option value="all">{t('allStatus')}</option>
                        <option value="active">{t('statuses.active')}</option>
                        <option value="upcoming">{t('statuses.upcoming')}</option>
                        <option value="archived">{t('statuses.archived')}</option>
                    </FilterSelect>

                    <div className="flex bg-neutral-900 border border-neutral-800 rounded-lg p-1 ml-auto">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'}`}
                        >
                            <ListIcon className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'}`}
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* List View */}
            {viewMode === 'list' ? (
                <div className="space-y-3">
                    {filteredPerformances.map((show) => (
                        <PerformanceListItem key={show.id} show={show} />
                    ))}
                </div>
            ) : (
                /* Grid View */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredPerformances.map((show) => (
                        <PerformanceGridItem key={show.id} show={show} />
                    ))}
                </div>
            )}

            {filteredPerformances.length === 0 && (
                <div className="text-center py-12 text-neutral-500">
                    <p>{t('noPerformancesFound')}</p>
                </div>
            )}
        </div>
    )
}
