'use client'

import { useState, useMemo, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Loader2, Package, GripVertical, CheckSquare, Square, User, MoreHorizontal, ChevronDown, Camera, List } from 'lucide-react'
import { ItemSelectionDialog } from './ItemSelectionDialog'
import NextImage from 'next/image'
import { ItemIcon } from '@/components/ui/ItemIcon'
import { useTranslations } from 'next-intl'
import { Database } from '@/types/supabase'
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
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Menu, Transition } from '@headlessui/react'
import { Fragment } from 'react'

type ItemRow = Database['public']['Tables']['items']['Row']

type Assignment = {
    id: string
    item_id: string
    scene_number: string | null
    scene_name: string | null
    setup_instructions: string | null
    sort_order: number | null
    assigned_to: string | null
    items: ItemRow | null // Join result
}

type Scene = {
    id: string
    scene_number: number
    name: string | null
    act_number: number
}

type Profile = {
    id: string
    full_name: string | null
    avatar_url: string | null
}

import { ItemDetailsDialog } from '@/components/items/ItemDetailsDialog'

type Props = {
    performanceId: string
    initialAssignments: Assignment[]
    availableItems: ItemRow[]
    definedScenes: Scene[]
    accentColor?: string | null
    profiles: Profile[]
    locations: Database['public']['Tables']['locations']['Row'][]
    groups: Database['public']['Tables']['groups']['Row'][]
}

// Sortable Item Component
function SortableItem({
    assignment,
    isSelected,
    onToggleSelect,
    onDelete,
    accentColor,
    profile,
    onItemClick
}: {
    assignment: Assignment
    isSelected: boolean
    onToggleSelect: (id: string) => void
    onDelete: (id: string) => void
    accentColor?: string | null
    profile?: Profile | null
    onItemClick: (item: ItemRow) => void
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: assignment.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center justify-between p-3 bg-neutral-900 rounded-lg border transition-colors group ${isSelected ? 'border-burgundy-main bg-burgundy-main/20' : 'border-neutral-800 hover:border-neutral-700'
                }`}
        >
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <div
                    {...attributes}
                    {...listeners}
                    className="cursor-grab active:cursor-grabbing p-1 text-neutral-600 hover:text-neutral-400"
                >
                    <GripVertical className="h-4 w-4 touch-none" />
                </div>
                <button
                    onClick={() => onToggleSelect(assignment.id)}
                    className="text-neutral-500 hover:text-white transition-colors"
                >
                    {isSelected ? (
                        <CheckSquare className="h-5 w-5 text-burgundy-main" />
                    ) : (
                        <Square className="h-5 w-5" />
                    )}
                </button>
                <div
                    className="h-10 w-10 flex-shrink-0 relative bg-neutral-800 rounded overflow-hidden flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => assignment.items && onItemClick(assignment.items)}
                >
                    {assignment.items?.image_url ? (
                        <NextImage src={assignment.items.image_url} alt="" fill className="object-cover" unoptimized />
                    ) : (
                        <ItemIcon name={assignment.items?.name || ''} className="h-5 w-5 text-neutral-600" />
                    )}
                </div>
                <div className="min-w-0 flex-1 cursor-pointer" onClick={() => assignment.items && onItemClick(assignment.items)}>
                    <div className="text-sm font-medium text-white truncate hover:text-action-primary transition-colors">{assignment.items?.name || 'Unknown Item'}</div>
                    <div className="flex items-center gap-2 text-xs text-neutral-500">

                        {profile && (
                            <div className="flex items-center gap-1 bg-neutral-800 px-1.5 py-0.5 rounded-full">
                                {profile.avatar_url ? (
                                    <div className="relative h-3 w-3 rounded-full overflow-hidden">
                                        <NextImage src={profile.avatar_url} alt="" fill className="object-cover" unoptimized />
                                    </div>
                                ) : (
                                    <User className="h-3 w-3" />
                                )}
                                <span className="truncate max-w-[100px]">{profile.full_name || 'User'}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <button
                onClick={() => onDelete(assignment.id)}
                className="text-neutral-500 hover:text-red-400 p-2 transition-colors opacity-0 group-hover:opacity-100"
            >
                <Trash2 className="h-4 w-4" />
            </button>
        </div>
    )
}

// Droppable Container Component
function DroppableContainer({ id, children, className }: { id: string, children: React.ReactNode, className?: string }) {
    const { setNodeRef } = useDroppable({ id })

    return (
        <div ref={setNodeRef} className={className}>
            {children}
        </div>
    )
}

export function ManagePropsForm({ performanceId, initialAssignments, availableItems, definedScenes, accentColor, profiles, locations, groups }: Props) {
    const t = useTranslations('ManagePropsForm')
    const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments)
    const [loading, setLoading] = useState(false)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
    const [activeId, setActiveId] = useState<string | null>(null)

    // Track which scene we are adding to. null means unassigned.
    const [targetScene, setTargetScene] = useState<{ number: string | null, name: string | null } | null>(null)

    const router = useRouter()
    const supabase = createClient()

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

    const [selectedDetailItem, setSelectedDetailItem] = useState<ItemRow | null>(null)
    const [isDetailsOpen, setIsDetailsOpen] = useState(false)

    const handleItemClick = (item: ItemRow) => {
        setSelectedDetailItem(item)
        setIsDetailsOpen(true)
    }

    // Group assignments by scene
    const groupedAssignments = useMemo(() => {
        const groups: Record<string, Assignment[]> = {}
        // Initialize groups for all defined scenes
        definedScenes.forEach(scene => {
            const key = scene.scene_number.toString()
            groups[key] = []
        })
        // Add "unassigned" group
        groups['unassigned'] = []

        // Distribute assignments
        assignments.forEach(a => {
            const key = a.scene_number ? a.scene_number.toString() : 'unassigned'
            if (!groups[key]) groups[key] = []
            groups[key].push(a)
        })

        // Sort by sort_order within groups
        Object.keys(groups).forEach(key => {
            groups[key].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        })

        return groups
    }, [assignments, definedScenes])

    const handleOpenAddDialog = (sceneNumber: string | null, sceneName: string | null) => {
        setTargetScene({ number: sceneNumber, name: sceneName })
        setIsDialogOpen(true)
    }

    const handleMultiAdd = async (selectedIds: string[]) => {
        if (selectedIds.length === 0) return

        setLoading(true)
        try {
            // Get max sort order for the target scene
            const targetKey = targetScene?.number || 'unassigned'
            const currentItems = groupedAssignments[targetKey] || []
            const maxSortOrder = currentItems.length > 0 ? Math.max(...currentItems.map(i => i.sort_order || 0)) : 0

            const newAssignmentsData = selectedIds.map((itemId, index) => ({
                performance_id: performanceId,
                item_id: itemId,
                scene_number: targetScene?.number || null,
                scene_name: targetScene?.name || null,
                setup_instructions: null,
                sort_order: maxSortOrder + index + 1
            }))

            const { data, error } = await supabase
                .from('performance_items')
                .insert(newAssignmentsData)
                .select(`
          *,
          items (*)
        `)

            if (error) throw error

            // Update items status
            await supabase
                .from('items')
                .update({
                    performance_status: 'active' as Database['public']['Enums']['item_performance_status_enum'],
                    status: 'active' as Database['public']['Enums']['item_status_enum']
                })
                .in('id', selectedIds)

            // Optimistic update
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const newAssignments: Assignment[] = (data as unknown as any[]).map(d => ({
                ...d,
                items: d.items as ItemRow
            }))

            setAssignments([...assignments, ...newAssignments])
            router.refresh()
        } catch (error) {
            console.error('Error adding props:', error)
            alert(t('addError'))
        } finally {
            setLoading(false)
            setIsDialogOpen(false)
            setTargetScene(null)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm(t('deleteConfirm'))) return

        try {
            const { error } = await supabase
                .from('performance_items')
                .delete()
                .eq('id', id)

            if (error) throw error

            setAssignments(assignments.filter(a => a.id !== id))
            setSelectedItems(prev => {
                const next = new Set(prev)
                next.delete(id)
                return next
            })
            router.refresh()
        } catch (error) {
            console.error('Error deleting prop:', error)
            alert(t('deleteError'))
        }
    }

    const handleToggleSelect = (id: string) => {
        setSelectedItems(prev => {
            const next = new Set(prev)
            if (next.has(id)) {
                next.delete(id)
            } else {
                next.add(id)
            }
            return next
        })
    }

    const handleBulkAssign = async (userId: string) => {
        if (selectedItems.size === 0) return

        try {
            const { error } = await supabase
                .from('performance_items')
                .update({ assigned_to: userId })
                .in('id', Array.from(selectedItems))

            if (error) throw error

            setAssignments(assignments.map(a =>
                selectedItems.has(a.id) ? { ...a, assigned_to: userId } : a
            ))
            setSelectedItems(new Set())
            router.refresh()
        } catch (error) {
            console.error('Error assigning props:', error)
            alert(t('updateError'))
        }
    }

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string)
    }

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event
        if (!over) return

        // Find the containers
        const activeContainer = findContainer(active.id as string)
        const overContainer = findContainer(over.id as string) || (over.data.current?.sortable?.containerId) || over.id

        if (!activeContainer || !overContainer || activeContainer === overContainer) {
            return
        }

        // If moving to a different container, we update the state immediately for visual feedback
        // This is handled by onDragEnd for final persistence, but we could do optimistic updates here if needed
    }

    const findContainer = (id: string) => {
        if (id in groupedAssignments) return id
        return Object.keys(groupedAssignments).find(key =>
            groupedAssignments[key].find(item => item.id === id)
        )
    }

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event
        setActiveId(null)

        if (!over) return

        const activeContainer = findContainer(active.id as string)
        const overContainer = findContainer(over.id as string) || (over.data.current?.sortable?.containerId) || over.id

        if (!activeContainer || !overContainer) return

        const activeIndex = groupedAssignments[activeContainer].findIndex(item => item.id === active.id)
        const overIndex = groupedAssignments[overContainer].findIndex(item => item.id === over.id)

        let newAssignments = [...assignments]
        let movedItems: Assignment[] = []

        // Determine which items are being moved
        // If the dragged item is selected, move all selected items
        // Otherwise, just move the dragged item
        const isDraggingSelected = selectedItems.has(active.id as string)
        const itemsToMoveIds = isDraggingSelected ? Array.from(selectedItems) : [active.id as string]

        // Filter out items that are not in the active container (sanity check)
        const validItemsToMoveIds = itemsToMoveIds.filter(id =>
            groupedAssignments[activeContainer].some(item => item.id === id)
        )

        if (activeContainer === overContainer) {
            // Reordering within the same container
            if (activeIndex !== overIndex) {
                // We only support reordering single items or contiguous blocks for now in a simple way
                // For simplicity in this iteration, if multiple items are selected, we just move them to the target position
                // But standard sortable behavior is usually single item.
                // Let's stick to single item reordering if not moving between containers, OR handle multi-move carefully.
                // For now: standard reorder for the dragged item.
                // If multiple selected, we might want to just reorder the dragged one, or move all to that position.
                // Let's implement: Move all selected items to the new position.

                const oldIndex = activeIndex
                const newIndex = overIndex

                // Remove items from old positions
                const itemsToMove = validItemsToMoveIds.map(id => newAssignments.find(a => a.id === id)!).filter(Boolean)
                newAssignments = newAssignments.filter(a => !validItemsToMoveIds.includes(a.id))

                // Insert at new position
                // We need to find where to insert in the global array based on the target container's items
                const targetContainerItems = groupedAssignments[overContainer]
                const targetItem = targetContainerItems[newIndex] // This is the item we dropped ON

                // If we dropped on an item, we want to insert before or after it.
                // But since we removed items, indices might have shifted.
                // Easier approach: Reconstruct the container's list, then update global list.

                let newContainerList = [...groupedAssignments[overContainer]]
                // Remove moved items from this list (if they were there)
                newContainerList = newContainerList.filter(a => !validItemsToMoveIds.includes(a.id))

                // Calculate insert index in the cleaned list
                let insertIndex = newIndex
                if (oldIndex < newIndex) {
                    // If moving down, we need to adjust because we removed items
                    // However, overIndex is based on the list WITH the items.
                    // It's complicated. Let's use arrayMove for single item, and custom logic for multiple.
                }

                // SIMPLIFICATION: If multiple items selected, just move them to the end of the target container if different,
                // or just reorder the single dragged item if same container.
                if (validItemsToMoveIds.length > 1 && activeContainer === overContainer) {
                    // Multi-item reorder in same container is complex UX. Let's just reorder the dragged item for now.
                    newAssignments = arrayMove(assignments,
                        assignments.findIndex(a => a.id === active.id),
                        assignments.findIndex(a => a.id === over.id)
                    )
                } else {
                    // Single item reorder
                    const oldGlobalIndex = assignments.findIndex(a => a.id === active.id)
                    const newGlobalIndex = assignments.findIndex(a => a.id === over.id)
                    newAssignments = arrayMove(assignments, oldGlobalIndex, newGlobalIndex)
                }
            }
        } else {
            // Moving to a different container
            const targetSceneNumber = overContainer === 'unassigned' ? null : overContainer
            const targetSceneName = definedScenes.find(s => s.scene_number.toString() === targetSceneNumber)?.name || null

            newAssignments = newAssignments.map(item => {
                if (validItemsToMoveIds.includes(item.id)) {
                    return {
                        ...item,
                        scene_number: targetSceneNumber,
                        scene_name: targetSceneName,
                        // We will update sort_order later
                    }
                }
                return item
            })
        }

        // Update sort orders for the affected containers
        // We need to re-calculate sort orders for everything to be safe
        // But mainly active and over containers.

        // Let's optimistic update state first
        setAssignments(newAssignments)

        // Now prepare DB updates
        // We need to update scene_number, scene_name, and sort_order for moved items
        // And update sort_order for other items in the affected containers

        // Re-group to calculate new sort orders
        const newGroups: Record<string, Assignment[]> = {}
        definedScenes.forEach(s => newGroups[s.scene_number.toString()] = [])
        newGroups['unassigned'] = []

        newAssignments.forEach(a => {
            const key = a.scene_number ? a.scene_number.toString() : 'unassigned'
            if (!newGroups[key]) newGroups[key] = []
            newGroups[key].push(a)
        })

        // Sort each group by existing sort_order to maintain relative order of untouched items
        // But for the moved items, we want them in the new position.
        // This is tricky with the simple state update above.
        // For MVP: Just update the scene_number for moved items, and append them to the end of the list (or keep relative order).
        // If we want precise drop position, we need to handle the array insertion correctly.

        // Let's refine the "Move to different container" logic to insert at specific index
        if (activeContainer !== overContainer) {
            // We already updated scene_number in newAssignments.
            // But we didn't handle the specific index insertion.
            // For now, let's just let them fall into the list and rely on a re-sort if needed.
            // Or better: Update sort_order based on the new list order.
        }

        // Prepare bulk update
        const updates = []

        // We only really need to update items in activeContainer and overContainer
        const containersToUpdate = new Set([activeContainer, overContainer])

        // For each container, recalculate sort_order
        // Note: The `newAssignments` array might not be sorted correctly by visual order yet if we just mapped it.
        // We need to ensure the visual order is reflected.
        // Since we didn't do complex array insertion for cross-container move in `newAssignments` construction above (just map),
        // the items will stay in their relative global positions but change groups.
        // This means they will likely appear at the end or in some default order.
        // To fix this, we should have manipulated the arrays.

        // CORRECT APPROACH for Cross-Container:
        // 1. Remove from source array
        // 2. Insert into target array at overIndex
        // 3. Flatten back to global array

        if (activeContainer !== overContainer) {
            const sourceList = groupedAssignments[activeContainer].filter(a => !validItemsToMoveIds.includes(a.id))
            const targetList = [...groupedAssignments[overContainer]]
            const itemsToMove = validItemsToMoveIds.map(id => assignments.find(a => a.id === id)!).map(item => ({
                ...item,
                scene_number: overContainer === 'unassigned' ? null : overContainer,
                scene_name: definedScenes.find(s => s.scene_number.toString() === overContainer)?.name || null
            }))

            // Insert at overIndex
            // If overIndex is -1 (dropped on container but not specific item), append
            const insertAt = overIndex >= 0 ? overIndex : targetList.length
            targetList.splice(insertAt, 0, ...itemsToMove)

            // Now rebuild assignments
            const otherAssignments = assignments.filter(a =>
                (a.scene_number?.toString() || 'unassigned') !== activeContainer &&
                (a.scene_number?.toString() || 'unassigned') !== overContainer
            )

            // Update sort orders
            const updatedSource = sourceList.map((a, i) => ({ ...a, sort_order: i }))
            const updatedTarget = targetList.map((a, i) => ({ ...a, sort_order: i }))

            newAssignments = [...otherAssignments, ...updatedSource, ...updatedTarget]
            setAssignments(newAssignments)

            // DB Updates
            const itemsToUpdate = [...updatedSource, ...updatedTarget]
            for (const item of itemsToUpdate) {
                updates.push({
                    id: item.id,
                    item_id: item.item_id,
                    performance_id: performanceId,
                    scene_number: item.scene_number,
                    scene_name: item.scene_name,
                    sort_order: item.sort_order
                })
            }
        } else {
            // Same container reorder
            // We used arrayMove on the global list, but we should verify sort orders within the container
            const containerList = newAssignments.filter(a => (a.scene_number?.toString() || 'unassigned') === activeContainer)
            const updatedContainer = containerList.map((a, i) => ({ ...a, sort_order: i }))

            // Merge back
            const otherAssignments = newAssignments.filter(a => (a.scene_number?.toString() || 'unassigned') !== activeContainer)
            newAssignments = [...otherAssignments, ...updatedContainer]
            setAssignments(newAssignments)

            for (const item of updatedContainer) {
                updates.push({
                    id: item.id,
                    item_id: item.item_id,
                    performance_id: performanceId,
                    sort_order: item.sort_order
                })
            }
        }

        // Execute DB updates
        if (updates.length > 0) {
            try {
                const { error } = await supabase
                    .from('performance_items')
                    .upsert(updates) // upsert is good for batch updates by ID

                if (error) throw error
            } catch (error) {
                console.error('Error updating sort order:', error)
                // Revert state if needed (omitted for brevity)
            }
        }
    }

    const renderAssignmentList = (id: string, items: Assignment[]) => {
        return (
            <SortableContext
                id={id}
                items={items.map(i => i.id)}
                strategy={verticalListSortingStrategy}
            >
                <DroppableContainer id={id} className="space-y-2 min-h-[50px]">
                    {items.map((assignment) => (
                        <SortableItem
                            key={assignment.id}
                            assignment={assignment}
                            isSelected={selectedItems.has(assignment.id)}
                            onToggleSelect={handleToggleSelect}
                            onDelete={handleDelete}
                            accentColor={accentColor}
                            profile={profiles.find(p => p.id === assignment.assigned_to)}
                            onItemClick={handleItemClick}
                        />
                    ))}
                    {items.length === 0 && (
                        <div className="text-sm text-neutral-500 italic py-4 text-center border border-dashed border-neutral-800 rounded-lg">
                            {t('dropHere')}
                        </div>
                    )}
                </DroppableContainer>
            </SortableContext>
        )
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="space-y-8 pb-20">
                <ItemSelectionDialog
                    isOpen={isDialogOpen}
                    onClose={() => setIsDialogOpen(false)}
                    onConfirm={handleMultiAdd}
                    items={availableItems}
                    accentColor={accentColor}
                />

                <ItemDetailsDialog
                    item={selectedDetailItem as Database['public']['Tables']['items']['Row'] | null}
                    isOpen={isDetailsOpen}
                    onClose={() => setIsDetailsOpen(false)}
                    onEdit={() => { }} // Read-only or implement edit if needed
                    locations={locations}
                    groups={groups}
                />

                {/* Bulk Actions Toolbar */}
                <Transition
                    show={selectedItems.size > 0}
                    as={Fragment}
                    enter="transition ease-out duration-200"
                    enterFrom="opacity-0 translate-y-10"
                    enterTo="opacity-100 translate-y-0"
                    leave="transition ease-in duration-150"
                    leaveFrom="opacity-100 translate-y-0"
                    leaveTo="opacity-0 translate-y-10"
                >
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 border border-neutral-700 rounded-full shadow-2xl px-6 py-3 flex items-center gap-4">
                        <div className="text-sm font-medium text-white whitespace-nowrap">
                            {t('selectedCount', { count: selectedItems.size })}
                        </div>
                        <div className="h-4 w-px bg-neutral-700" />
                        <Menu as="div" className="relative">
                            <Menu.Button className="flex items-center gap-2 text-sm font-medium text-neutral-300 hover:text-white transition-colors">
                                <User className="h-4 w-4" />
                                {t('assignTo')}
                            </Menu.Button>
                            <Transition
                                as={Fragment}
                                enter="transition ease-out duration-100"
                                enterFrom="transform opacity-0 scale-95"
                                enterTo="transform opacity-100 scale-100"
                                leave="transition ease-in duration-75"
                                leaveFrom="transform opacity-100 scale-100"
                                leaveTo="transform opacity-0 scale-95"
                            >
                                <Menu.Items className="absolute bottom-full left-0 mb-2 w-56 origin-bottom-left rounded-md bg-neutral-800 border border-neutral-700 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none max-h-60 overflow-y-auto">
                                    <div className="p-1">
                                        {profiles.map((profile) => (
                                            <Menu.Item key={profile.id}>
                                                {({ active }) => (
                                                    <button
                                                        onClick={() => handleBulkAssign(profile.id)}
                                                        className={`${active ? 'bg-neutral-700 text-white' : 'text-neutral-300'
                                                            } group flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm`}
                                                    >
                                                        {profile.avatar_url ? (
                                                            <div className="relative h-5 w-5 rounded-full overflow-hidden">
                                                                <NextImage src={profile.avatar_url} alt="" fill className="object-cover" unoptimized />
                                                            </div>
                                                        ) : (
                                                            <User className="h-4 w-4" />
                                                        )}
                                                        {profile.full_name || 'User'}
                                                    </button>
                                                )}
                                            </Menu.Item>
                                        ))}
                                    </div>
                                </Menu.Items>
                            </Transition>
                        </Menu>
                        <div className="h-4 w-px bg-neutral-700" />
                        <button
                            onClick={() => setSelectedItems(new Set())}
                            className="text-sm font-medium text-neutral-400 hover:text-white transition-colors"
                        >
                            {t('cancel')}
                        </button>
                    </div>
                </Transition>

                {/* Unassigned Items Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-white flex items-center gap-2">
                            <Package className="h-5 w-5 text-neutral-400" />
                            {t('unassignedItems')}
                        </h3>
                        <Menu as="div" className="relative">
                            <Menu.Button
                                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 rounded-md transition-colors"
                            >
                                <Plus className="h-4 w-4" />
                                <span className="hidden sm:inline">{t('addProp')}</span>
                                <ChevronDown className="h-3 w-3 sm:ml-1" />
                            </Menu.Button>
                            <Transition
                                as={Fragment}
                                enter="transition ease-out duration-100"
                                enterFrom="transform opacity-0 scale-95"
                                enterTo="transform opacity-100 scale-100"
                                leave="transition ease-in duration-75"
                                leaveFrom="transform opacity-100 scale-100"
                                leaveTo="transform opacity-0 scale-95"
                            >
                                <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-neutral-800 border border-neutral-700 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                    <div className="p-1">
                                        <Menu.Item>
                                            {({ active }) => (
                                                <button
                                                    onClick={() => handleOpenAddDialog(null, null)}
                                                    className={`${active ? 'bg-neutral-700 text-white' : 'text-neutral-300'
                                                        } group flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm`}
                                                >
                                                    <List className="h-4 w-4" />
                                                    {t('selectExisting')}
                                                </button>
                                            )}
                                        </Menu.Item>
                                        <Menu.Item>
                                            {({ active }) => (
                                                <a
                                                    href={`/items/fast-add?performanceId=${performanceId}`}
                                                    className={`${active ? 'bg-neutral-700 text-white' : 'text-neutral-300'
                                                        } group flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm`}
                                                >
                                                    <Camera className="h-4 w-4" />
                                                    {t('fastAdd')}
                                                </a>
                                            )}
                                        </Menu.Item>
                                    </div>
                                </Menu.Items>
                            </Transition>
                        </Menu>
                    </div>
                    <div className="bg-neutral-900/30 p-4 rounded-xl border border-neutral-800/50 border-dashed">
                        {renderAssignmentList('unassigned', groupedAssignments['unassigned'])}
                    </div>
                </div>

                {/* Scenes List */}
                <div className="space-y-8">
                    {definedScenes.map((scene) => (
                        <div key={scene.id} className="space-y-4">
                            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                                <div>
                                    <h3 className="text-lg font-medium text-white">
                                        {t('actScene', { act: scene.act_number, scene: scene.scene_number })}
                                    </h3>
                                    {scene.name && (
                                        <p className="text-sm text-neutral-400">{scene.name}</p>
                                    )}
                                </div>
                                <Menu as="div" className="relative">
                                    <Menu.Button
                                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-burgundy-main hover:bg-burgundy-light rounded-md transition-colors"
                                        style={accentColor ? { backgroundColor: accentColor } : {}}
                                    >
                                        <Plus className="h-4 w-4" />
                                        <span className="hidden sm:inline">{t('addProp')}</span>
                                        <ChevronDown className="h-3 w-3 sm:ml-1" />
                                    </Menu.Button>
                                    <Transition
                                        as={Fragment}
                                        enter="transition ease-out duration-100"
                                        enterFrom="transform opacity-0 scale-95"
                                        enterTo="transform opacity-100 scale-100"
                                        leave="transition ease-in duration-75"
                                        leaveFrom="transform opacity-100 scale-100"
                                        leaveTo="transform opacity-0 scale-95"
                                    >
                                        <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-neutral-800 border border-neutral-700 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                            <div className="p-1">
                                                <Menu.Item>
                                                    {({ active }) => (
                                                        <button
                                                            onClick={() => handleOpenAddDialog(scene.scene_number.toString(), scene.name)}
                                                            className={`${active ? 'bg-neutral-700 text-white' : 'text-neutral-300'
                                                                } group flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm`}
                                                        >
                                                            <List className="h-4 w-4" />
                                                            {t('selectExisting')}
                                                        </button>
                                                    )}
                                                </Menu.Item>
                                                <Menu.Item>
                                                    {({ active }) => (
                                                        <a
                                                            href={`/items/fast-add?performanceId=${performanceId}`}
                                                            className={`${active ? 'bg-neutral-700 text-white' : 'text-neutral-300'
                                                                } group flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm`}
                                                        >
                                                            <Camera className="h-4 w-4" />
                                                            {t('fastAdd')}
                                                        </a>
                                                    )}
                                                </Menu.Item>
                                            </div>
                                        </Menu.Items>
                                    </Transition>
                                </Menu>
                            </div>
                            <div>
                                {renderAssignmentList(scene.scene_number.toString(), groupedAssignments[scene.scene_number.toString()] || [])}
                            </div>
                        </div>
                    ))}
                </div>

                {definedScenes.length === 0 && (
                    <div className="text-center py-12 text-neutral-500">
                        {t('noScenesDefined')} <a href={`/performances/${performanceId}/scenes`} className="text-burgundy-light hover:underline">{t('manageScenes')}</a>
                    </div>
                )}

                <DragOverlay>
                    {activeId ? (
                        <div className="flex items-center justify-between p-3 bg-neutral-800 rounded-lg border border-neutral-600 shadow-xl opacity-90">
                            <div className="flex items-center gap-3">
                                <GripVertical className="h-4 w-4 text-neutral-400" />
                                <div className="h-10 w-10 flex-shrink-0 relative bg-neutral-700 rounded overflow-hidden flex items-center justify-center">
                                    <Package className="h-5 w-5 text-neutral-500" />
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-white">
                                        {selectedItems.has(activeId) && selectedItems.size > 1
                                            ? `${selectedItems.size} items`
                                            : assignments.find(a => a.id === activeId)?.items?.name}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </DragOverlay>
            </div>
        </DndContext>
    )
}
