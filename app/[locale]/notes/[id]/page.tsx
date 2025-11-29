'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import NoteEditor from '@/components/notes/NoteEditor'
import { ArrowLeft, Share, Copy, Download } from 'lucide-react'
import Link from 'next/link'
import { extractMentions } from '@/components/notes/utils'

export default function NoteDetailPage() {
    const params = useParams()
    const id = Array.isArray(params.id) ? params.id[0] : params.id
    const [note, setNote] = useState<any>(null)
    const [title, setTitle] = useState('')
    const [saving, setSaving] = useState(false)
    const [performances, setPerformances] = useState<any[]>([])
    const [showExportMenu, setShowExportMenu] = useState(false)
    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        if (id) fetchNote()
        fetchPerformances()
    }, [id])

    if (!id) return <div>Invalid ID</div>

    const fetchNote = async () => {
        const { data } = await supabase.from('notes').select('*').eq('id', id).single()
        if (data) {
            setNote(data)
            setTitle(data.title)
        }
    }

    const fetchPerformances = async () => {
        const { data } = await supabase.from('performances').select('id, title').order('title')
        if (data) setPerformances(data)
    }

    // Debounce save
    const saveNote = useCallback(async (content: any) => {
        setSaving(true)
        await supabase.from('notes').update({ content, updated_at: new Date().toISOString() }).eq('id', id)

        // Update mentions
        const mentions = extractMentions(content)

        // Delete old mentions
        await supabase.from('note_mentions').delete().eq('note_id', id)

        // Insert new mentions
        if (mentions.length > 0) {
            const mentionsToInsert = mentions.map(m => ({
                note_id: id,
                mentioned_id: m.id,
                mention_type: m.type as "item" | "category" | "location" | "user" | "date",
                mention_label: m.label
            }))

            // Filter out invalid mentions (e.g. dates might not have UUIDs, need to handle that)
            // For now, assume IDs are UUIDs or valid strings. 
            // If date, ID is ISO string.
            // But note_mentions.mentioned_id is UUID.
            // So dates will fail if I try to insert them into UUID column.
            // I should change mentioned_id to text or handle dates separately.
            // The schema has mentioned_id as uuid.
            // I should probably skip dates for now in the DB relation, or change schema.
            // Let's filter out dates for the relation table.

            const validMentions = mentionsToInsert.filter(m =>
                m.mention_type !== 'date' &&
                m.mentioned_id &&
                // Simple UUID check
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(m.mentioned_id)
            )

            if (validMentions.length > 0) {
                await supabase.from('note_mentions').insert(validMentions)
            }
        }

        setSaving(false)
    }, [id, supabase])

    const updateTitle = async () => {
        await supabase.from('notes').update({ title }).eq('id', id)
    }

    const exportNoteJson = () => {
        const element = document.createElement("a");
        const file = new Blob([JSON.stringify(note.content, null, 2)], { type: 'application/json' });
        element.href = URL.createObjectURL(file);
        element.download = `${title.replace(/\s+/g, '_')}.json`;
        document.body.appendChild(element);
        element.click();
    }

    const getNoteText = () => {
        let text = ''
        if (note.content && note.content.content) {
            text = note.content.content.map((block: any) => {
                if (block.content) {
                    return block.content.map((span: any) => {
                        if (span.type === 'text') return span.text
                        if (span.type === 'userMention') return `@${span.attrs.label}`
                        if (span.type === 'slashMention') return `${span.attrs.label}`
                        return ''
                    }).join('')
                }
                return ''
            }).join('\n')
        }
        return text
    }

    const exportNoteTxt = () => {
        const text = getNoteText()
        const element = document.createElement("a");
        const file = new Blob([text], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = `${title.replace(/\s+/g, '_')}.txt`;
        document.body.appendChild(element);
        element.click();
        setShowExportMenu(false)
    }

    const exportNoteMd = () => {
        // Simple MD export - for now similar to TXT but we could enhance it to handle bold/italic if we parsed marks
        // Tiptap JSON to MD is complex, but basic text is fine for now.
        const text = getNoteText()
        const element = document.createElement("a");
        const file = new Blob([text], { type: 'text/markdown' });
        element.href = URL.createObjectURL(file);
        element.download = `${title.replace(/\s+/g, '_')}.md`;
        document.body.appendChild(element);
        element.click();
        setShowExportMenu(false)
    }

    const copyToClipboard = () => {
        const text = getNoteText()
        navigator.clipboard.writeText(text)
        setShowExportMenu(false)
        alert('Copied to clipboard! You can now paste into Notion, Evernote, etc.')
    }

    if (!note) return <div className="p-6">Loading...</div>

    return (
        <div className="p-6 w-full">
            <div className="flex items-center gap-4 mb-6">
                <Link href="/notes" className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                    <ArrowLeft size={20} />
                </Link>
                <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={updateTitle}
                    className="text-3xl font-bold bg-transparent border-none focus:outline-none w-full"
                />
                <div className="flex items-center gap-2">
                    <div className="text-sm text-zinc-500 whitespace-nowrap mr-2">
                        {saving ? 'Saving...' : 'Saved'}
                    </div>

                    <select
                        value={note.performance_id || ''}
                        onChange={async (e) => {
                            const val = e.target.value || null
                            setNote({ ...note, performance_id: val })
                            await supabase.from('notes').update({ performance_id: val }).eq('id', id)
                        }}
                        className="bg-transparent border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1 text-sm max-w-[150px]"
                    >
                        <option value="">Private Note</option>
                        {performances.map(p => (
                            <option key={p.id} value={p.id}>{p.title}</option>
                        ))}
                    </select>

                    <div className="relative">
                        <button
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                            title="Export"
                        >
                            <Share size={20} />
                        </button>

                        {showExportMenu && (
                            <div className="absolute right-0 top-full mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl p-2 min-w-[200px] z-50 flex flex-col gap-1">
                                <button onClick={copyToClipboard} className="flex items-center gap-2 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-left text-sm">
                                    <Copy size={16} />
                                    Copy for Apps (Notion, etc)
                                </button>
                                <button onClick={exportNoteMd} className="flex items-center gap-2 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-left text-sm">
                                    <Download size={16} />
                                    Export as Markdown
                                </button>
                                <button onClick={exportNoteTxt} className="flex items-center gap-2 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-left text-sm">
                                    <Download size={16} />
                                    Export as TXT
                                </button>
                                <button onClick={exportNoteJson} className="flex items-center gap-2 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-left text-sm">
                                    <Download size={16} />
                                    Export as JSON
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <NoteEditor
                initialContent={note.content}
                onSave={(content) => saveNote(content)}
            />
        </div>
    )
}
