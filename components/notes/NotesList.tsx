'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Plus, FileText, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { SearchInput } from '@/components/ui/SearchInput'
import { extractTextFromContent } from './utils'
import { useTranslations } from 'next-intl'

export default function NotesList({ performanceId }: { performanceId?: string }) {
    const t = useTranslations('NotesList')
    const [notes, setNotes] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
    const [searchQuery, setSearchQuery] = useState('')
    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        fetchNotes()
    }, [performanceId])

    const fetchNotes = async () => {
        setLoading(true)
        let query = supabase
            .from('notes')
            .select('*, performances(title, color)')
            .order('updated_at', { ascending: false })

        if (performanceId) {
            query = query.eq('performance_id', performanceId)
        }

        const { data } = await query
        if (data) {
            setNotes(data)
            // Initialize all groups as expanded
            const groups: Record<string, boolean> = { 'general': true }
            data.forEach((note: any) => {
                if (note.performance_id) {
                    groups[note.performance_id] = true
                }
            })
            setExpandedGroups(groups)
        }
        setLoading(false)
    }

    const createNote = async () => {
        // Fetch performance title if needed for default title
        let title = `Note #${notes.length + 1}`

        if (performanceId) {
            const { data: perf } = await supabase.from('performances').select('title').eq('id', performanceId).single()
            if (perf) {
                title = `${perf.title} #${notes.length + 1}`
            }
        }

        const { data, error } = await supabase.from('notes').insert({
            title,
            performance_id: performanceId || null,
            content: {},
        }).select().single()

        if (data) {
            router.push(`/notes/${data.id}`)
        }
    }

    const deleteNote = async (id: string) => {
        if (!confirm(t('deleteConfirm'))) return
        await supabase.from('notes').delete().eq('id', id)
        setNotes(notes.filter(n => n.id !== id))
    }

    const toggleGroup = (groupId: string) => {
        setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }))
    }

    // Filter notes
    const filteredNotes = notes.filter(note => {
        if (!searchQuery) return true
        const text = extractTextFromContent(note.content).toLowerCase()
        const title = note.title.toLowerCase()
        const query = searchQuery.toLowerCase()
        return title.includes(query) || text.includes(query)
    })

    // Group notes
    const groupedNotes = filteredNotes.reduce((acc: any, note: any) => {
        const key = note.performance_id || 'general'
        if (!acc[key]) {
            acc[key] = {
                id: key,
                title: note.performances?.title || t('generalNotes'),
                notes: []
            }
        }
        acc[key].notes.push(note)
        return acc
    }, {})

    // Sort groups: General first, then others
    const sortedGroups = Object.values(groupedNotes).sort((a: any, b: any) => {
        if (a.id === 'general') return -1
        if (b.id === 'general') return 1
        return a.title.localeCompare(b.title)
    })

    // Sort notes within groups
    sortedGroups.forEach((group: any) => {
        group.notes.sort((a: any, b: any) => {
            if (a.is_master && !b.is_master) return -1
            if (!a.is_master && b.is_master) return 1
            return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        })
    })

    return (
        <div className="space-y-4 overflow-x-hidden max-w-full">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-xl font-bold text-white">{t('title')}</h1>
                    <p className="text-neutral-400 text-xs sm:text-sm mt-1">{t('subtitle')}</p>
                </div>
                <button
                    onClick={createNote}
                    className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-md hover:bg-neutral-200 transition-colors font-medium text-sm sm:min-w-[140px] border border-transparent justify-center"
                >
                    <Plus size={16} />
                    <span className="hidden sm:inline">{t('newNote')}</span>
                </button>
            </div>

            {/* Search Section */}
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-2 sm:p-4 max-w-full overflow-hidden">
                <SearchInput
                    placeholder={t('searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-neutral-900 border-neutral-700 w-full"
                />
            </div>

            {loading ? (
                <div className="text-center py-10 text-zinc-500">{t('loading')}</div>
            ) : notes.length === 0 ? (
                <div className="text-center py-10 text-zinc-500">{t('noNotes')}</div>
            ) : (
                <div className="space-y-6">
                    {sortedGroups.map((group: any) => (
                        <div key={group.id} className="space-y-3">
                            <button
                                onClick={() => toggleGroup(group.id)}
                                className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider hover:text-zinc-800 dark:hover:text-zinc-300 transition-colors w-full text-left py-2"
                            >
                                {expandedGroups[group.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                {group.title}
                                <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-full text-zinc-500 ml-1">
                                    {group.notes.length}
                                </span>
                            </button>

                            {expandedGroups[group.id] && (
                                <div className="grid gap-2">
                                    {group.notes.map((note: any) => {
                                        const perfColor = note.performances?.color
                                        const isMaster = note.is_master

                                        return (
                                            <div
                                                key={note.id}
                                                className={`group relative bg-neutral-900/30 border border-transparent hover:border-neutral-800 rounded-xl p-4 transition-all hover:bg-neutral-900/50 flex justify-between items-start w-full max-w-full overflow-hidden`}
                                                style={isMaster ? {
                                                    borderLeft: `3px solid ${perfColor || '#d97706'}`, // Amber-600 default
                                                    backgroundColor: isMaster ? 'rgba(255, 255, 255, 0.02)' : undefined
                                                } : undefined}
                                            >
                                                <Link href={`/notes/${note.id}`} className="flex-1 min-w-0 w-full block">
                                                    <div className="flex items-center gap-2 mb-1.5 w-full min-w-0">
                                                        {isMaster && (
                                                            <FileText
                                                                size={16}
                                                                className="text-amber-500/80 flex-shrink-0"
                                                                style={perfColor ? { color: perfColor } : undefined}
                                                            />
                                                        )}
                                                        <h3 className={`font-medium text-base truncate flex-1 min-w-0 ${isMaster ? 'text-white' : 'text-neutral-200 group-hover:text-white transition-colors'}`}>
                                                            {note.title}
                                                        </h3>
                                                        {isMaster && (
                                                            <span
                                                                className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 ml-2 flex-shrink-0"
                                                                style={perfColor ? {
                                                                    backgroundColor: `${perfColor}15`,
                                                                    color: perfColor,
                                                                } : undefined}
                                                            >
                                                                {t('master')}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-neutral-400 line-clamp-2 leading-relaxed break-words w-full">
                                                        {extractTextFromContent(note.content) || <span className="italic opacity-30">{t('noContent')}</span>}
                                                    </p>
                                                    <p className="text-xs text-neutral-600 mt-3 font-medium">
                                                        {format(new Date(note.created_at), 'MMM d, yyyy • HH:mm')}
                                                    </p>
                                                </Link>
                                                <button onClick={() => deleteNote(note.id)} className="text-neutral-600 hover:text-red-400 p-2 rounded-lg hover:bg-red-900/10 transition-colors opacity-0 group-hover:opacity-100 absolute top-3 right-3 z-10">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
