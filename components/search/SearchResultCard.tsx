'use client'

import * as React from 'react'
import Link from 'next/link'
import { clsx } from 'clsx'
import {
    Box,
    Layers,
    MapPin,
    StickyNote,
    FileText,
    Tag,
    ClipboardList,
    Calendar,
    Play,
    Download,
    QrCode,
    ExternalLink,
    List,
    Pencil,
    Share2,
    Sparkles,
    MoreHorizontal
} from 'lucide-react'
import type { SearchResult } from '@/app/actions/unified-search'
import { notify } from '@/utils/notify'
import { rasterizeIcon } from '@/utils/icon-rasterizer'
import { useTranslations } from 'next-intl'

// --- Helper Functions (moved from page.tsx to be self-contained) ---

type QuickAction = {
    id: string
    label: string
    shortLabel: string
    icon: React.ComponentType<{ className?: string }>
    getUrl?: (item: SearchResult) => string
    handler?: (item: SearchResult) => void
    isLive?: boolean
    color?: string
}

export const getEntityConfig = (item: SearchResult | { entity_type: string }) => {
    const type = item.entity_type
    switch (type) {
        case 'performance':
            return {
                icon: Layers,
                label: 'Productions',
                colorClass: 'text-purple-400',
                bgClass: 'bg-purple-400/10',
                borderClass: 'border-purple-400/20',
                hoverBorder: 'group-hover:border-purple-400/50'
            }
        case 'item':
            return {
                icon: Box,
                label: 'Items',
                colorClass: 'text-blue-400',
                bgClass: 'bg-blue-400/10',
                borderClass: 'border-blue-400/20',
                hoverBorder: 'group-hover:border-blue-400/50'
            }
        case 'group':
            return {
                icon: Tag,
                label: 'Groups',
                colorClass: 'text-cyan-400',
                bgClass: 'bg-cyan-400/10',
                borderClass: 'border-cyan-400/20',
                hoverBorder: 'group-hover:border-cyan-400/50'
            }
        case 'location':
            return {
                icon: MapPin,
                label: 'Locations',
                colorClass: 'text-orange-400',
                bgClass: 'bg-orange-400/10',
                borderClass: 'border-orange-400/20',
                hoverBorder: 'group-hover:border-orange-400/50'
            }
        case 'note':
            return {
                icon: StickyNote,
                label: 'Notes',
                colorClass: 'text-emerald-400',
                bgClass: 'bg-emerald-400/10',
                borderClass: 'border-emerald-400/20',
                hoverBorder: 'group-hover:border-emerald-400/50'
            }
        default:
            return {
                icon: FileText,
                label: 'Other',
                colorClass: 'text-neutral-400',
                bgClass: 'bg-neutral-800',
                borderClass: 'border-neutral-700',
                hoverBorder: 'group-hover:border-neutral-500'
            }
    }
}

const getEntityActions = (item: SearchResult, t: any): QuickAction[] => {
    switch (item.entity_type) {
        case 'performance':
            return [
                {
                    id: 'props',
                    label: 'Manage Props',
                    shortLabel: 'Manage',
                    icon: ClipboardList,
                    getUrl: (i) => `/performances/${i.id}/props`
                },
                {
                    id: 'schedule',
                    label: 'Schedule',
                    shortLabel: 'Schedule',
                    icon: Calendar,
                    getUrl: (i) => `/performances/${i.id}/schedule`
                },
                {
                    id: 'live',
                    label: 'Live View',
                    shortLabel: 'Live',
                    icon: Play,
                    getUrl: (i) => `/performances/${i.id}/live`,
                    isLive: true
                },
                {
                    id: 'export-pdf',
                    label: 'Export PDF',
                    shortLabel: 'PDF',
                    icon: Download,
                    handler: async (i) => {
                        const toastId = notify.loading(t('loading.exporting'))
                        try {
                            const response = await fetch('/api/generate-performance-pdf', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ performanceId: i.id })
                            })
                            if (!response.ok) throw new Error('Export failed')
                            const blob = await response.blob()
                            const url = window.URL.createObjectURL(blob)
                            const a = document.createElement('a')
                            a.href = url
                            a.download = `${i.name.replace(/[^a-z0-9]/gi, '_')}.pdf`
                            a.click()
                            notify.dismiss(toastId)
                            notify.success(t('success.exported'))
                        } catch (e) {
                            notify.dismiss(toastId)
                            notify.error(t('error.export'))
                        }
                    }
                },
                {
                    id: 'labels',
                    label: 'Print Labels',
                    shortLabel: 'Labels',
                    icon: QrCode,
                    handler: async (i) => {
                        const toastId = notify.loading(t('loading.generating'))
                        try {
                            const response = await fetch('/api/generate-performance-labels', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    performances: [{ id: i.id, title: i.name }]
                                })
                            })
                            if (!response.ok) throw new Error('Label generation failed')
                            const blob = await response.blob()
                            const url = window.URL.createObjectURL(blob)
                            const a = document.createElement('a')
                            a.href = url
                            a.download = `label_${i.name.replace(/[^a-z0-9]/gi, '_')}.pdf`
                            a.click()
                            notify.dismiss(toastId)
                            notify.success(t('success.labelGenerated'))
                        } catch (e) {
                            notify.dismiss(toastId)
                            notify.error(t('error.generic'))
                        }
                    }
                }
            ]
        case 'item':
            return [
                {
                    id: 'view',
                    label: 'View Details',
                    shortLabel: 'View',
                    icon: ExternalLink,
                    getUrl: (i) => `/items?view=${i.id}`
                },
                {
                    id: 'group',
                    label: 'See Category',
                    shortLabel: 'Category',
                    icon: Tag,
                    getUrl: (i) => `/items?groupId=${i.metadata?.group_id || ''}`
                }
            ]
        case 'group':
            return [
                {
                    id: 'view-details',
                    label: 'View Details',
                    shortLabel: 'Details',
                    icon: List,
                    getUrl: (i) => `/groups?viewGroup=${i.id}`
                },
                {
                    id: 'labels',
                    label: 'Print Labels',
                    shortLabel: 'Labels',
                    icon: QrCode,
                    handler: async (i) => {
                        const toastId = notify.loading(t('loading.generating'))
                        try {
                            const response = await fetch('/api/generate-labels', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    groups: [{
                                        id: i.id,
                                        name: i.name,
                                        locationName: i.metadata?.location_name,
                                        iconImage: await rasterizeIcon(i.metadata?.icon || 'Folder', i.metadata?.color || '#000000')
                                    }]
                                })
                            })
                            if (!response.ok) throw new Error('Label generation failed')
                            const blob = await response.blob()
                            const url = window.URL.createObjectURL(blob)
                            const a = document.createElement('a')
                            a.href = url
                            a.download = `labels_${i.name.replace(/[^a-z0-9]/gi, '_')}.pdf`
                            a.click()
                            notify.dismiss(toastId)
                            notify.success(t('success.labelGenerated'))
                        } catch (e) {
                            notify.dismiss(toastId)
                            notify.error(t('error.generic'))
                        }
                    },
                },
                {
                    id: 'edit',
                    label: 'Edit Group',
                    shortLabel: 'Edit',
                    icon: Pencil,
                    getUrl: (i) => `/groups?editGroup=${i.id}`
                }
            ]
        case 'location':
            return [
                {
                    id: 'view-items',
                    label: 'View Items Here',
                    shortLabel: 'Items',
                    icon: List,
                    getUrl: (i) => `/items?locationId=${i.id}`
                },
                {
                    id: 'edit',
                    label: 'Edit Location',
                    shortLabel: 'Edit',
                    icon: Pencil,
                    getUrl: (i) => `/items/structure?edit=${i.id}`
                }
            ]
        case 'note':
            return [
                {
                    id: 'read',
                    label: 'Read Note',
                    shortLabel: 'Read',
                    icon: ExternalLink,
                    getUrl: (i) => `/notes/${i.id}`
                },
                {
                    id: 'edit',
                    label: 'Edit Note',
                    shortLabel: 'Edit',
                    icon: Pencil,
                    getUrl: (i) => `/notes/${i.id}?edit=true`
                },
                {
                    id: 'share',
                    label: 'Share Link',
                    shortLabel: 'Share',
                    icon: Share2,
                    handler: (i) => {
                        const url = `${window.location.origin}/notes/${i.id}`
                        navigator.clipboard.writeText(url)
                    }
                }
            ]
        default:
            return []
    }
}

const extractTextFromTipTap = (json: any): string => {
    if (!json) return ''
    if (typeof json === 'string') {
        try {
            const parsed = JSON.parse(json)
            return extractTextFromTipTap(parsed)
        } catch {
            return json
        }
    }
    if (Array.isArray(json)) {
        return json.map(extractTextFromTipTap).join(' ')
    }
    if (json.type === 'text' && json.text) {
        return json.text
    }
    if (json.content) {
        return extractTextFromTipTap(json.content)
    }
    return ''
}

// --- Main Component ---

interface SearchResultCardProps {
    item: SearchResult & { explanation?: string } // Add explanation type
    aiMode?: boolean
}

export function SearchResultCard({ item, aiMode }: SearchResultCardProps) {
    const [actionsVisible, setActionsVisible] = React.useState(false) // Toggle state for mobile
    const t = useTranslations('toast')

    const itemConfig = getEntityConfig(item)
    const ItemIcon = itemConfig.icon

    // Prefer explanation in description if available
    const descriptionText = item.explanation || item.description

    const description = item.entity_type === 'note' && !item.explanation
        ? extractTextFromTipTap(item.description)
        : descriptionText

    // Fix URL for items and groups
    let itemUrl = ''
    if (item.entity_type === 'item') {
        itemUrl = `/items?view=${item.id}`
    } else if (item.entity_type === 'group') {
        itemUrl = `/groups?viewGroup=${item.id}`
    } else {
        itemUrl = item.url || '#' // Fallback to avoid crash
    }
    const itemColor = item.entity_type === 'performance' && item.metadata?.color
        ? item.metadata.color
        : undefined

    const actions = getEntityActions(item, t)

    return (
        <div
            className="relative group h-[180px]"
            onMouseLeave={() => setActionsVisible(false)} // Reset on mouse leave for desktop consistency
        >
            {/* Main Entity Card */}
            <Link
                href={itemUrl}
                className={`block w-full h-full relative overflow-hidden rounded-xl border ${itemConfig.borderClass} ${itemConfig.bgClass} backdrop-blur-sm p-5 transition-all duration-300 group-hover:scale-[1.02] flex flex-col justify-between`}
                style={{
                    ...(item.image_url ? {
                        backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.5), rgba(0,0,0,0.9)), url(${item.image_url})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    } : {}),
                    // Use inset box-shadow for color strip
                    boxShadow: itemColor ? `inset 0 -4px 0 ${itemColor}` : 'none'
                }}
            >
                {/* Header: Icon & Status (Left Side) */}
                <div className="flex items-start gap-2 mb-2 relative z-10 w-full pr-8">
                    <div className={`rounded-lg p-2 bg-black/40 backdrop-blur-md ${itemConfig.colorClass} shrink-0`}>
                        <ItemIcon className="h-5 w-5" />
                    </div>

                    <div className="flex flex-wrap items-center gap-1 mt-0.5">
                        {/* Match type badge */}
                        {item.match_type && item.match_type !== 'fts' && (
                            <span className={clsx(
                                "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border",
                                item.match_type === 'vector'
                                    ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                                    : "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
                            )}>
                                {item.match_type === 'vector' ? 'Semantic' : 'Fuzzy'}
                            </span>
                        )}
                        {item.explanation && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border bg-burgundy-main/20 text-burgundy-light border-burgundy-main/30">
                                AI MATCH
                            </span>
                        )}
                        {item.metadata?.status && (
                            <span className="px-2 py-1 rounded-md bg-black/40 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider text-white border border-white/10">
                                {item.metadata.status}
                            </span>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="relative z-10 pr-8">
                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-white/90 transition-colors truncate leading-tight">
                        {item.name}
                    </h3>

                    {description && (
                        <p className={clsx(
                            "text-sm font-medium line-clamp-2 leading-relaxed",
                            item.explanation ? "text-purple-200/90" : "text-neutral-300/80"
                        )}>
                            {description}
                        </p>
                    )}

                    {/* Performance Specifics: Next Show */}
                    {item.entity_type === 'performance' && item.metadata?.next_show && (
                        <div className="mt-3 flex items-center gap-2 text-xs font-mono text-green-400 bg-green-900/20 px-2 py-1 rounded w-fit">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                            Next: {new Date(item.metadata.next_show).toLocaleDateString()}
                        </div>
                    )}

                    {/* Group Specifics: Location */}
                    {item.entity_type === 'group' && (
                        <div className="mt-3 flex items-center gap-2 text-xs font-mono text-orange-400 bg-orange-900/20 px-2 py-1 rounded w-fit">
                            <MapPin className="w-3 h-3" />
                            {item.metadata?.location_name || <span className="opacity-50 italic">No location</span>}
                        </div>
                    )}
                </div>
            </Link>

            {/* Mobile Actions Toggle Button */}
            {actions.length > 0 && (
                <button
                    onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setActionsVisible(!actionsVisible)
                    }}
                    className={clsx(
                        "absolute top-3 right-3 p-2 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 text-white z-30 md:hidden",
                        actionsVisible && "bg-white text-black border-white"
                    )}
                >
                    <MoreHorizontal className="h-4 w-4" />
                </button>
            )}

            {/* Quick Actions Overlay */}
            {actions.length > 0 && (
                <div className={clsx(
                    "absolute top-3 right-3 flex flex-col gap-1.5 transition-all duration-200 z-20",
                    // Desktop: Hover behavior
                    "md:opacity-0 md:group-hover:opacity-100 md:translate-x-2 md:group-hover:translate-x-0",
                    // Mobile: Toggle behavior
                    actionsVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2 pointer-events-none md:pointer-events-auto"
                )}>
                    {/* Spacer for the toggle button on mobile */}
                    <div className="h-10 w-10 md:hidden" />

                    {actions.slice(0, 3).map((action) => {
                        const ActionIcon = action.icon
                        const commonClasses = "p-2 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-neutral-300 hover:text-white hover:bg-black/80 hover:border-white/30 transition-all shadow-lg active:scale-95"

                        if (action.getUrl) {
                            return (
                                <Link
                                    key={action.id}
                                    href={action.getUrl(item)}
                                    title={action.label}
                                    className={commonClasses}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <ActionIcon className="h-4 w-4" />
                                </Link>
                            )
                        }
                        return (
                            <button
                                key={action.id}
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    action.handler?.(item)
                                }}
                                title={action.label}
                                className={commonClasses}
                            >
                                <ActionIcon className="h-4 w-4" />
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
