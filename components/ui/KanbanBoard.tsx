'use client'

import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
    DragOverlay,
    DragOverEvent,
    useDroppable,
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useState, useMemo, useId } from 'react'
import { createPortal } from 'react-dom'

// --- Types ---

export type ColumnId = string | number
export type ItemId = string | number

export interface KanbanItem {
    id: ItemId
    columnId: ColumnId
}

export interface KanbanColumn {
    id: ColumnId
    title?: string
}

interface KanbanBoardProps<T extends KanbanItem> {
    items: T[]
    columns: KanbanColumn[]
    renderItem: (item: T, isOverlay?: boolean) => React.ReactNode
    renderColumnHeader: (column: KanbanColumn, items: T[]) => React.ReactNode
    renderColumnFooter?: (column: KanbanColumn, items: T[]) => React.ReactNode
    onItemReorder: (newItems: T[]) => void
    extraActions?: React.ReactNode
    onValidateMove?: (item: T, targetColumnId: ColumnId) => boolean
}

function DroppableColumn({ id, children, className }: { id: ColumnId, children: React.ReactNode, className?: string }) {
    const { setNodeRef } = useDroppable({ id })
    return <div ref={setNodeRef} className={className}>{children}</div>
}

// --- Component ---

export function KanbanBoard<T extends KanbanItem>({
    items,
    columns,
    renderItem,
    renderColumnHeader,
    renderColumnFooter,
    onItemReorder,
    extraActions,
    onValidateMove
}: KanbanBoardProps<T>) {
    const [activeId, setActiveId] = useState<ItemId | null>(null)

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

    const activeItem = useMemo(() => items.find(i => i.id === activeId), [items, activeId])

    function handleDragStart(event: DragStartEvent) {
        setActiveId(event.active.id as ItemId)
    }

    function handleDragOver(event: DragOverEvent) {
        const { active, over } = event
        if (!over) return

        const activeId = active.id as ItemId
        const overId = over.id as ItemId

        const activeItem = items.find(i => i.id === activeId)
        const overItem = items.find(i => i.id === overId)

        if (!activeItem) return

        // 1. Dropping over a Column
        const isOverColumn = columns.some(c => c.id === overId)

        if (isOverColumn) {
            const overColumnId = overId as ColumnId
            if (activeItem.columnId !== overColumnId) {
                // VALIDATION CHECK
                if (onValidateMove && !onValidateMove(activeItem, overColumnId)) {
                    return
                }

                const newItems = items.map(item => {
                    if (item.id === activeItem.id) {
                        return { ...item, columnId: overColumnId }
                    }
                    return item
                })
                onItemReorder(newItems)
            }
        }
        // 2. Dropping over another Item in a different column
        else if (overItem && activeItem.columnId !== overItem.columnId) {
            // VALIDATION CHECK
            if (onValidateMove && !onValidateMove(activeItem, overItem.columnId)) {
                return
            }

            const newItems = items.map(item => {
                if (item.id === activeItem.id) {
                    return { ...item, columnId: overItem.columnId }
                }
                return item
            })
            onItemReorder(newItems)
        }
    }

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event
        const activeId = active.id as ItemId
        const overId = over ? (over.id as ItemId) : null

        setActiveId(null)

        if (!over || !overId) return

        const activeItem = items.find(i => i.id === activeId)
        if (!activeItem) return

        const isOverColumn = columns.some(c => c.id === overId)

        let newItems = [...items]

        if (isOverColumn) {
            const colId = overId as ColumnId
            if (activeItem.columnId !== colId) {
                // VALIDATION CHECK
                if (onValidateMove && !onValidateMove(activeItem, colId)) {
                    return
                }

                newItems = newItems.map(i => i.id === activeId ? { ...i, columnId: colId } : i)
            }
        } else {
            const overItem = items.find(i => i.id === overId)
            if (overItem) {
                const oldIndex = newItems.findIndex(i => i.id === activeId)
                const newIndex = newItems.findIndex(i => i.id === overId)

                if (newItems[oldIndex].columnId !== overItem.columnId) {
                    // VALIDATION CHECK
                    if (onValidateMove && !onValidateMove(activeItem, overItem.columnId)) {
                        return
                    }
                    newItems[oldIndex] = { ...newItems[oldIndex], columnId: overItem.columnId }
                }

                newItems = arrayMove(newItems, oldIndex, newIndex)
            }
        }

        onItemReorder(newItems)
    }

    const dndContextId = useId()

    return (
        <DndContext
            id={dndContextId}
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="flex flex-col lg:flex-row flex-wrap items-start gap-6 pb-6 w-full max-w-full">
                {columns.map(col => {
                    const colItems = items.filter(i => i.columnId === col.id)
                    return (
                        <div key={`col-${col.id}`} className="w-full lg:w-[320px] flex flex-col">
                            {renderColumnHeader(col, colItems)}

                            <DroppableColumn id={col.id} className="flex-1 mt-2 min-h-[100px]">
                                <SortableContext
                                    id={String(col.id)}
                                    items={colItems.map(i => i.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <div className="space-y-2">
                                        {colItems.map(item => renderItem(item, false))}
                                    </div>
                                    {colItems.length === 0 && (
                                        <div className="h-24 border-2 border-dashed border-neutral-800/50 rounded-lg bg-neutral-900/20 flex items-center justify-center text-neutral-600 text-sm">
                                            Upuść tutaj
                                        </div>
                                    )}
                                </SortableContext>
                            </DroppableColumn>

                            {renderColumnFooter && (
                                <div className="mt-2">
                                    {renderColumnFooter(col, colItems)}
                                </div>
                            )}
                        </div>
                    )
                })}

                {extraActions && (
                    <div key="extra-actions" className="w-full lg:w-auto">
                        {extraActions}
                    </div>
                )}
            </div>

            {typeof document !== 'undefined' && createPortal(
                <DragOverlay>
                    {activeItem ? renderItem(activeItem, true) : null}
                </DragOverlay>,
                document.body
            )}
        </DndContext>
    )
}
