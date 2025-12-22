'use client'

import { Fragment } from 'react'
import { Database } from '@/types/supabase'
import { useTranslations } from 'next-intl'
import { deletePerformanceItem } from '@/app/actions/performance-props'
import { Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

type PerformanceItem = Database['public']['Tables']['performance_items']['Row'] & {
    items: {
        name: string
        image_url: string | null
    } | null
}

type Scene = Database['public']['Tables']['scenes']['Row']

import { getSceneNotesFromContent } from '@/components/notes/scene-utils'

type Props = {
    performanceId: string
    propsByAct: Record<number, PerformanceItem[]>
    assignedProps: PerformanceItem[] | null
    scenes: Scene[]
    sceneNote: any | null
}

export function PerformanceSceneView({ performanceId, propsByAct, assignedProps, scenes, sceneNote }: Props) {
    const t = useTranslations('ProductionDetails')

    // Helper to get scenes for an act
    const getScenesForAct = (actNum: number) => {
        return scenes?.filter(s => s.act_number === actNum) || []
    }

    // Sanitize scenes for utils
    const sanitizedScenes = scenes.map(s => ({
        ...s,
        act_number: s.act_number ?? 1
    }))

    // Extract notes map
    const sceneNotesMap = sceneNote ? getSceneNotesFromContent(sceneNote.content, sanitizedScenes) : new Map()

    // Helper to extract text from Tiptap nodes (for simple display)
    const getTextFromNodes = (nodes: any[]): string => {
        if (!nodes) return ''
        return nodes.map(node => {
            if (node.type === 'text') return node.text
            if (node.content) return getTextFromNodes(node.content)
            if (node.type === 'listItem' || node.type === 'paragraph') return getTextFromNodes(node.content || []) + '\n'
            return ''
        }).join('').trim()
    }

    // Get sorted act numbers
    const sortedActs = Object.keys(propsByAct)
        .map(Number)
        .sort((a, b) => a - b)

    // Ensure we have at least Acts that have scenes, even if no props
    const actsFromScenes = new Set(scenes?.map(s => s.act_number || 1) || [])
    const allActs = Array.from(new Set([...sortedActs, ...Array.from(actsFromScenes)])).sort((a, b) => a - b)

    // Group scenes by Act for easier rendering
    const scenesByAct: Record<number, Scene[]> = {}
    allActs.forEach(actNum => {
        scenesByAct[actNum] = getScenesForAct(actNum)
    })

    return (
        <div className="space-y-12">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900/50">
                <table className="w-full">
                    <thead className="bg-neutral-900 border-b border-neutral-800">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider w-1/3">
                                {t('scene')}
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                                {t('props')}
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                        {allActs.map(actNum => (
                            <Fragment key={actNum}>
                                {/* Act Header */}
                                <tr className="bg-neutral-900/80">
                                    <td colSpan={2} className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider border-y border-neutral-800 text-center">
                                        {t('act', { actNum })}
                                    </td>
                                </tr>
                                {scenesByAct[actNum]
                                    ?.sort((a, b) => a.scene_number - b.scene_number)
                                    .map(scene => {
                                        // Find props for this scene
                                        const sceneProps = propsByAct[actNum]?.filter(p => p.scene_number?.toString() === scene.scene_number.toString()) || []
                                        const noteContent = sceneNotesMap.get(scene.id)
                                        const noteText = noteContent ? getTextFromNodes(noteContent) : null

                                        // Combined list: props + note lines?
                                        // Or separate? User wants "scene notes" 

                                        // If we have note text, splitting by newline to mimic bullet points
                                        const noteLines = noteText ? noteText.split('\n').filter((l: string) => l.trim().length > 0) : []

                                        if (sceneProps.length === 0 && noteLines.length === 0) {
                                            return (
                                                <tr key={scene.id} className="hover:bg-neutral-800/50">
                                                    <td className="px-6 py-4 text-sm text-neutral-300 align-top border-r border-neutral-800/50">
                                                        <div className="font-medium">{scene.scene_number}</div>
                                                        {scene.name && <div className="text-xs text-neutral-500">{scene.name}</div>}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-neutral-600 italic align-top">
                                                        {/* Empty cell */}
                                                    </td>
                                                </tr>
                                            )
                                        }

                                        return (
                                            <Fragment key={scene.id}>
                                                {/* Props from legacy items */}
                                                {sceneProps.map((prop, index) => (
                                                    <tr key={prop.id} className="group hover:bg-neutral-800/50">
                                                        {index === 0 && (
                                                            <td rowSpan={sceneProps.length + (noteLines.length > 0 ? 1 : 0)} className="px-6 py-4 text-sm text-neutral-300 align-top border-r border-neutral-800/50">
                                                                <div className="font-medium">{scene.scene_number}</div>
                                                                {scene.name && <div className="text-xs text-neutral-500">{scene.name}</div>}
                                                            </td>
                                                        )}
                                                        <td className="px-6 py-4 text-sm text-white align-top">
                                                            <div className="flex items-center justify-between gap-4">
                                                                <span className="italic text-neutral-300">
                                                                    {prop.usage_notes || prop.notes_snapshot || prop.setup_instructions || prop.items?.name || prop.item_name_snapshot}
                                                                </span>
                                                                <button
                                                                    onClick={async () => {
                                                                        if (confirm(t('confirmDelete'))) {
                                                                            await deletePerformanceItem(prop.id, performanceId)
                                                                            toast.success(t('propDeleted'))
                                                                        }
                                                                    }}
                                                                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-red-500/20 text-neutral-500 hover:text-red-400 transition-all"
                                                                    title={t('deleteProp')}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}

                                                {/* Notes from SceneNote */}
                                                {noteLines.length > 0 && (
                                                    <tr className="hover:bg-neutral-800/50">
                                                        {(sceneProps.length === 0) && (
                                                            <td className="px-6 py-4 text-sm text-neutral-300 align-top border-r border-neutral-800/50">
                                                                <div className="font-medium">{scene.scene_number}</div>
                                                                {scene.name && <div className="text-xs text-neutral-500">{scene.name}</div>}
                                                            </td>
                                                        )}
                                                        <td className="px-6 py-4 text-sm text-white align-top">
                                                            <ul className="list-disc list-inside space-y-1 text-neutral-300">
                                                                {noteLines.map((line: string, i: number) => (
                                                                    <li key={i}>{line}</li>
                                                                ))}
                                                            </ul>
                                                        </td>
                                                    </tr>
                                                )}
                                            </Fragment>
                                        )
                                    })}
                            </Fragment>
                        ))}

                        {allActs.length === 0 && (
                            <tr>
                                <td colSpan={2} className="px-4 py-8 text-center text-sm text-neutral-500">
                                    {t('noScenes')}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-6">
                {allActs.map(actNum => (
                    <div key={actNum} className="space-y-4">
                        <div className="flex items-center gap-2 px-2">
                            <div className="h-px flex-1 bg-neutral-800" />
                            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                                {t('act', { actNum })}
                            </span>
                            <div className="h-px flex-1 bg-neutral-800" />
                        </div>

                        <div className="space-y-3">
                            {scenesByAct[actNum]
                                ?.sort((a, b) => a.scene_number - b.scene_number)
                                .map(scene => {
                                    const sceneProps = propsByAct[actNum]?.filter(p => p.scene_number?.toString() === scene.scene_number.toString()) || []
                                    const noteContent = sceneNotesMap.get(scene.id)
                                    const noteText = noteContent ? getTextFromNodes(noteContent) : null
                                    const noteLines = noteText ? noteText.split('\n').filter((l: string) => l.trim().length > 0) : []

                                    return (
                                        <div key={scene.id} className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-3">
                                            <div className="flex items-baseline gap-2 pb-2 border-b border-neutral-800 mb-2">
                                                <span className="text-lg font-bold text-white">{scene.scene_number}</span>
                                                {scene.name && <span className="text-sm text-neutral-400">{scene.name}</span>}
                                            </div>

                                            {(sceneProps.length > 0 || noteLines.length > 0) ? (
                                                <div className="space-y-3">
                                                    {sceneProps.map(prop => (
                                                        <div key={prop.id} className="flex items-start justify-between gap-4">
                                                            <div className="flex-1">
                                                                <h4 className="text-sm font-medium text-neutral-300 italic mb-1">
                                                                    {prop.usage_notes || prop.notes_snapshot || prop.setup_instructions || prop.items?.name || prop.item_name_snapshot}
                                                                </h4>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {prop.items?.image_url && (
                                                                    <div className="relative h-10 w-10 rounded bg-neutral-800 overflow-hidden shrink-0">
                                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                        <img
                                                                            src={prop.items.image_url}
                                                                            alt={prop.items.name}
                                                                            className="object-cover w-full h-full"
                                                                        />
                                                                    </div>
                                                                )}
                                                                <button
                                                                    onClick={async () => {
                                                                        if (confirm(t('confirmDelete'))) {
                                                                            await deletePerformanceItem(prop.id, performanceId)
                                                                            toast.success(t('propDeleted'))
                                                                        }
                                                                    }}
                                                                    className="p-2 rounded hover:bg-neutral-800 text-neutral-500 hover:text-red-400 transition-colors"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}

                                                    {/* Display Scene Note content for Mobile */}
                                                    {noteLines.length > 0 && (
                                                        <div className="pt-2 mt-2 border-t border-neutral-800/50">
                                                            <ul className="list-disc list-inside space-y-1 text-sm text-neutral-400">
                                                                {noteLines.map((line: string, i: number) => (
                                                                    <li key={i}>{line}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="text-sm text-neutral-600 italic">
                                                    {t('noPropsInScene')}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

