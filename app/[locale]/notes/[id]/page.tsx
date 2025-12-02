'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import NoteEditor, { NoteEditorRef } from '@/components/notes/NoteEditor'
import { ArrowLeft, Share, Copy, Download, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { extractMentions } from '@/components/notes/utils'
import { useTranslations } from 'next-intl'

export default function NoteDetailPage() {
    const t = useTranslations('NoteDetail')
    const params = useParams()
    const id = Array.isArray(params.id) ? params.id[0] : params.id
    const [note, setNote] = useState<any>(null)
    const [title, setTitle] = useState('')
    const [saving, setSaving] = useState(false)
    const [performances, setPerformances] = useState<any[]>([])
    const [showExportMenu, setShowExportMenu] = useState(false)
    const supabase = createClient()
    const router = useRouter()
    const editorRef = useRef<NoteEditorRef>(null)

    if (!id) return <div>{t('invalidId')}</div>

    const fetchNote = async () => {
        const { data: serverData } = await supabase.from('notes').select('*').eq('id', id).single()
        if (!serverData) return

        // Always use server version as source of truth
        // Check localStorage only if server is empty (new note)
        const content = serverData.content as any
        const isServerEmpty = !content ||
            !content.content ||
            content.content.length === 0 ||
            (content.content.length === 1 && !content.content[0].content)

        if (isServerEmpty) {
            const key = `rekwizytor_note_draft_${id}`
            const savedDraft = localStorage.getItem(key)
            if (savedDraft) {
                try {
                    const { content: localContent } = JSON.parse(savedDraft)
                    console.log('Server empty, using localStorage backup')
                    setNote({ ...serverData, content: localContent })
                    setTitle(serverData.title)
                    return
                } catch (e) {
                    console.error('Failed to parse local draft', e)
                }
            }
        }

        // Use server data
        setNote(serverData)
        setTitle(serverData.title)
    }

    useEffect(() => {
        if (id) fetchNote()
        fetchPerformances()

        // Save on browser close/tab close
        const handleBeforeUnload = () => {
            if (editorRef.current) {
                const content = editorRef.current.getJSON()
                // Synchronous save on unload - use localStorage as backup
                // Server save will happen via onBlur which triggers before this
                const key = `rekwizytor_note_draft_${id}`
                localStorage.setItem(key, JSON.stringify({
                    content,
                    timestamp: new Date().toISOString()
                }))
            }
        }

        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [id])

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

        // Update local state to reflect saved content, preventing "revert" logic in editor
        setNote((prev: any) => ({ ...prev, content, updated_at: new Date().toISOString() }))

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
        alert(t('copied'))
    }

    if (!note) return <div className="p-6">{t('loading')}</div>

    return (
        <div className="p-6 w-full">
            <div className="max-w-3xl mx-auto mb-8">
                <div className="flex items-center gap-4 mb-4">
                    <button
                        onClick={async () => {
                            // Force save before navigation
                            if (editorRef.current) {
                                const content = editorRef.current.getJSON()
                                await saveNote(content)
                            }
                            router.push('/notes')
                        }}
                        className="p-2 -ml-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-full transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>

                    <div className="flex-1"></div>

                    <div className="flex items-center gap-2">
                        <div className="relative group">
                            <select
                                value={note.performance_id || ''}
                                onChange={async (e) => {
                                    const val = e.target.value || null
                                    setNote({ ...note, performance_id: val })
                                    await supabase.from('notes').update({ performance_id: val }).eq('id', id)
                                }}
                                className="appearance-none bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-full px-4 py-1.5 text-xs font-medium text-neutral-400 hover:text-white transition-colors cursor-pointer pr-8 focus:outline-none focus:ring-2 focus:ring-neutral-700"
                            >
                                <option value="">{t('privateNote')}</option>
                                {performances.map(p => (
                                    <option key={p.id} value={p.id}>{p.title}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-500 pointer-events-none" />
                        </div>

                        <div className="relative">
                            <button
                                onClick={() => setShowExportMenu(!showExportMenu)}
                                className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-full transition-colors"
                                title="Export"
                            >
                                <Share size={18} />
                            </button>

                            {showExportMenu && (
                                <div className="absolute right-0 top-full mt-2 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl p-1.5 min-w-[220px] z-50 flex flex-col gap-0.5">
                                    <button onClick={copyToClipboard} className="flex items-center gap-3 p-2.5 hover:bg-neutral-800 rounded-lg text-left text-sm text-neutral-300 hover:text-white transition-colors">
                                        <Copy size={16} />
                                        {t('copyContent')}
                                    </button>
                                    <div className="h-px bg-neutral-800 my-1 mx-2" />
                                    <button onClick={exportNoteMd} className="flex items-center gap-3 p-2.5 hover:bg-neutral-800 rounded-lg text-left text-sm text-neutral-300 hover:text-white transition-colors">
                                        <Download size={16} />
                                        {t('exportMarkdown')}
                                    </button>
                                    <button onClick={exportNoteTxt} className="flex items-center gap-3 p-2.5 hover:bg-neutral-800 rounded-lg text-left text-sm text-neutral-300 hover:text-white transition-colors">
                                        <Download size={16} />
                                        {t('exportTxt')}
                                    </button>
                                    <button onClick={exportNoteJson} className="flex items-center gap-3 p-2.5 hover:bg-neutral-800 rounded-lg text-left text-sm text-neutral-300 hover:text-white transition-colors">
                                        <Download size={16} />
                                        {t('exportJson')}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={updateTitle}
                    placeholder={t('untitledNote')}
                    className="text-4xl font-bold bg-transparent border-none focus:outline-none w-full placeholder:text-neutral-700 text-white"
                />
            </div>

            <NoteEditor
                ref={editorRef}
                initialContent={note.content}
                noteId={note.id}
                serverUpdatedAt={note.updated_at}
                onSave={saveNote}
            />
        </div>
    )
}
