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
    scene_id: string | null // NEW
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

export type ManagePropsFormProps = {
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

export function ManagePropsForm({ performanceId, initialAssignments, availableItems, definedScenes, accentColor, profiles, locations, groups }: ManagePropsFormProps) {
    const t = useTranslations('ManagePropsForm')
    const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments)
    const [loading, setLoading] = useState(false)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
    const [activeId, setActiveId] = useState<string | null>(null)

    // Track which scene we are adding to. null means unassigned.
    // Track which scene we are adding to. null means unassigned.
    const [targetScene, setTargetScene] = useState<{ number: string | null, name: string | null, id: string | null } | null>(null)

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


    // Group assignments by scene ID
    const groupedAssignments = useMemo(() => {
        const groups: Record<string, Assignment[]> = {}
        // Initialize groups for all defined scenes
        definedScenes.forEach(scene => {
            const key = scene.id
            groups[key] = []
        })
        // Add "unassigned" group
        groups['unassigned'] = []

        // Distribute assignments
        assignments.forEach(a => {
            // Priority: scene_id -> match by scene_number -> unassigned
            let key = 'unassigned'

            if (a.scene_id) {
                key = a.scene_id
            } else if (a.scene_number) {
                // Fallback for legacy data without scene_id
                // Try to find scene by number (and Act 1 preference if ambiguous, but really we should rely on ID)
                const matchingScene = definedScenes.find(s => s.scene_number.toString() === a.scene_number?.toString() && (!a.scene_name || s.name === a.scene_name))
                if (matchingScene) {
                    key = matchingScene.id
                }
            }

            if (!groups[key]) groups[key] = []
            groups[key].push(a)
        })

        // Sort by sort_order within groups
        Object.keys(groups).forEach(key => {
            groups[key].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        })

        return groups
    }, [assignments, definedScenes])

    // Group scenes by Act for display
    const scenesByAct = useMemo(() => {
        const groups: Record<number, typeof definedScenes> = {}
        definedScenes.forEach(s => {
            const act = s.act_number || 1
            if (!groups[act]) groups[act] = []
            groups[act].push(s)
        })
        return groups
    }, [definedScenes])

    const sortedActs = Object.keys(scenesByAct).map(Number).sort((a, b) => a - b)

    const handleOpenAddDialog = (sceneId: string | null) => {
        const scene = definedScenes.find(s => s.id === sceneId)
        setTargetScene({
            number: scene?.scene_number.toString() || null,
            name: scene?.name || null,
            id: sceneId
        })
        setIsDialogOpen(true)
    }

    const handleMultiAdd = async (selectedIds: string[]) => {
        if (selectedIds.length === 0) return

        setLoading(true)
        try {
            // Get max sort order for the target scene
            const targetKey = targetScene?.id || 'unassigned'
            const currentItems = groupedAssignments[targetKey] || []
            const maxSortOrder = currentItems.length > 0 ? Math.max(...currentItems.map(i => i.sort_order || 0)) : 0

            const newAssignmentsData = selectedIds.map((itemId, index) => ({
                performance_id: performanceId,
                item_id: itemId,
                scene_id: targetScene?.id || null, // New field
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
            const newAssignedItems = (data as any[]).map(d => ({
                ...d,
                items: availableItems.find(i => i.id === d.item_id) // Simplification for optimistic
            }))

            setAssignments(prev => [...prev, ...newAssignedItems])
            setIsDialogOpen(false)
            setSelectedItems(new Set())
        } catch (error) {
            console.error('Error adding items:', error)
            alert(t('updateError'))
        } finally {
            setLoading(false)
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

    // --- Drag and Drop Logic ---

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event
        setActiveId(active.id as string)
    }

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event
        const overId = over?.id

        if (!overId || active.id === overId) return

        // Note: findContainer now returns scene ID (UUID) or 'unassigned'
        const activeContainer = findContainer(active.id as string)
        const overContainer = findContainer(overId as string)

        if (!activeContainer || !overContainer || activeContainer === overContainer) {
            return
        }

        // Just visual placeholder logic if needed, but we mostly rely on dragEnd for real moves
    }

    const findContainer = (id: string) => {
        if (Object.keys(groupedAssignments).includes(id)) {
            return id
        }

        return Object.keys(groupedAssignments).find((key) =>
            groupedAssignments[key].some((item) => item.id === id)
        )
    }

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event
        const activeId = active.id as string
        const overId = over?.id

        setActiveId(null)

        if (!overId) return

        const activeContainer = findContainer(activeId)
        const overContainer = findContainer(overId as string)

        if (!activeContainer || !overContainer || activeContainer === overContainer && active.id === overId) {
            return
        }

        // We are moving item
        // Calculate new index
        const activeIndex = groupedAssignments[activeContainer].findIndex(i => i.id === activeId)
        const overIndex = groupedAssignments[overContainer].findIndex(i => i.id === overId) // -1 if dropped on container

        let newAssignments = [...assignments]

        // Are we moving multiple items?
        // If the dragged item is selected, we move all selected items.
        // If not, we just move the dragged item (and deselect others potentially, or just move one).
        const movingSelected = selectedItems.has(activeId)
        const itemsToMoveIds = movingSelected ? Array.from(selectedItems) : [activeId]

        // Filter out items that are NOT in the activeContainer (just in case selection spans containers, which we shouldn't allow or should handle gracefully)
        // For simple kanban, let's assume selection is valid if we handle it.
        // But safer to only move items from the CURRENT activeContainer to avoid weird jumps.
        const validItemsToMoveIds = itemsToMoveIds.filter(id => {
            const container = findContainer(id)
            return container === activeContainer
        })

        if (validItemsToMoveIds.length === 0) return

        // Update local state optimistic
        // We first update the scene fields for the moved items.

        // Find target scene details
        let targetSceneId: string | null = null
        let targetSceneNum: string | null = null
        let targetSceneName: string | null = null

        if (overContainer !== 'unassigned') {
            const scene = definedScenes.find(s => s.id === overContainer)
            if (scene) {
                targetSceneId = scene.id
                targetSceneNum = scene.scene_number.toString()
                targetSceneName = scene.name
            }
        }

        // --- Logic Update for ID based containers ---

        if (activeContainer !== overContainer) {
            const sourceList = groupedAssignments[activeContainer].filter(a => !validItemsToMoveIds.includes(a.id))
            const targetList = [...groupedAssignments[overContainer]]

            const itemsToMove = validItemsToMoveIds.map(id => assignments.find(a => a.id === id)!).map(item => ({
                ...item,
                scene_id: targetSceneId,
                scene_number: targetSceneNum,
                scene_name: targetSceneName
            }))

            // Insert at overIndex
            const insertAt = overIndex >= 0 ? overIndex : targetList.length
            targetList.splice(insertAt, 0, ...itemsToMove)

            // Rebuild assignments
            const otherAssignments = assignments.filter(a => {
                const c = findContainer(a.id)
                return c !== activeContainer && c !== overContainer
            })

            // Update sort orders
            const updatedSource = sourceList.map((a, i) => ({ ...a, sort_order: i }))
            const updatedTarget = targetList.map((a, i) => ({ ...a, sort_order: i }))

            newAssignments = [...otherAssignments, ...updatedSource, ...updatedTarget]
            setAssignments(newAssignments)

            // DB Updates
            const updates = [...updatedSource, ...updatedTarget].map(item => ({
                id: item.id,
                item_id: item.item_id,
                performance_id: performanceId,
                scene_id: item.scene_id, // Add scene_id
                scene_number: item.scene_number,
                scene_name: item.scene_name,
                sort_order: item.sort_order
            }))

            // Execute DB update
            if (updates.length > 0) {
                try {
                    const { error } = await supabase
                        .from('performance_items')
                        .upsert(updates)

                    if (error) throw error
                } catch (error) {
                    console.error('Error updating sort order:', error)
                }
            }

        } else {
            // Same container reorder
            const containerList = groupedAssignments[activeContainer]
            // We need to move items within this list

            // We use dnd-kit's arrayMove equivalent logic
            // But since we support multi-drag, it's custom.

            // Simpler approach for same container:
            // Remove items, insert at new index.
            const itemsToMove = validItemsToMoveIds.map(id => containerList.find(a => a.id === id)!)
            const listWithoutMoved = containerList.filter(a => !validItemsToMoveIds.includes(a.id))

            // Adjust overIndex because removal might shift indices
            // If we drag down, the insertion index is fine (relative to original list if we consider indices carefully).
            // Actually simpler:
            // If single item:
            if (itemsToMove.length === 1) {
                const oldIndex = activeIndex
                const newIndex = overIndex
                // If overIndex matches an item in the list, we place before or after?
                // arrayMove logic usually swaps.
                // let's try to construct the new list manually.

                // If dropped on self, do nothing
                if (oldIndex === newIndex) return
            }

            // For robust multi-sort, recreating the list is key.
            // Target index is overIndex.

            // Let's take the logic:
            // 1. Filter out moved items.
            // 2. Insert them at the desired position.

            // Careful: overIndex is the index in the *original* list (including the item being moved).
            // We need to translate that to the index in the *filtered* list.

            let finalIndex = overIndex

            // If we are moving down, we need to adjust
            // Logic is complex for multi-drag. 
            // Simplified: just put them at the dropped position.

            const newList = [...listWithoutMoved]
            // If overIndex was -1 (container drop), append
            // Else, we must find where the 'over' item is now in the filtered list
            // If 'over' item was one of the moving items, this logic breaks.
            // But dragEnd only fires if we drop on something.
            // If we drop on one of the selected items (which moves with us), overId is that item.

            // If we drop on an item that is NOT moving:
            const overItemIndexInFiltered = listWithoutMoved.findIndex(a => a.id === overId)

            if (overItemIndexInFiltered !== -1) {
                // Determine if we drop before or after.
                // dnd-kit suggests using arrayMove which handles single item.
                // For multi, let's just insert before the over item.
                newList.splice(overItemIndexInFiltered, 0, ...itemsToMove)
            } else {
                // We dropped on ourselves or container?
                // If container (overId === containerId), append.
                if (overId === activeContainer) {
                    newList.push(...itemsToMove)
                } else {
                    // Fallback to end
                    newList.push(...itemsToMove)
                }
            }

            const updatedContainer = newList.map((a, i) => ({ ...a, sort_order: i }))

            // Merge back
            const otherAssignments = assignments.filter(a => {
                const c = findContainer(a.id)
                return c !== activeContainer
            })

            newAssignments = [...otherAssignments, ...updatedContainer]
            setAssignments(newAssignments)

            // DB Updates
            const updates = updatedContainer.map(item => ({
                id: item.id,
                item_id: item.item_id,
                performance_id: performanceId,
                scene_id: item.scene_id, // Ensure scene_id is passed for upsert
                scene_number: item.scene_number,
                scene_name: item.scene_name,
                sort_order: item.sort_order
            }))

            if (updates.length > 0) {
                try {
                    const { error } = await supabase
                        .from('performance_items')
                        .upsert(updates)

                    if (error) throw error
                } catch (error) {
                    console.error('Error updating sort order:', error)
                }
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
        <div className="space-y-8 pb-32">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
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
                                                    onClick={() => handleOpenAddDialog(null)}
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

                {/* Scenes List Grouped by Act */}
                <div className="space-y-12">
                    {sortedActs.map((actNum) => (
                        <div key={actNum} className="space-y-6">
                            {/* Act Header */}
                            <div className="flex items-center gap-4 border-b border-neutral-800 pb-2">
                                <h3 className="text-xl font-bold text-white uppercase tracking-wider">
                                    {t('actHeader', { act: actNum })}
                                </h3>
                                <div className="h-px bg-neutral-800 flex-1" />
                            </div>

                            <div className="space-y-8 pl-4 border-l-2 border-neutral-800/30">
                                {scenesByAct[actNum].map((scene) => (
                                    <div key={scene.id} className="space-y-4">
                                        <div className="flex items-center justify-between border-b border-neutral-800/50 pb-2">
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
                                                                        onClick={() => handleOpenAddDialog(scene.id)}
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
                                            {renderAssignmentList(scene.id, groupedAssignments[scene.id] || [])}
                                        </div>
                                    </div>
                                ))}
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
            </DndContext>
        </div>
    )
}
