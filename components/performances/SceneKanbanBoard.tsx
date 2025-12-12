'use client'

import { useState, useMemo, useEffect } from 'react'
import { Scene } from '@/types/supabase' // Assuming this type exists or defining strict shape
import { Trash2, GripVertical, Plus, Loader2 } from 'lucide-react'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragOverEvent,
    DragStartEvent,
    DragOverlay,
    defaultDropAnimationSideEffects,
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// Define local Scene type if not imported, to be safe matching ManageScenesForm
export type SceneItem = {
    id: string
    scene_number: number
    name: string | null
    act_number: number
}

type Props = {
    scenes: SceneItem[]
    onReorder: (newScenes: SceneItem[]) => void
    onUpdate: (id: string, updates: Partial<SceneItem>) => void
    onRemove: (id: string) => void
    onAdd: (act: number, name: string) => Promise<void> // Helper for quick add
}

export function SceneKanbanBoard({ scenes, onReorder, onUpdate, onRemove, onAdd }: Props) {
    const [activeId, setActiveId] = useState<string | null>(null)
    const [addingToAct, setAddingToAct] = useState<number | null>(null) // Track loading state for quick add per Act
    const [quickAddValues, setQuickAddValues] = useState<Record<number, string>>({})

    const acts = useMemo(() => {
        const uniqueActs = Array.from(new Set(scenes.map(s => s.act_number))).sort((a, b) => a - b)
        if (uniqueActs.length === 0) return [1]
        // Ensure strictly 1, 2, 3... if needed? Or just show what exists?
        // Let's show what exists + maybe a way to add an empty act?
        // User asked for "Acts as separated zones".
        // If an Act has no scenes, it might be hidden here if we map from scenes.
        // But normally we at least have Act 1.
        return uniqueActs
    }, [scenes])

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    function handleDragStart(event: DragStartEvent) {
        setActiveId(event.active.id as string)
    }

    function handleDragOver(event: DragOverEvent) {
        const { active, over } = event
        if (!over) return

        const activeScene = scenes.find(s => s.id === active.id)
        if (!activeScene) return

        const isOverContainer = acts.some(act => `act-${act}` === over.id)
        const isOverScene = scenes.some(s => s.id === over.id)

        // We only care about visual updates during drag if we want smooth movement between lists
        // dnd-kit handles the overlay position.
        // We generally shouldn't mutate state here unless we want to simulate the move "live".
    }

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event
        setActiveId(null)

        if (!over) return

        const activeScene = scenes.find(s => s.id === active.id)
        if (!activeScene) return

        const isOverContainer = acts.some(act => `act-${act}` === over.id)
        const isOverScene = scenes.some(s => s.id === over.id)

        let newScenes = [...scenes]

        if (isOverContainer) {
            // Dropped on act header/container
            const actNumber = parseInt(over.id.toString().replace('act-', ''))
            if (activeScene.act_number !== actNumber) {
                const sceneIndex = newScenes.findIndex(s => s.id === active.id)
                newScenes[sceneIndex] = { ...newScenes[sceneIndex], act_number: actNumber }
            }
        } else if (isOverScene) {
            const overScene = scenes.find(s => s.id === over.id)
            if (!overScene) return

            const oldIndex = newScenes.findIndex(s => s.id === active.id)
            const newIndex = newScenes.findIndex(s => s.id === over.id)

            if (activeScene.act_number !== overScene.act_number) {
                newScenes[oldIndex] = { ...newScenes[oldIndex], act_number: overScene.act_number }
            }
            newScenes = arrayMove(newScenes, oldIndex, newIndex)
        }

        // Re-sequence
        const actOffsets: Record<number, number> = {} // If we wanted to preserve offsets, but user wants clean numbering here for DB?
        // Actually, if we are in "Management" mode, usually we just want 1, 2, 3 per act.
        // Unless we have some "legacy" acts. 
        // Let's stick to 1-based sequential for consistency.

        const uniqueActsInNew = Array.from(new Set(newScenes.map(s => s.act_number))).sort((a, b) => a - b)
        uniqueActsInNew.forEach(act => {
            const actScenes = newScenes.filter(s => s.act_number === act)
            // Preserving order in newScenes is tricky because filter returns reference? No, objects are ref.
            // But we need to know the order relative to newScenes list?
            // "newScenes" is the global list. If we sorted global list?
            // "arrayMove" updates the global list order.
            // So iterating newScenes is correct order.

            let count = 1
            newScenes.forEach((s, idx) => {
                if (s.act_number === act) {
                    if (s.scene_number !== count) {
                        newScenes[idx] = { ...newScenes[idx], scene_number: count }
                    }
                    count++
                }
            })
        })

        onReorder(newScenes)
    }

    const handleQuickAdd = async (act: number) => {
        const name = quickAddValues[act]?.trim() || ''
        if (!name) return

        setAddingToAct(act)
        try {
            await onAdd(act, name)
            setQuickAddValues(prev => ({ ...prev, [act]: '' }))
        } finally {
            setAddingToAct(null)
        }
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="flex flex-col lg:flex-row gap-6 overflow-x-auto pb-6">
                {acts.map(act => {
                    const scenesInAct = scenes.filter(s => s.act_number === act)

                    return (
                        <div key={act} className="flex-1 min-w-[300px] border border-neutral-800 rounded-xl bg-neutral-900 overflow-hidden flex flex-col">
                            {/* Header */}
                            <div className="p-4 border-b border-neutral-800 bg-neutral-950 flex justify-between items-center">
                                <span className="font-bold text-white">Act {act}</span>
                                <span className="text-xs text-neutral-500 font-mono bg-neutral-900 px-2 py-1 rounded-full border border-neutral-800">
                                    {scenesInAct.length}
                                </span>
                            </div>

                            {/* List */}
                            <div className="flex-1 p-3 min-h-[100px] max-h-[70vh] overflow-y-auto space-y-2">
                                <SortableContext
                                    id={`act-${act}`}
                                    items={scenesInAct.map(s => s.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {scenesInAct.map((scene) => (
                                        <SortableScene
                                            key={scene.id}
                                            scene={scene}
                                            onUpdate={onUpdate}
                                            onRemove={onRemove}
                                        />
                                    ))}
                                    {scenesInAct.length === 0 && (
                                        <div className="h-full flex items-center justify-center text-neutral-600 italic text-sm py-8">
                                            No scenes in Act {act}
                                        </div>
                                    )}
                                </SortableContext>
                            </div>

                            {/* Quick Add Footer */}
                            <div className="p-3 border-t border-neutral-800 bg-neutral-950/50">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Add scene..."
                                        className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors placeholder-neutral-600"
                                        value={quickAddValues[act] || ''}
                                        onChange={(e) => setQuickAddValues({ ...quickAddValues, [act]: e.target.value })}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleQuickAdd(act)
                                        }}
                                        disabled={addingToAct === act}
                                    />
                                    <button
                                        onClick={() => handleQuickAdd(act)}
                                        disabled={addingToAct === act}
                                        className="p-2 rounded bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white transition-colors disabled:opacity-50"
                                    >
                                        {addingToAct === act ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            <DragOverlay>
                {activeId ? (
                    <div className="p-4 bg-neutral-800 border border-neutral-600 rounded-lg shadow-2xl opacity-90 text-white font-medium w-[300px]">
                        Moving Scene...
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    )
}

function SortableScene({ scene, onUpdate, onRemove }: { scene: SceneItem, onUpdate: (id: string, updates: Partial<SceneItem>) => void, onRemove: (id: string) => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: scene.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="group flex items-center gap-3 p-3 rounded-lg border border-neutral-800 bg-neutral-950/80 hover:border-neutral-700 transition-all shadow-sm"
        >
            <div {...attributes} {...listeners} className="cursor-grab text-neutral-600 hover:text-neutral-400">
                <GripVertical className="w-4 h-4" />
            </div>

            {/* Scene Number Badge */}
            <div className="w-8 h-8 flex-shrink-0 bg-neutral-900 border border-neutral-800 rounded flex items-center justify-center text-white font-mono font-bold text-sm">
                {scene.scene_number}
            </div>

            {/* Name Input */}
            <input
                type="text"
                value={scene.name || ''}
                onChange={(e) => onUpdate(scene.id, { name: e.target.value })}
                placeholder="Scene Name"
                className="flex-1 bg-transparent border-none p-0 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-0"
            />

            {/* Remove */}
            <button
                onClick={() => onRemove(scene.id)}
                className="text-neutral-600 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <Trash2 className="w-3.5 h-3.5" />
            </button>
        </div>
    )
}
