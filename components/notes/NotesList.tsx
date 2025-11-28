'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Plus, FileText, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'

export default function NotesList({ performanceId }: { performanceId?: string }) {
    const [notes, setNotes] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        fetchNotes()
    }, [performanceId])

    const fetchNotes = async () => {
        setLoading(true)
        let query = supabase
            .from('notes')
            .select('*, performances(title)')
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
        let title = `Note # ${notes.length + 1}`

        if (performanceId) {
            const { data: perf } = await supabase.from('performances').select('title').eq('id', performanceId).single()
            if (perf) {
                title = `${perf.title} # ${notes.length + 1}`
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

    // Group notes
    const groupedNotes = notes.reduce((acc: any, note: any) => {
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

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Notes</h2>
                <button onClick={createNote} className="flex items-center gap-2 bg-zinc-900 text-white px-4 py-2 rounded-md hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900">
                    <Plus size={16} />
                    New Note
                </button>
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
                                    {group.notes.map((note: any) => (
                                        <div key={note.id} className="border border-zinc-200 dark:border-zinc-800 p-4 rounded-lg flex justify-between items-start hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors bg-white dark:bg-zinc-950">
                                            <Link href={`/notes/${note.id}`} className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <FileText size={18} className="text-zinc-400" />
                                                    <h3 className="font-semibold">{note.title}</h3>
                                                </div>
                                                <p className="text-sm text-zinc-500 mt-1">
                                                    {format(new Date(note.created_at), 'MMM d, yyyy HH:mm')}
                                                </p>
                                            </Link>
                                            <button onClick={() => deleteNote(note.id)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
