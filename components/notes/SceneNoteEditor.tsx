'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { extractTextFromContent } from './utils'
import { useDebounce } from '@/hooks/useDebounce'

type Scene = {
    id: string
    act_number: number
    scene_number: number
    name: string | null
}

interface SceneEditorProps {
    initialContent: any
    onUpdate: (content: any) => void
    isReadOnly?: boolean
}

// Mini-editor for individual scenes
const SceneContentEditor = ({ initialContent, onUpdate, isReadOnly }: SceneEditorProps) => {
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                bulletList: {
                    keepMarks: true,
                    keepAttributes: false,
                },
                // listItem: {}, // Default is fine
            }),
            Placeholder.configure({
                placeholder: 'Notatki do sceny...',
            }),
        ],

        content: initialContent,
        editable: !isReadOnly,
        onUpdate: ({ editor }) => {
            onUpdate(editor.getJSON())
        },
        editorProps: {
            attributes: {
                class: 'prose dark:prose-invert focus:outline-none max-w-none text-sm min-h-[60px]',
            },
        },
    })

    useEffect(() => {
        if (editor && isReadOnly !== undefined) {
            editor.setEditable(!isReadOnly)
        }
    }, [editor, isReadOnly])

    // Force bullet list if empty on mount (or content change if needed)
    useEffect(() => {
        if (editor && !editor.getText() && !editor.getJSON().content?.some((n: any) => n.type === 'bulletList')) {
            // Only if truly empty/paragraph only?
            // Actually parsing logic handles initial structure. This is just for safety.
        }
    }, [editor])


    return <EditorContent editor={editor} />
}

interface Props {
    noteId: string
    initialContent: any
    performanceId: string
    onSave: (content: any) => Promise<void>
    readOnly?: boolean
}

export default function SceneNoteEditor({ noteId, initialContent, performanceId, onSave, readOnly = false }: Props) {
    const t = useTranslations('SceneNote')
    const [scenes, setScenes] = useState<Scene[]>([])
    const [loading, setLoading] = useState(true)
    const [sceneContents, setSceneContents] = useState<Map<string, any>>(new Map())
    const supabase = createClient()

    // Track if we have unsaved changes to limit reconstructing JSON too often
    // Actually, we should reconstruct and debounce save just like the main editor

    useEffect(() => {
        const fetchScenes = async () => {
            const { data } = await supabase
                .from('scenes')
                .select('*')
                .eq('performance_id', performanceId)
                .order('act_number')
                .order('scene_number')

            if (data) {
                const sanitizedData: Scene[] = data.map(s => ({
                    ...s,
                    act_number: s.act_number ?? 1
                }))
                setScenes(sanitizedData)
                parseContentToScenes(sanitizedData, initialContent)
            }
            setLoading(false)
        }

        fetchScenes()
    }, [performanceId, initialContent]) // Re-run if initialContent changes (e.g. fresh load)

    const parseContentToScenes = (fetchedScenes: Scene[], content: any) => {
        const map = new Map<string, any>()
        const unassigned: any[] = []

        if (!content || !content.content) {
            // Init with bullets if empty
            fetchedScenes.forEach(s => {
                map.set(s.id, {
                    type: 'doc',
                    content: [
                        { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph' }] }] }
                    ]
                })
            })
            setSceneContents(map)
            return
        }

        // Logic to split the monolithic JSON into chunks per scene
        // We look for headers "Scena X" to identify chunks
        let currentAct = 1
        let currentSceneId: string | null = null
        let buffer: any[] = []

        const flushBuffer = () => {
            if (currentSceneId) {
                // Check if we already have content for this scene (duplicates?)
                const existing = map.get(currentSceneId)
                if (existing) {
                    // Merge? Or overwrite? Let's append paragraphs?
                    // For now, simpler: overwrite or first wins.
                } else {
                    map.set(currentSceneId, {
                        type: 'doc',
                        content: buffer.length > 0 ? buffer : [
                            { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph' }] }] }
                        ]
                    })

                }
            } else if (buffer.length > 0) {
                unassigned.push(...buffer)
            }
            buffer = []
        }

        content.content.forEach((node: any) => {
            if (node.type === 'heading') {
                const text = extractTextFromContent(node)

                // Act Header
                const actMatch = text.match(/Akt\s+(\d+)/i)
                if (actMatch) {
                    currentAct = parseInt(actMatch[1])
                    return // Skip adding header to buffer
                }

                // Scene Header
                const sceneMatch = text.match(/Scena\s+(\d+)/i)
                if (sceneMatch) {
                    flushBuffer()
                    const num = parseInt(sceneMatch[1])
                    // Find scene in fetchedScenes
                    const found = fetchedScenes.find(s => s.act_number === currentAct && s.scene_number === num)
                    currentSceneId = found ? found.id : null
                    return // Skip adding header
                }
            }

            // Skip horizontal rules as they are separators
            if (node.type === 'horizontalRule') return

            // Add other content to buffer
            buffer.push(node)
        })
        flushBuffer()

        // Ensure all scenes have at least a bullet list if empty
        fetchedScenes.forEach(s => {
            if (!map.has(s.id)) {
                map.set(s.id, {
                    type: 'doc',
                    content: [
                        { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph' }] }] }
                    ]
                })
            }
        })

        setSceneContents(map)
    }

    const handleSceneUpdate = (sceneId: string, content: any) => {
        const newMap = new Map(sceneContents)
        newMap.set(sceneId, content)
        setSceneContents(newMap)
        // Trigger save logic (debounced)
    }

    // Reconstruct full JSON for saving
    const reconstructJSON = useCallback(() => {
        const fullContent: any[] = []
        let lastAct = 0

        scenes.forEach(scene => {
            // Add Act Header if needed
            if (scene.act_number !== lastAct) {
                fullContent.push({
                    type: 'heading',
                    attrs: { level: 1 },
                    content: [{ type: 'text', text: `Akt ${scene.act_number}` }]
                })
                lastAct = scene.act_number
            }

            // Add Scene Header
            const sceneName = scene.name ? ` - ${scene.name}` : ''
            fullContent.push({
                type: 'heading',
                attrs: { level: 2 },
                content: [{ type: 'text', text: `Scena ${scene.scene_number}${sceneName}` }]
            })

            // Add Scene Content
            const chunk = sceneContents.get(scene.id)
            if (chunk && chunk.content) {
                fullContent.push(...chunk.content)
            } else {
                fullContent.push({
                    type: 'bulletList',
                    content: [{ type: 'listItem', content: [{ type: 'paragraph' }] }]
                })
            }


            // Separator
            fullContent.push({ type: 'horizontalRule' })
        })

        return {
            type: 'doc',
            content: fullContent
        }
    }, [scenes, sceneContents])

    // Debounce save
    const debouncedSceneContents = useDebounce(sceneContents, 2000)

    useEffect(() => {
        if (!loading && debouncedSceneContents.size > 0 && !readOnly) {
            const fullJSON = reconstructJSON()
            // Avoid saving if equivalent to initial? 
            // Tiptap JSON comparison is heavy. user passed onSave handles deduping usually?
            onSave(fullJSON)
        }
    }, [debouncedSceneContents, loading, readOnly, reconstructJSON, onSave])

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-neutral-500" /></div>
    }

    // Group scenes by Act for rendering
    const scenesByAct = scenes.reduce((acc, scene) => {
        const act = scene.act_number
        if (!acc[act]) acc[act] = []
        acc[act].push(scene)
        return acc
    }, {} as Record<number, Scene[]>)

    return (
        <div className="max-w-3xl mx-auto space-y-8 pb-32">
            {Object.entries(scenesByAct).map(([actNum, actScenes]) => (
                <div key={actNum} className="space-y-4">
                    <div className="flex items-center gap-4 text-neutral-500 text-xs font-bold tracking-wider uppercase pl-2 border-b border-neutral-800 pb-2 mb-6">
                        <span>Akt {actNum}</span>
                    </div>

                    <div className="grid gap-px bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800">
                        {actScenes.map((scene) => (
                            <div key={scene.id} className="bg-black/40 p-4 md:p-6 hover:bg-black/60 transition-colors">
                                <div className="flex gap-6">
                                    {/* Scene Number / Header */}
                                    <div className="w-12 flex-shrink-0 pt-1">
                                        <div className="text-xl font-bold text-white leading-none mb-1">{scene.scene_number}</div>
                                        <div className="text-[10px] uppercase tracking-wide text-neutral-500 leading-tight">
                                            {scene.name || 'Bez nazwy'}
                                        </div>
                                    </div>

                                    {/* Editor Area */}
                                    <div className="flex-1 min-w-0">
                                        <SceneContentEditor
                                            initialContent={sceneContents.get(scene.id)}
                                            onUpdate={(c) => handleSceneUpdate(scene.id, c)}
                                            isReadOnly={readOnly}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}
