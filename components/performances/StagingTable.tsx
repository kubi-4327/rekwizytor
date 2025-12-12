'use client'

import { useState, useMemo, useEffect } from 'react'
import { ScannedScene } from '@/app/actions/scan-scenes'
import { Trash2, AlertTriangle, GripVertical, ZoomIn, ZoomOut, Eye, Plus } from 'lucide-react'
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

type Props = {
    scannedScenes: ScannedScene[]
    existingScenes: { act: number, number: number }[]
    imageUrls: string[]
    onUpdate: (index: number, updates: Partial<ScannedScene>) => void
    onRemove: (index: number) => void
    onReorder: (newScenes: ScannedScene[]) => void
}

export function StagingTable({ scannedScenes, existingScenes, imageUrls, onUpdate, onRemove, onReorder }: Props) {
    const [activeImageIndex, setActiveImageIndex] = useState(0)
    const [zoom, setZoom] = useState(1)
    const [activeId, setActiveId] = useState<string | null>(null)

    // Group scenes by Act
    // We need to keep track of the original indexes to call onUpdate/onRemove correctly
    // or we just manipulate the full list based on IDs.
    // Using IDs is safer for reordering.

    const acts = useMemo(() => {
        const uniqueActs = Array.from(new Set(scannedScenes.map(s => s.act_number || 1))).sort((a, b) => a - b)
        if (uniqueActs.length === 0) return [1]
        return uniqueActs
    }, [scannedScenes])

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Require drag 8px to start, allows clicking inputs
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

        // const activeScene = scannedScenes.find(s => s._id === active.id)
        // if (!activeScene) return

        // If dropping over a container (Act header/area)
        // const overId = over.id
        // Check if over is a scene or an act container
        // const isOverScene = scannedScenes.some(s => s._id === overId)

        // If over another scene, we let dragEnd handle ordering if in same container.
        // If in different containers, we need to move it to the new container's group in scannedScenes?
        // Actually, DndKit examples usually handle this in dragOver for visual feedback.
    }

    // Calculate starting offsets for each Act based on existing scenes
    const actOffsets = useMemo(() => {
        const offsets: Record<number, number> = {}
        existingScenes.forEach(s => {
            offsets[s.act] = Math.max(offsets[s.act] || 0, s.number)
        })
        return offsets
    }, [existingScenes])

    // Auto-sequence on mount/update to ensure consistency
    useEffect(() => {
        if (scannedScenes.length === 0) return

        // Check if we need to re-sequence (e.g. if numbers collide with existing)
        // Or just force enforce sequential order always?
        // Let's enforce it to be safe.

        const newScenes = [...scannedScenes]
        let hasChanges = false

        const uniqueActs = Array.from(new Set(newScenes.map(s => s.act_number || 1)))

        uniqueActs.forEach(act => {
            const startOffset = actOffsets[act] || 0
            const actScenes = newScenes.filter(s => (s.act_number || 1) === act)

            actScenes.forEach((scene, index) => {
                const expectedNumber = startOffset + index + 1
                if (scene.scene_number !== expectedNumber) {
                    const realIndex = newScenes.findIndex(s => s._id === scene._id)
                    if (realIndex !== -1) {
                        newScenes[realIndex] = { ...newScenes[realIndex], scene_number: expectedNumber }
                        hasChanges = true
                    }
                }
            })
        })

        if (hasChanges) {
            onReorder(newScenes)
        }
    }, [scannedScenes.length, actOffsets]) // Dependency on length mainly, to trigger on load. avoiding infinite loop with onReorder

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event
        setActiveId(null)

        if (!over) return

        const activeScene = scannedScenes.find(s => s._id === active.id)
        if (!activeScene) return

        // Identification
        const isOverContainer = acts.some(act => `act-${act}` === over.id)
        const isOverScene = scannedScenes.some(s => s._id === over.id)

        let newScenes = [...scannedScenes]

        if (isOverContainer) {
            // Dropped on an Act header/container -> Move to that Act
            const actNumber = parseInt(over.id.toString().replace('act-', ''))

            // Update act number of the active scene
            if (activeScene.act_number !== actNumber) {
                const sceneIndex = newScenes.findIndex(s => s._id === active.id)
                newScenes[sceneIndex] = { ...newScenes[sceneIndex], act_number: actNumber }
            }
        }
        else if (isOverScene) {
            // Dropped on another scene
            const overScene = scannedScenes.find(s => s._id === over.id)
            if (!overScene) return

            const oldIndex = newScenes.findIndex(s => s._id === active.id)
            const newIndex = newScenes.findIndex(s => s._id === over.id)

            // If moving between Acts (dragging scene A (Act 1) onto scene B (Act 2))
            if (activeScene.act_number !== overScene.act_number) {
                newScenes[oldIndex] = { ...newScenes[oldIndex], act_number: overScene.act_number }
            }
            // Reorder in the flat array
            newScenes = arrayMove(newScenes, oldIndex, newIndex)
        }

        // Auto-sequence scene numbers per Act
        const uniqueActsInNewScenes = Array.from(new Set(newScenes.map((s: ScannedScene) => s.act_number || 1))).sort((a: number, b: number) => a - b)

        uniqueActsInNewScenes.forEach((act: number) => {
            const startOffset = actOffsets[act] || 0
            // Get all scenes for this act, preserving their relative order in the newScenes array
            const actScenes = newScenes.filter((s: ScannedScene) => (s.act_number || 1) === act)

            // Update their scene numbers sequentially
            actScenes.forEach((scene: ScannedScene, index: number) => {
                const realIndex = newScenes.findIndex((s: ScannedScene) => s._id === scene._id)
                if (realIndex !== -1) {
                    newScenes[realIndex] = { ...newScenes[realIndex], scene_number: startOffset + index + 1 }
                }
            })
        })

        onReorder(newScenes)
    }

    const isConflict = (act: number | null, number: number) => {
        if (act === null) return false
        return existingScenes.some(s => s.act === act && s.number === number)
    }

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[75vh] min-h-[500px]">
            {/* Left: Acts Board */}
            <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-neutral-900 rounded-lg border border-neutral-800 shadow-inner">
                <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-neutral-700 hover:scrollbar-thumb-neutral-600">

                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDragEnd={handleDragEnd}
                    >
                        {acts.map(act => {
                            const scenesInAct = scannedScenes.filter(s => (s.act_number || 1) === act)

                            return (
                                <div key={act} className="border border-neutral-800 rounded-xl bg-neutral-950 overflow-hidden">
                                    {/* Act Header / Drop Zone */}
                                    <SortableContext
                                        id={`act-${act}`} // This ID helps identify the container
                                        items={scenesInAct.map(s => s._id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <div
                                            className="p-3 bg-neutral-800 border-b border-neutral-700 font-bold text-white flex justify-between items-center"
                                        // Optional: make header a drop zone too?
                                        >
                                            <span>Act {act}</span>
                                            <span className="text-xs text-neutral-400 font-normal">{scenesInAct.length} scenes</span>
                                        </div>
                                        <div className="divide-y divide-neutral-800 min-h-[50px]" id={`act-${act}`}>
                                            {scenesInAct.length === 0 && (
                                                <div className="p-4 text-center text-sm text-neutral-500 italic">
                                                    Drop scenes here
                                                </div>
                                            )}
                                            {scenesInAct.map((scene) => {
                                                // Find true index in main array for updates
                                                const index = scannedScenes.findIndex(s => s._id === scene._id)
                                                const conflict = isConflict(scene.act_number, scene.scene_number)

                                                return (
                                                    <SortableRow
                                                        key={scene._id}
                                                        id={scene._id}
                                                        scene={scene}
                                                        index={index}
                                                        conflict={conflict}
                                                        onUpdate={onUpdate}
                                                        onRemove={onRemove}
                                                        onFocus={() => {
                                                            if (scene.source_index !== undefined) {
                                                                setActiveImageIndex(scene.source_index)
                                                            }
                                                        }}
                                                    />
                                                )
                                            })}
                                        </div>
                                    </SortableContext>
                                </div>
                            )
                        })}

                        <DragOverlay>
                            {activeId ? (
                                <div className="p-3 bg-neutral-800 border border-neutral-600 shadow-2xl rounded opacity-90 text-white">
                                    Moving Scene...
                                </div>
                            ) : null}
                        </DragOverlay>

                    </DndContext>
                </div>
            </div>

            {/* Right: Image Viewer */}
            <div className="lg:w-[40%] xl:w-[45%] flex flex-col border border-neutral-800 rounded-lg bg-neutral-950 flex-shrink-0 h-[400px] lg:h-auto overflow-hidden">
                <div className="p-3 border-b border-neutral-800 flex justify-between items-center bg-neutral-900">
                    <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-purple-400" />
                        <span className="text-sm font-medium text-white">Source Image</span>
                    </div>
                    <div className="flex gap-1 items-center">
                        <button onClick={() => setZoom(z => Math.max(0.2, z - 0.2))} className="p-1.5 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors">
                            <ZoomOut className="w-4 h-4" />
                        </button>
                        <span className="text-xs text-neutral-500 font-mono w-12 text-center">{Math.round(zoom * 100)}%</span>
                        <button onClick={() => setZoom(z => Math.min(3, z + 0.2))} className="p-1.5 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors">
                            <ZoomIn className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto bg-black relative touch-pan-x touch-pan-y cursor-grab active:cursor-grabbing">
                    {imageUrls.length > 0 ? (
                        <div
                            style={{
                                width: `${100 * zoom}%`,
                                minWidth: '100%',
                            }}
                            className="relative mx-auto"
                        >
                            <img
                                src={imageUrls[activeImageIndex]}
                                alt="Source"
                                className="w-full h-auto block select-none pointer-events-none"
                            />
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center text-neutral-600 text-sm">No image available</div>
                    )}
                </div>

                {/* Image Pagination */}
                {imageUrls.length > 1 && (
                    <div className="p-2 border-t border-neutral-800 flex gap-2 overflow-x-auto bg-neutral-900">
                        {imageUrls.map((url, idx) => (
                            <button
                                key={idx}
                                onClick={() => setActiveImageIndex(idx)}
                                className={`w-12 h-12 border rounded-md overflow-hidden flex-shrink-0 transition-all ${activeImageIndex === idx ? 'border-purple-500 opacity-100 scale-105' : 'border-neutral-700 opacity-40 hover:opacity-80'}`}
                            >
                                <img src={url} className="w-full h-full object-cover" />
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

// Sub-component for Sortable Row
function SortableRow({ id, scene, index, conflict, onUpdate, onRemove, onFocus }: any) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`grid grid-cols-[auto_1fr] gap-3 p-3 items-center hover:bg-neutral-800/50 transition-colors bg-neutral-900 group ${conflict ? 'bg-red-900/10' : ''}`}
        >
            {/* Drag Handle */}
            <div className="cursor-move text-neutral-600 group-hover:text-neutral-400 p-1" {...attributes} {...listeners}>
                <GripVertical className="w-5 h-5" />
            </div>

            <div className="flex gap-3 items-center flex-1 min-w-0">
                {/* Scene Number (Auto-generated) */}
                <div className="relative group/number">
                    <div className={`w-12 h-10 flex-shrink-0 bg-neutral-950 border rounded-lg flex items-center justify-center text-white font-mono font-bold text-lg select-none ${conflict ? 'border-red-500 bg-red-900/10 text-red-100' : 'border-neutral-800'}`}>
                        {scene.scene_number}
                    </div>
                    {scene.original_number != scene.scene_number && (
                        <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-neutral-800 text-[10px] text-neutral-400 flex items-center justify-center border border-neutral-700 shadow-sm z-10" title={`Original: ${scene.original_number}`}>
                            !
                        </div>
                    )}
                    {conflict && (
                        <div className="absolute top-full left-0 mt-2 p-2 bg-red-900/90 text-white text-xs rounded shadow-xl z-50 whitespace-nowrap opacity-0 group-hover/number:opacity-100 transition-opacity pointer-events-none">
                            Scene {scene.scene_number} already exists in Act {scene.act_number}
                        </div>
                    )}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0 relative">
                    <input
                        type="text"
                        value={scene.name || ''}
                        onChange={(e) => onUpdate(index, { name: e.target.value })}
                        onFocus={onFocus}
                        placeholder="Scene Name"
                        className="w-full bg-transparent border-b border-transparent focus:border-purple-500 rounded-none px-0 py-1 text-sm text-white focus:outline-none placeholder-neutral-600 transition-colors truncate focus:text-clip"
                    />
                </div>

                {/* Remove */}
                <button
                    onClick={() => onRemove(index)}
                    className="text-neutral-600 hover:text-red-400 p-2 rounded hover:bg-red-900/20 transition-colors"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    )
}
