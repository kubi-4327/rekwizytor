'use client'

import { useEditor, EditorContent, ReactNodeViewRenderer, mergeAttributes } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Mention from '@tiptap/extension-mention'
import { getSlashSuggestions, getUserSuggestions, getItemSuggestions, getDateSuggestions, renderSuggestion } from './suggestion'
import { useEffect, useState } from 'react'
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

export default function NoteEditor({
    initialContent,
    onSave,
    readOnly = false
}: {
    initialContent?: any,
    onSave?: (content: any) => void,
    readOnly?: boolean
}) {
    const router = useRouter()

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
    })

    // Debounce saving
    const [content, setContent] = useState(initialContent)

    // Update local state when editor content changes
    useEffect(() => {
        if (!editor) return

        const handleUpdate = () => {
            setContent(editor.getJSON())
        }

        editor.on('update', handleUpdate)

        return () => {
            editor.off('update', handleUpdate)
        }
    }, [editor])

    // Debounce the content value
    const debouncedContent = useDebounce(content, 1000)

    // Trigger save when debounced content changes
    useEffect(() => {
        if (debouncedContent && onSave) {
            onSave(debouncedContent)
        }
    }, [debouncedContent, onSave])

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
        <div className={`border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-950 ${readOnly ? 'border-transparent bg-transparent' : ''}`}>
            <EditorContent editor={editor} />
        </div>
    )
}
