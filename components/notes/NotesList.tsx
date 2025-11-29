'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Plus, FileText, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { SearchInput } from '@/components/ui/SearchInput'
import { extractTextFromContent } from './utils'

export default function NotesList({ performanceId }: { performanceId?: string }) {
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
        if (!confirm('Are you sure you want to delete this note?')) return
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
                title: note.performances?.title || 'General Notes',
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
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-xl font-bold text-white">Notes</h1>
                    <p className="text-neutral-400 text-sm mt-1">Manage your personal and performance-related notes</p>
                </div>
                <button
                    onClick={createNote}
                    className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-md hover:bg-neutral-200 transition-colors font-medium text-sm"
                >
                    <Plus size={16} />
                    New Note
                </button>
            </div>

            {/* Search Section */}
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4">
                <SearchInput
                    placeholder="Search notes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-neutral-900 border-neutral-700"
                />
            </div>

            {loading ? (
                <div className="text-center py-10 text-zinc-500">Loading notes...</div>
            ) : notes.length === 0 ? (
                <div className="text-center py-10 text-zinc-500">No notes yet.</div>
            ) : (
                <div className="space-y-6">
                    {sortedGroups.map((group: any) => (
                        <div key={group.id} className="space-y-2">
                            <button
                                onClick={() => toggleGroup(group.id)}
                                className="flex items-center gap-2 text-sm font-semibold text-zinc-500 uppercase tracking-wider hover:text-zinc-800 dark:hover:text-zinc-300 transition-colors w-full text-left"
                            >
                                {expandedGroups[group.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                {group.title}
                                <span className="text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-500">
                                    {group.notes.length}
                                </span>
                            </button>

                            {expandedGroups[group.id] && (
                                <div className="grid gap-3 pl-2">
                                    {group.notes.map((note: any) => {
                                        const perfColor = note.performances?.color
                                        const isMaster = note.is_master

                                        return (
                                            <div
                                                key={note.id}
                                                className={`group relative bg-neutral-900/50 border rounded-lg p-4 transition-all hover:border-neutral-700 flex justify-between items-start ${isMaster && !perfColor ? 'border-amber-900/50 bg-amber-900/10' : 'border-neutral-800'}`}
                                                style={isMaster && perfColor ? {
                                                    borderColor: perfColor,
                                                    backgroundColor: `${perfColor}10` // 10% opacity
                                                } : undefined}
                                            >
                                                <Link href={`/notes/${note.id}`} className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <FileText
                                                            size={16}
                                                            className={isMaster && !perfColor ? "text-amber-500" : "text-neutral-500 group-hover:text-neutral-300 transition-colors"}
                                                            style={isMaster && perfColor ? { color: perfColor } : undefined}
                                                        />
                                                        <h3 className="font-medium text-white truncate">{note.title}</h3>
                                                        {isMaster && (
                                                            <span
                                                                className={`text-xs px-1.5 py-0.5 rounded border ${!perfColor ? 'bg-amber-900/30 text-amber-400 border-amber-900/50' : ''}`}
                                                                style={perfColor ? {
                                                                    backgroundColor: `${perfColor}30`,
                                                                    color: perfColor,
                                                                    borderColor: `${perfColor}50`
                                                                } : undefined}
                                                            >
                                                                Master
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-neutral-400 line-clamp-2 pl-6">
                                                        {extractTextFromContent(note.content) || <span className="italic opacity-50">No content</span>}
                                                    </p>
                                                    <p className="text-xs text-neutral-500 mt-2 pl-6">
                                                        {format(new Date(note.created_at), 'MMM d, yyyy HH:mm')}
                                                    </p>
                                                </Link>
                                                <button onClick={() => deleteNote(note.id)} className="text-neutral-500 hover:text-red-400 hover:bg-red-900/20 p-2 rounded transition-colors opacity-0 group-hover:opacity-100">
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
