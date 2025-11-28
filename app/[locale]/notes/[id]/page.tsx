'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import NoteEditor from '@/components/notes/NoteEditor'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { extractMentions } from '@/components/notes/utils'

export default function NoteDetailPage() {
    const params = useParams()
    const id = Array.isArray(params.id) ? params.id[0] : params.id
    const [note, setNote] = useState<any>(null)
    const [title, setTitle] = useState('')
    const [saving, setSaving] = useState(false)
    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        if (id) fetchNote()
    }, [id])

    if (!id) return <div>Invalid ID</div>

    const fetchNote = async () => {
        const { data } = await supabase.from('notes').select('*').eq('id', id).single()
        if (data) {
            setNote(data)
            setTitle(data.title)
        }
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

    const exportNoteTxt = () => {
        // Simple extraction of text from Tiptap JSON
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

        const element = document.createElement("a");
        const file = new Blob([text], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = `${title.replace(/\s+/g, '_')}.txt`;
        document.body.appendChild(element);
        element.click();
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
                    <div className="text-sm text-zinc-500 whitespace-nowrap">
                        {saving ? 'Saving...' : 'Saved'}
                    </div>
                    <button onClick={exportNoteJson} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors" title="Export JSON">
                        <span className="text-xs font-bold">JSON</span>
                    </button>
                    <button onClick={exportNoteTxt} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors" title="Export TXT">
                        <span className="text-xs font-bold">TXT</span>
                    </button>
                </div>
            </div>

            <NoteEditor
                initialContent={note.content}
                onSave={(content) => saveNote(content)}
            />
        </div>
    )
}
