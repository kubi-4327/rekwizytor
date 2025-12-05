'use client'

import * as React from 'react'
import { Command } from 'cmdk'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import {
    Search,
    FileText,
    Box,
    Layers,
    MapPin,
    Loader2,
    StickyNote
} from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce' // Assuming this exists, if not I'll create it or use setTimeout
import { clsx } from 'clsx'

type SearchResult = {
    entity_type: 'performance' | 'item' | 'group' | 'location' | 'note'
    id: string
    name: string
    description: string | null
    url: string
    score: number
}

export function CommandPalette() {
    const [open, setOpen] = React.useState(false)
    const [query, setQuery] = React.useState('')
    const [results, setResults] = React.useState<SearchResult[]>([])
    const [loading, setLoading] = React.useState(false)
    const router = useRouter()
    const supabase = createClient()

    // Toggle with Cmd+K or custom event
    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => !open)
            }
        }

        const openPalette = () => setOpen(true)

        document.addEventListener('keydown', down)
        document.addEventListener('open-command-palette', openPalette)
        return () => {
            document.removeEventListener('keydown', down)
            document.removeEventListener('open-command-palette', openPalette)
        }
    }, [])

    // Search logic
    const search = React.useCallback(async (q: string) => {
        if (!q) {
            setResults([])
            return
        }

        setLoading(true)
        try {
            const { data, error } = await supabase.rpc('search_global', {
                query_text: q,
                match_count: 10
            })

            if (error) {
                console.error('Search error:', error)
                return
            }

            setResults((data as unknown as SearchResult[]) || [])
        } catch (err) {
            console.error('Search exception:', err)
        } finally {
            setLoading(false)
        }
    }, [supabase])

    // Debounce search
    React.useEffect(() => {
        const timer = setTimeout(() => {
            search(query)
        }, 300)
        return () => clearTimeout(timer)
    }, [query, search])

    const handleSelect = (url: string) => {
        setOpen(false)
        router.push(url)
    }

    // Group results
    const grouped = results.reduce((acc, item) => {
        const type = item.entity_type
        if (!acc[type]) acc[type] = []
        acc[type].push(item)
        return acc
    }, {} as Record<string, SearchResult[]>)

    const getIcon = (type: string) => {
        switch (type) {
            case 'performance': return Layers
            case 'item': return Box
            case 'group': return Box // Or a group icon
            case 'location': return MapPin
            case 'note': return StickyNote
            default: return FileText
        }
    }

    const getLabel = (type: string) => {
        switch (type) {
            case 'performance': return 'Productions'
            case 'item': return 'Items'
            case 'group': return 'Groups'
            case 'location': return 'Locations'
            case 'note': return 'Notes'
            default: return 'Other'
        }
    }

    // Helper to extract text from TipTap JSON
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

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
            <div
                className="fixed inset-0 bg-black/80 transition-opacity animate-in fade-in duration-200"
                onClick={() => setOpen(false)}
            />
            <div className="relative w-full max-w-2xl z-50 animate-in zoom-in-95 fade-in duration-200">
                <Command
                    label="Global Search"
                    className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-xl shadow-2xl overflow-hidden"
                    loop
                >
                    <div className="flex items-center border-b border-neutral-800 px-3">
                        <Search className="mr-2 h-5 w-5 shrink-0 text-neutral-500" />
                        <Command.Input
                            value={query}
                            onValueChange={setQuery}
                            placeholder="Search items, productions, notes..."
                            className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-neutral-500 disabled:cursor-not-allowed disabled:opacity-50 text-white"
                        />
                        {loading && <Loader2 className="h-4 w-4 animate-spin text-neutral-500" />}
                    </div>

                    <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2">
                        <Command.Empty className="py-6 text-center text-sm text-neutral-500">
                            {query ? 'No results found.' : 'Type to search...'}
                        </Command.Empty>

                        {Object.entries(grouped).map(([type, items]) => (
                            <Command.Group key={type} heading={getLabel(type)} className="text-neutral-400 px-2 py-1.5 text-xs font-medium">
                                {items.map((item) => {
                                    const Icon = getIcon(item.entity_type)
                                    const description = item.entity_type === 'note'
                                        ? extractTextFromTipTap(item.description)
                                        : item.description

                                    return (
                                        <Command.Item
                                            key={item.id}
                                            value={item.name + ' ' + description} // Searchable text for client-side filtering if needed, though we rely on server
                                            onSelect={() => handleSelect(item.url)}
                                            // Add onClick as fallback for mouse interaction
                                            onClick={() => handleSelect(item.url)}
                                            // cmdk v1 uses data-selected, not aria-selected
                                            className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none data-[selected=true]:bg-neutral-800 data-[selected=true]:text-white data-[disabled]:pointer-events-none data-[disabled]:opacity-50 transition-colors"
                                        >
                                            <Icon className="mr-2 h-4 w-4 text-neutral-500" />
                                            <div className="flex flex-col overflow-hidden">
                                                <span className="truncate text-white">{item.name}</span>
                                                {description && (
                                                    <span className="truncate text-xs text-neutral-500">{description}</span>
                                                )}
                                            </div>
                                        </Command.Item>
                                    )
                                })}
                            </Command.Group>
                        ))}
                    </Command.List>

                    <div className="border-t border-neutral-800 px-4 py-2 text-xs text-neutral-500 flex justify-between">
                        <span>
                            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-neutral-700 bg-neutral-800 px-1.5 font-mono text-[10px] font-medium text-neutral-400 opacity-100">
                                <span className="text-xs">Esc</span>
                            </kbd> to close
                        </span>
                        <span>
                            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-neutral-700 bg-neutral-800 px-1.5 font-mono text-[10px] font-medium text-neutral-400 opacity-100">
                                <span className="text-xs">↵</span>
                            </kbd> to select
                        </span>
                    </div>
                </Command>
            </div>
        </div>
    )
}
