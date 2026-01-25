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
    setExternalContent: (content: any) => void
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
                    class: 'mention user-mention bg-burgundy-main/10 dark:bg-burgundy-main/20 text-burgundy-main dark:text-burgundy-light rounded px-1 py-0.5 font-medium cursor-pointer pointer-events-auto',
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
                    class: 'mention item-mention bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 rounded px-1 py-0.5 font-medium cursor-pointer pointer-events-auto',
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
                            // Replace slash command with @ for user search
                            editor
                                .chain()
                                .focus()
                                .deleteRange(range)
                                .insertContent('@')
                                .run()
                        } else if ((props as any).value === 'preshow') {
                            // Insert Pre-show template
                            editor
                                .chain()
                                .focus()
                                .deleteRange(range)
                                .insertContent([
                                    {
                                        type: 'heading',
                                        attrs: { level: 2 },
                                        content: [{ type: 'text', text: 'Etap 0: Przed spektaklem' }]
                                    },
                                    {
                                        type: 'bulletList',
                                        content: [
                                            {
                                                type: 'listItem',
                                                content: [{ type: 'paragraph' }]
                                            }
                                        ]
                                    }
                                ])
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
                class: 'prose dark:prose-invert focus:outline-none max-w-3xl mx-auto min-h-[500px] py-4 prose-hr:opacity-10 dark:prose-hr:opacity-10 prose-hr:my-4 prose-p:leading-relaxed',
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
        getJSON: () => editor?.getJSON(),
        setExternalContent: (newContent: any) => {
            if (editor) {
                console.log('Setting external content via imperative handle')
                editor.commands.setContent(newContent)
                setContent(newContent)
                setSaveStatus('saved')
            }
        }
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
                const isServerEmpty = !initialContent ||
                    !initialContent.content ||
                    initialContent.content.length === 0 ||
                    (initialContent.content.length === 1 && !initialContent.content[0].content)

                console.log('Checking draft:', { draftTime, serverTime, isServerEmpty })

                // Tolerance of 2 seconds to avoid minor clock diffs causing issues
                if (draftTime > serverTime + 2000 || isServerEmpty) {
                    console.log('Restoring draft from LocalStorage (newer or server empty)')
                    setContent(draftContent)
                    // If editor is already initialized, set its content
                    if (editor) {
                        editor.commands.setContent(draftContent)
                    }
                    setSaveStatus('local')
                } else {
                    // Server is newer or equal. The local draft is stale.
                    // We should discard the stale draft to prevent "Restore Backup" prompts for old data.
                    console.log('Server is newer. Discarding stale local draft.')
                    localStorage.removeItem(key)
                    setHasLocalDraft(false)
                }
            } catch (e) {
                // Silent failure for draft parsing - not critical to user experience
                console.warn('Failed to parse draft, removing stale data', e)
                localStorage.removeItem(key)
            }
        }
    }, [noteId, serverUpdatedAt, editor]) // Removed initialContent from dependency to avoid re-running on prop change

    // Update local state when editor content changes
    useEffect(() => {
        if (!editor) return

        let typingTimeout: NodeJS.Timeout

        const handleUpdate = () => {
            const newContent = editor.getJSON()
            setContent(newContent)

            // Clear previous timeout
            clearTimeout(typingTimeout)

            // Don't show any status while actively typing
            // After 2s of no typing, show "Zapisywanie..."
            typingTimeout = setTimeout(() => {
                setSaveStatus('unsaved')
            }, 2000)

            // Immediate LocalStorage save as backup (silent, don't change status)
            if (noteId) {
                const key = `rekwizytor_note_draft_${noteId}`
                localStorage.setItem(key, JSON.stringify({
                    content: newContent,
                    timestamp: new Date().toISOString()
                }))
                // Don't change status - we only care about server saves
            }
        }

        editor.on('update', handleUpdate)

        return () => {
            editor.off('update', handleUpdate)
            clearTimeout(typingTimeout)
        }
    }, [editor, noteId])

    // Debounce the content value for SERVER save - 10 seconds
    const debouncedContent = useDebounce(content, 10000)

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
            // Only set to saved if we are still in 'saving' state (user hasn't typed more)
            setTimeout(() => {
                setSaveStatus(prev => prev === 'saving' ? 'saved' : prev)
            }, 1000)
        }
    }, [debouncedContent, onSave, readOnly])

    // Handle clicks on mentions in readOnly mode
    useEffect(() => {
        if (!editor || !readOnly) return

        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement
            // Handle different types of mentions (class names might vary based on how they are rendered)
            // The renderer uses mergeAttributes which adds the class to the span
            const mention = target.closest('.mention') as HTMLElement

            if (mention) {
                const id = mention.dataset.id
                const type = mention.dataset.type

                console.log('Clicked mention:', type, id)

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

        // We need to attach to the editor's DOM element
        const dom = editor.view.dom
        dom.addEventListener('click', handleClick)

        // Also attach to the parent container just in case Tiptap captures clicks weirdly
        // specifically for read-only mode where contentEditable is false
        // But editor.view.dom is the contentEditable div usually.

        return () => {
            dom.removeEventListener('click', handleClick)
        }
    }, [editor, readOnly, router])

    // Update editable state if readOnly changes
    useEffect(() => {
        if (editor) {
            editor.setEditable(!readOnly)
        }
    }, [editor, readOnly])

    return (
        <div className={`relative w-full h-full min-h-[calc(100vh-200px)] group ${readOnly ? '' : ''}`}>
            {!readOnly && hasLocalDraft && (
                <div className="absolute top-0 right-0 z-10 pointer-events-none">
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
                </div>
            )}

            <div className="relative h-full">
                <EditorContent editor={editor} className="h-full" />
                {/* Gradient fade at bottom for nice effect */}
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-neutral-950 to-transparent pointer-events-none" />
            </div>
        </div>
    )
})

NoteEditor.displayName = 'NoteEditor'

export default NoteEditor
