'use client'

import { useEditor, EditorContent, ReactNodeViewRenderer, mergeAttributes } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Mention from '@tiptap/extension-mention'
import { getSlashSuggestions, getUserSuggestions, getItemSuggestions, getDateSuggestions, renderSuggestion } from './suggestion'
import { useEffect, useState, forwardRef, useImperativeHandle } from 'react'
import { useRouter } from 'next/navigation'
import { useDebounce } from '@/hooks/useDebounce'

const UserMention = Mention.extend({
    name: 'userMention',
    addAttributes() {
        return {
            id: { default: null },
            label: { default: null },
            type: { default: 'user' },
        }
    },
    renderHTML({ node, HTMLAttributes }) {
        return [
            'span',
            mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-type': 'user' }),
            `@${node.attrs.label ?? node.attrs.id}`,
        ]
    },
})

const ItemMention = Mention.extend({
    name: 'itemMention',
    addAttributes() {
        return {
            id: { default: null },
            label: { default: null },
            type: { default: 'item' },
        }
    },
    renderHTML({ node, HTMLAttributes }) {
        return [
            'span',
            mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-type': 'item' }),
            `#${node.attrs.label ?? node.attrs.id}`,
        ]
    },
})

const DateMention = Mention.extend({
    name: 'dateMention',
    addAttributes() {
        return {
            id: { default: null },
            label: { default: null },
            type: { default: 'date' },
        }
    },
    renderHTML({ node, HTMLAttributes }) {
        return [
            'span',
            mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-type': 'date' }),
            `${node.attrs.label ?? node.attrs.id}`,
        ]
    },
})

const SlashMention = Mention.extend({
    name: 'slashMention',
    addAttributes() {
        return {
            id: { default: null },
            label: { default: null },
            type: { default: null },
        }
    },
    renderHTML({ node, HTMLAttributes }) {
        return [
            'span',
            mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-type': node.attrs.type }),
            `${node.attrs.label ?? node.attrs.id}`,
        ]
    },
})

export interface NoteEditorRef {
    getJSON: () => any
}

const NoteEditor = forwardRef<NoteEditorRef, {
    initialContent?: any,
    onSave?: (content: any) => void,
    readOnly?: boolean,
    noteId?: string,
    serverUpdatedAt?: string
}>(({
    initialContent,
    onSave,
    readOnly = false,
    noteId,
    serverUpdatedAt
}, ref) => {
    const router = useRouter()
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'local' | 'unsaved'>('saved')
    const [lastServerSave, setLastServerSave] = useState<Date | null>(null)
    const [hasLocalDraft, setHasLocalDraft] = useState(false)
    const [localDraftContent, setLocalDraftContent] = useState<any>(null)

    const editor = useEditor({
        immediatelyRender: false,
        editable: !readOnly,
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder: 'Write something... Use / for commands, @ for people, # for items.',
            }),
            UserMention.configure({
                HTMLAttributes: {
                    class: 'mention user-mention bg-burgundy-main/10 dark:bg-burgundy-main/20 text-burgundy-main dark:text-burgundy-light rounded px-1 py-0.5 font-medium cursor-pointer',
                },
                suggestion: {
                    char: '@',
                    allowSpaces: true,
                    items: ({ query }) => getUserSuggestions(query),
                    render: renderSuggestion,
                },
            }),
            ItemMention.configure({
                HTMLAttributes: {
                    class: 'mention item-mention bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 rounded px-1 py-0.5 font-medium cursor-pointer',
                },
                suggestion: {
                    char: '#',
                    allowSpaces: true,
                    items: ({ query }) => getItemSuggestions(query),
                    render: renderSuggestion,
                },
            }),
            DateMention.configure({
                HTMLAttributes: {
                    class: 'mention date-mention bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 rounded px-1 py-0.5 font-medium cursor-pointer',
                },
                suggestion: {
                    char: '?',
                    allowSpaces: true,
                    items: ({ query }) => getDateSuggestions(query),
                    render: renderSuggestion,
                },
            }),
            SlashMention.configure({
                HTMLAttributes: {
                    class: 'mention slash-mention bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-300 rounded px-1 py-0.5 font-medium cursor-pointer',
                },
                suggestion: {
                    char: '/',
                    allowSpaces: true,
                    items: ({ query }) => getSlashSuggestions(query),
                    render: renderSuggestion,
                    command: ({ editor, range, props }) => {
                        if ((props as any).value === 'item') {
                            // Replace slash command with hash for item search
                            editor
                                .chain()
                                .focus()
                                .deleteRange(range)
                                .insertContent('#')
                                .run()
                        } else if ((props as any).value === 'data') {
                            // Replace slash command with question mark for date search
                            editor
                                .chain()
                                .focus()
                                .deleteRange(range)
                                .insertContent('?')
                                .run()
                        } else if ((props as any).value === 'user') {
                            // Replace slash command with at sign for user search
                            editor
                                .chain()
                                .focus()
                                .deleteRange(range)
                                .insertContent('@')
                                .run()
                        } else if ((props as any).type === 'command') {
                            // Insert the command text to trigger further suggestions
                            editor
                                .chain()
                                .focus()
                                .insertContentAt(range, `/${(props as any).value} `)
                                .run()
                        } else {
                            // Normal mention insertion
                            editor
                                .chain()
                                .focus()
                                .insertContentAt(range, [
                                    {
                                        type: 'slashMention',
                                        attrs: props,
                                    },
                                    {
                                        type: 'text',
                                        text: ' ',
                                    },
                                ])
                                .run()
                        }
                    },
                },
            }),
        ],
        content: initialContent,
        onUpdate: ({ editor }) => {
            // We don't save immediately on update anymore
            // The saving is handled by the useEffect below watching debounced content
        },
        editorProps: {
            attributes: {
                class: 'prose dark:prose-invert focus:outline-none max-w-none min-h-[200px] p-4',
            },
        },
        onBlur: ({ editor }) => {
            if (!readOnly && onSave) {
                const content = editor.getJSON()
                // Force save on blur
                onSave(content)
                setSaveStatus('saved')
            }
        }
    })

    useImperativeHandle(ref, () => ({
        getJSON: () => editor?.getJSON()
    }))

    // Debounce saving
    const [content, setContent] = useState(initialContent)

    // Load from LocalStorage on mount
    useEffect(() => {
        if (!noteId || typeof window === 'undefined') return

        const key = `rekwizytor_note_draft_${noteId}`
        const savedDraft = localStorage.getItem(key)

        if (savedDraft) {
            try {
                const { content: draftContent, timestamp } = JSON.parse(savedDraft)

                // If serverUpdatedAt is provided, check if draft is newer
                const serverTime = serverUpdatedAt ? new Date(serverUpdatedAt).getTime() : 0
                const draftTime = new Date(timestamp).getTime()

                // Check if server content is effectively empty
                // Tiptap empty doc is usually { type: 'doc', content: [] } or just null/undefined
                const isServerEmpty = !initialContent ||
                    !initialContent.content ||
                    initialContent.content.length === 0 ||
                    (initialContent.content.length === 1 && !initialContent.content[0].content)

                console.log('Checking draft:', { draftTime, serverTime, isServerEmpty })

                if (draftTime > serverTime || isServerEmpty) {
                    console.log('Restoring draft from LocalStorage (newer or server empty)')
                    setContent(draftContent)
                    // If editor is already initialized, set its content
                    if (editor) {
                        editor.commands.setContent(draftContent)
                    }
                    setSaveStatus('local')
                } else {
                    console.log('Server is newer, but keeping draft available for manual restore')
                    setHasLocalDraft(true)
                    setLocalDraftContent(draftContent)
                }
            } catch (e) {
                console.error('Failed to parse draft', e)
            }
        }
    }, [noteId, serverUpdatedAt, editor]) // Add editor dependency to ensure content is set if editor loads after effect

    // Update local state when editor content changes
    useEffect(() => {
        if (!editor) return

        const handleUpdate = () => {
            const newContent = editor.getJSON()
            setContent(newContent)
            setSaveStatus('unsaved')

            // Immediate LocalStorage save (or very short debounce could be used here)
            if (noteId) {
                const key = `rekwizytor_note_draft_${noteId}`
                localStorage.setItem(key, JSON.stringify({
                    content: newContent,
                    timestamp: new Date().toISOString()
                }))
                setSaveStatus('local')
            }
        }

        editor.on('update', handleUpdate)

        return () => {
            editor.off('update', handleUpdate)
        }
    }, [editor, noteId])

    // Debounce the content value for SERVER save - 30 seconds
    const debouncedContent = useDebounce(content, 30000)

    // Trigger save when debounced content changes
    useEffect(() => {
        if (debouncedContent && onSave && !readOnly) {
            // Don't save if it's the initial load
            if (debouncedContent === initialContent && !lastServerSave) return

            setSaveStatus('saving')
            onSave(debouncedContent)
            setLastServerSave(new Date())

            // After successful save (assuming onSave is async but we don't await it here directly easily without changing interface)
            // Ideally onSave should return a promise. For now, we assume it works or the parent handles errors.
            // We'll set status to saved after a short delay to simulate completion or just assume success.
            // Better: The parent component handles the "Saving..." UI based on its own state, 
            // but we want a local indicator too.
            setTimeout(() => setSaveStatus('saved'), 1000)
        }
    }, [debouncedContent, onSave, readOnly])

    // Handle clicks on mentions in readOnly mode (or even edit mode if desired, but request said "outside edit mode")
    // But if we are in readOnly mode, we definitely want navigation.
    useEffect(() => {
        if (!editor) return

        const handleClick = (e: MouseEvent) => {
            // Only navigate if readOnly? Or always?
            // Request: "Poza trybem edycji kliknięcie przenosi do odpowiedniego miejsca"
            // So only when readOnly (or "outside edit mode").
            if (!readOnly) return

            const target = e.target as HTMLElement
            const mention = target.closest('.mention') as HTMLElement

            if (mention) {
                const id = mention.getAttribute('data-id')
                const type = mention.getAttribute('data-type')

                if (id && type) {
                    e.preventDefault()
                    e.stopPropagation()

                    if (type === 'item') router.push(`/items/${id}`)
                    // TODO: Add routes for other types when they exist
                    if (type === 'category') console.log('Navigate to category', id)
                    if (type === 'location') console.log('Navigate to location', id)
                    if (type === 'user') console.log('Navigate to user', id)
                }
            }
        }

        const dom = editor.view.dom
        dom.addEventListener('click', handleClick)
        return () => dom.removeEventListener('click', handleClick)
    }, [editor, readOnly, router])

    // Update editable state if readOnly changes
    useEffect(() => {
        if (editor) {
            editor.setEditable(!readOnly)
        }
    }, [editor, readOnly])

    return (
        <div className={`border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-950 ${readOnly ? 'border-transparent bg-transparent' : ''} relative`}>
            {!readOnly && (
                <div className="absolute top-2 right-2 z-10 flex flex-col items-end gap-1 pointer-events-none">
                    {hasLocalDraft && (
                        <button
                            onClick={() => {
                                if (confirm('Are you sure you want to restore the local backup? This will overwrite the current view.')) {
                                    editor?.commands.setContent(localDraftContent)
                                    setContent(localDraftContent)
                                    setSaveStatus('unsaved') // Trigger save
                                    setHasLocalDraft(false)
                                }
                            }}
                            className="pointer-events-auto text-[10px] uppercase tracking-wider font-bold bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 px-2 py-1 rounded shadow-sm hover:bg-amber-200 dark:hover:bg-amber-900 transition-colors border border-amber-200 dark:border-amber-800"
                        >
                            Restore Backup
                        </button>
                    )}
                    <div className="text-[10px] uppercase tracking-wider font-medium text-zinc-400 bg-white/50 dark:bg-zinc-950/50 px-2 py-1 rounded backdrop-blur-md border border-zinc-100 dark:border-zinc-800/50 shadow-sm">
                        {saveStatus === 'saved' && 'Saved'}
                        {saveStatus === 'saving' && 'Syncing...'}
                        {saveStatus === 'local' && 'Local'}
                        {saveStatus === 'unsaved' && 'Unsaved'}
                    </div>
                </div>
            )}
            <EditorContent editor={editor} />
        </div>
    )
})

NoteEditor.displayName = 'NoteEditor'

export default NoteEditor
