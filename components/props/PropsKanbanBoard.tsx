'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
    DragStartEvent,
    DragEndEvent,
    DragOverEvent,
    useDroppable,
    DropAnimation,
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2, Check, X, Edit2 } from 'lucide-react'
import { updatePropPosition, updatePropName, updatePropStatus, deleteProp } from '@/app/actions/performance-props'
import { notify } from '@/utils/notify'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'react-hot-toast'

type Prop = {
    id: string
    item_name: string
    is_checked: boolean | null
    created_at: string | null
    performance_id: string
    sort_order?: number | null
    column_index?: number | null
}

type Props = {
    performanceId: string
    initialProps: Prop[]
    variant?: 'manage' | 'checklist'
    onDelete?: (id: string) => void
}

const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
        styles: {
            active: {
                opacity: '0.5',
            },
        },
    }),
}

function SortablePropItem({
    prop,
    isOverlay,
    variant,
    onToggleCheck,
    onDelete,
    onUpdateName
}: {
    prop: Prop
    isOverlay?: boolean
    variant: 'manage' | 'checklist'
    onToggleCheck?: (id: string, current: boolean) => void
    onDelete?: (id: string) => void
    onUpdateName?: (id: string, name: string) => void
}) {
    const [isEditing, setIsEditing] = useState(false)
    const [tempName, setTempName] = useState(prop.item_name)

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: prop.id, disabled: isEditing })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    }

    const handleBlur = () => {
        setIsEditing(false)
        if (tempName !== prop.item_name && tempName.trim()) {
            onUpdateName?.(prop.id, tempName.trim())
        } else {
            setTempName(prop.item_name)
        }
    }

    if (isOverlay) {
        return (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-neutral-600 bg-neutral-800 shadow-2xl">
                <GripVertical className="w-4 h-4 text-neutral-400" />
                <span className="text-white font-medium">{prop.item_name}</span>
            </div>
        )
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="group flex items-center gap-3 p-3 rounded-lg border border-neutral-800 bg-neutral-900/60 hover:border-neutral-700 transition-all mb-2 touch-manipulation"
        >
            <div {...attributes} {...listeners} className="cursor-grab text-neutral-600 hover:text-neutral-400 p-1">
                <GripVertical className="w-4 h-4" />
            </div>

            {variant === 'checklist' && (
                <button
                    onClick={(e) => {
                        e.stopPropagation() // Prevent drag start interference if clicked carefully? actually listener is on grip
                        onToggleCheck?.(prop.id, prop.is_checked || false)
                    }}
                    className={`flex-shrink-0 h-5 w-5 rounded border-2 flex items-center justify-center transition-all ${prop.is_checked
                        ? 'border-transparent bg-burgundy-main'
                        : 'border-neutral-600 hover:border-neutral-500'
                        }`}
                >
                    {prop.is_checked && <Check className="h-3 w-3 text-white" />}
                </button>
            )}

            <div className="flex-1 min-w-0">
                {isEditing ? (
                    <input
                        type="text"
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        onBlur={handleBlur}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleBlur()
                            if (e.key === 'Escape') {
                                setTempName(prop.item_name)
                                setIsEditing(false)
                            }
                        }}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-0.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                        autoFocus
                    />
                ) : (
                    <span
                        onClick={() => {
                            if (variant === 'manage') {
                                setTempName(prop.item_name)
                                setIsEditing(true)
                            }
                        }}
                        className={`block w-full text-sm font-medium truncate ${variant === 'manage' ? 'cursor-text hover:text-amber-400 transition-colors' : ''} ${variant === 'checklist' && prop.is_checked ? 'text-neutral-500 line-through' : 'text-white'
                            }`}
                    >
                        {prop.item_name}
                    </span>
                )}
            </div>

            {variant === 'manage' && !isEditing && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => onDelete?.(prop.id)}
                        className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}
        </div>
    )
}

export function PropsKanbanBoard({ performanceId, initialProps, variant = 'checklist', onDelete }: Props) {
    const [props, setProps] = useState<Prop[]>(initialProps)
    const [activeId, setActiveId] = useState<string | null>(null)
    const pendingUpdates = useRef<Record<string, { column_index: number; sort_order: number }>>({})
    const saveTimeout = useRef<NodeJS.Timeout | null>(null)

    // Ensure we have correct initial state distribution
    // Fallback: if no column_index, distribute evenly or put in 0?
    // Let's rely on DB default 0.

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

    useEffect(() => {
        setProps(initialProps)
    }, [initialProps])

    const columns = useMemo(() => {
        const cols: Record<number, Prop[]> = { 0: [], 1: [] }

        // Sort by index first, then sort_order
        // But what if old items don't have sort_order? created_at fallback
        const sorted = [...props].sort((a, b) => {
            const orderA = a.sort_order ?? 0
            const orderB = b.sort_order ?? 0
            if (orderA !== orderB) return orderA - orderB
            return new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime()
        })

        sorted.forEach(p => {
            const col = p.column_index ?? 0
            // Clamp to 0 or 1
            const safeCol = col > 1 ? 0 : col
            if (cols[safeCol]) cols[safeCol].push(p)
            else cols[0].push(p) // Fallback
        })

        return cols
    }, [props])


    const saveChanges = async () => {
        const updates = pendingUpdates.current
        const ids = Object.keys(updates)
        if (ids.length === 0) return

        console.log('Saving prop positions:', ids.length)

        // Clear pending immediately to avoid double save
        pendingUpdates.current = {}

        try {
            await Promise.all(ids.map(id => updatePropPosition(id, performanceId, updates[id])))
        } catch (e) {
            console.error('Failed to save prop positions', e)
            toast.error('Błąd zapisu pozycji')
        }
    }

    const scheduleSave = () => {
        if (saveTimeout.current) clearTimeout(saveTimeout.current)
        saveTimeout.current = setTimeout(saveChanges, 2000) // 2 sec debounce
    }

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string)
    }

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event
        if (!over) return

        const activeId = active.id as string
        const overId = over.id as string

        // Find containers
        const findContainer = (id: string) => {
            if (id === 'col-0') return 0
            if (id === 'col-1') return 1
            const p = props.find(i => i.id === id)
            return p?.column_index ?? 0
        }

        const activeContainer = findContainer(activeId)
        const overContainer = findContainer(overId)

        if (activeContainer !== overContainer) {
            setProps((items) => {
                const activeItems = items.filter(i => (i.column_index ?? 0) === activeContainer)
                const overItems = items.filter(i => (i.column_index ?? 0) === overContainer)

                const activeIndex = activeItems.findIndex(i => i.id === activeId)
                const overIndex = overItems.findIndex(i => i.id === overId)

                let newIndex: number
                if (overId === `col-${overContainer}`) {
                    newIndex = overItems.length + 1
                } else {
                    const isBelowOverItem = over &&
                        active.rect.current.translated &&
                        active.rect.current.translated.top > over.rect.top + over.rect.height;

                    const modifier = isBelowOverItem ? 1 : 0;
                    newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
                }

                return items.map(item => {
                    if (item.id === activeId) {
                        return {
                            ...item,
                            column_index: overContainer,
                            sort_order: newIndex
                        }
                    }
                    return item
                })
            })
        }
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        setActiveId(null)

        if (!over) return

        const activeId = active.id as string
        const overId = over.id as string

        const findContainer = (id: string) => {
            if (id === 'col-0') return 0
            if (id === 'col-1') return 1 // Fixed typo
            const p = props.find(i => i.id === id)
            // Clamp
            const idx = p?.column_index ?? 0
            return idx > 1 ? 0 : idx
        }

        const activeContainer = findContainer(activeId)
        const overContainer = findContainer(overId)

        if (activeContainer === overContainer) {
            // Reorder within same column
            const containerProps = columns[activeContainer as 0 | 1]
            const oldIndex = containerProps.findIndex(i => i.id === activeId)
            const newIndex = containerProps.findIndex(i => i.id === overId)

            if (oldIndex !== newIndex) {
                const newOrder = arrayMove(containerProps, oldIndex, newIndex)

                // Update global props state
                setProps(prev => {
                    const otherProps = prev.filter(p => (p.column_index ?? 0) !== activeContainer)
                    // Reassign sort orders
                    const updatedContainerProps = newOrder.map((p, idx) => ({
                        ...p,
                        sort_order: idx
                    }))

                    // Add to pending updates
                    updatedContainerProps.forEach(p => {
                        pendingUpdates.current[p.id] = {
                            column_index: activeContainer,
                            sort_order: p.sort_order!
                        }
                    })
                    scheduleSave()

                    return [...otherProps, ...updatedContainerProps]
                })
            }
        } else {
            // Moved between columns (handled in dragOver mostly, just finalize sort orders here)
            // Re-normalize sort orders in target column
            const targetColProps = props
                .filter(p => (p.column_index ?? 0) === overContainer)
                .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

            // Add updates for all items in target column to ensure consistency
            targetColProps.forEach((p, idx) => {
                if (p.sort_order !== idx) {
                    pendingUpdates.current[p.id] = {
                        column_index: overContainer,
                        sort_order: idx
                    }
                }
            })
            // Also need to update the moved item specifically if not caught
            const movedItem = props.find(p => p.id === activeId)
            if (movedItem) {
                pendingUpdates.current[movedItem.id] = {
                    column_index: overContainer,
                    sort_order: movedItem.sort_order ?? 0 // Should have been set in dragOver
                }
            }
            scheduleSave()
        }
    }

    const handleUpdateName = async (id: string, name: string) => {
        // Optimistic
        setProps(prev => prev.map(p => p.id === id ? { ...p, item_name: name } : p))

        try {
            await updatePropName(id, name, performanceId)
            toast.success('Zaktualizowano nazwę')
        } catch (e) {
            toast.error('Błąd aktualizacji')
        }
    }

    const handleToggleCheck = async (id: string, current: boolean) => {
        setProps(prev => prev.map(p => p.id === id ? { ...p, is_checked: !current } : p))

        try {
            await updatePropStatus(id, !current)
        } catch (e) {
            toast.error('Błąd aktualizacji checkboxa')
            // Revert
            setProps(prev => prev.map(p => p.id === id ? { ...p, is_checked: current } : p))
        }
    }

    // Droppable Column
    const Column = ({ id, items }: { id: string | number, items: Prop[] }) => {
        const { setNodeRef } = useDroppable({ id: `col-${id}` })

        return (
            <div ref={setNodeRef} className="flex flex-col gap-2 min-h-[200px] bg-neutral-900/20 rounded-xl p-2 border border-neutral-800/50">
                <SortableContext
                    id={`col-${id}`}
                    items={items.map(i => i.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {items.map(prop => (
                        <SortablePropItem
                            key={prop.id}
                            prop={prop}
                            variant={variant}
                            onToggleCheck={handleToggleCheck}
                            onDelete={onDelete}
                            onUpdateName={handleUpdateName}
                        />
                    ))}
                    {items.length === 0 && (
                        <div className="flex-1 flex items-center justify-center text-neutral-600 text-sm border-2 border-dashed border-neutral-800/50 rounded-lg p-4">
                            Pusta kolumna
                        </div>
                    )}
                </SortableContext>
            </div>
        )
    }

    const activeProp = useMemo(() => props.find(p => p.id === activeId), [activeId, props])

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Column id={0} items={columns[0]} />
                <Column id={1} items={columns[1]} />
            </div>

            <DragOverlay dropAnimation={dropAnimation}>
                {activeProp ? (
                    <SortablePropItem
                        prop={activeProp}
                        isOverlay
                        variant={variant}
                    />
                ) : null}
            </DragOverlay>
        </DndContext>
    )
}
