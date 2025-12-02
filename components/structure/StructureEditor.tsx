'use client'

import { useState, useMemo } from 'react'
import { Database } from '@/types/supabase'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
    useDroppable,
    DragOverlay
} from '@dnd-kit/core'
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useTranslations } from 'next-intl'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { GripVertical, Plus, Trash2, MapPin, Folder } from 'lucide-react'
import { CreateStructureDialog } from './CreateStructureDialog'

type Location = Database['public']['Tables']['locations']['Row']
type Group = Database['public']['Tables']['groups']['Row']

type Props = {
    initialLocations: Location[]
    initialGroups: Group[]
}

function SortableGroup({ group, onEdit, onDelete }: { group: Group, onEdit: (group: Group) => void, onDelete: (id: string) => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: group.id, data: { type: 'group', group } })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="flex items-center gap-3 p-3 bg-neutral-800 rounded-lg border border-neutral-700 group hover:border-neutral-600 transition-colors relative"
        >
            <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing text-neutral-500 hover:text-neutral-300"
            >
                <GripVertical className="h-4 w-4" />
            </div>
            <div className="h-8 w-8 rounded bg-neutral-700 flex items-center justify-center text-neutral-400">
                <Folder className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">{group.name}</div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={() => onEdit(group)}
                    className="p-1.5 text-neutral-500 hover:text-white hover:bg-neutral-700 rounded"
                >
                    {/* Edit Icon - reusing Box for now or just text/another icon if needed. Let's use a simple SVG or just rely on click? No, explicit button. */}
                    <span className="text-xs">Edit</span>
                </button>
                <button
                    onClick={() => onDelete(group.id)}
                    className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-neutral-700 rounded"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </button>
            </div>
        </div>
    )
}

function LocationContainer({
    location,
    groups,
    id,
    onEdit,
    onDelete,
    onEditGroup,
    onDeleteGroup,
    onNavigate
}: {
    location?: Location,
    groups: Group[],
    id: string,
    onEdit?: (location: Location) => void,
    onDelete?: (id: string) => void,
    onEditGroup: (group: Group) => void,
    onDeleteGroup: (id: string) => void,
    onNavigate?: () => void
}) {
    const { setNodeRef } = useDroppable({ id, data: { type: 'location', location } })
    const t = useTranslations('Structure')

    return (
        <div ref={setNodeRef} className="bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-neutral-800 bg-neutral-950/50 flex items-center justify-between group">
                <div className="flex items-center gap-2 cursor-pointer" onClick={onNavigate}>
                    <MapPin className="h-4 w-4 text-neutral-400" />
                    <h3 className="font-medium text-white hover:underline">
                        {location ? location.name : t('unassigned')}
                    </h3>
                    <span className="text-xs text-neutral-500 bg-neutral-800 px-2 py-0.5 rounded-full">
                        {groups.length}
                    </span>
                </div>
                {location && onEdit && onDelete && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => onEdit(location)}
                            className="p-1.5 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded"
                        >
                            <span className="text-xs">Edit</span>
                        </button>
                        <button
                            onClick={() => onDelete(location.id)}
                            className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-neutral-800 rounded"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    </div>
                )}
            </div>
            <div className="p-4 flex-1 bg-neutral-900/50">
                <SortableContext items={groups.map(g => g.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2 min-h-[50px]">
                        {groups.map(group => (
                            <SortableGroup
                                key={group.id}
                                group={group}
                                onEdit={onEditGroup}
                                onDelete={onDeleteGroup}
                            />
                        ))}
                        {groups.length === 0 && (
                            <div className="h-full flex items-center justify-center border-2 border-dashed border-neutral-800 rounded-lg p-4 text-sm text-neutral-600">
                                {t('dropHere')}
                            </div>
                        )}
                    </div>
                </SortableContext>
            </div>
        </div>
    )
}

export function StructureEditor({ initialLocations, initialGroups }: Props) {
    const t = useTranslations('Structure')
    const [locations, setLocations] = useState(initialLocations)
    const [groups, setGroups] = useState(initialGroups)
    const [activeId, setActiveId] = useState<string | null>(null)
    const supabase = createClient()
    const [currentParentId, setCurrentParentId] = useState<string | null>(null)
    const router = useRouter()

    // ... (existing state)

    const visibleLocations = useMemo(() => {
        return locations.filter(l => l.belongs_to === currentParentId)
    }, [locations, currentParentId])

    const breadcrumbs = useMemo(() => {
        if (!currentParentId) return []
        const crumbs = []
        let curr = locations.find(l => l.id === currentParentId)
        while (curr) {
            crumbs.unshift(curr)
            if (!curr.belongs_to) break
            const parentId = curr.belongs_to
            curr = locations.find(l => l.id === parentId)
        }
        return crumbs
    }, [locations, currentParentId])

    const handleNavigate = (locationId: string | null) => {
        setCurrentParentId(locationId)
        setActiveId(null) // Reset drag state just in case
    }

    const [editingLocation, setEditingLocation] = useState<Location | null>(null)
    const [editingGroup, setEditingGroup] = useState<Group | null>(null)

    const handleUpdateLocation = async (name: string, type?: string) => {
        if (!editingLocation) return
        try {
            const { error } = await supabase
                .from('locations')
                .update({
                    name,
                    type: type as Database['public']['Enums']['location_type_enum'] || 'other'
                })
                .eq('id', editingLocation.id)

            if (error) throw error

            setLocations(locations.map(l => l.id === editingLocation.id ? { ...l, name, type: type as Database['public']['Enums']['location_type_enum'] } : l))
            setEditingLocation(null)
            router.refresh()
        } catch (error) {
            console.error('Error updating location:', error)
            alert('Failed to update location')
        }
    }

    const handleDeleteLocation = async (id: string) => {
        if (!confirm(t('deleteConfirm'))) return
        // Check if location has groups? Supabase might enforce FK, or we should check.
        // If we delete location, groups might become unassigned or cascade delete.
        // Let's assume we want to prevent delete if not empty, or just let DB handle it.
        // Ideally, we should check if groups exist.
        const hasGroups = groups.some(g => g.location_id === id)
        if (hasGroups) {
            alert('Cannot delete location with groups. Please move or delete groups first.')
            return
        }

        try {
            const { error } = await supabase
                .from('locations')
                .delete()
                .eq('id', id)

            if (error) throw error

            setLocations(locations.filter(l => l.id !== id))
            router.refresh()
        } catch (error) {
            console.error('Error deleting location:', error)
            alert('Failed to delete location')
        }
    }

    const handleUpdateGroup = async (name: string) => {
        if (!editingGroup) return
        try {
            const { error } = await supabase
                .from('groups')
                .update({ name })
                .eq('id', editingGroup.id)

            if (error) throw error

            setGroups(groups.map(g => g.id === editingGroup.id ? { ...g, name } : g))
            setEditingGroup(null)
            router.refresh()
        } catch (error) {
            console.error('Error updating group:', error)
            alert('Failed to update group')
        }
    }

    const handleDeleteGroup = async (id: string) => {
        if (!confirm(t('deleteConfirm'))) return
        try {
            const { error } = await supabase
                .from('groups')
                .delete()
                .eq('id', id)

            if (error) throw error

            setGroups(groups.filter(g => g.id !== id))
            router.refresh()
        } catch (error) {
            console.error('Error deleting group:', error)
            alert('Failed to delete group')
        }
    }

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

    const groupsByLocation = useMemo(() => {
        const map: Record<string, Group[]> = {}
        locations.forEach(l => map[l.id] = [])
        map['unassigned'] = []

        groups.forEach(g => {
            const key = g.location_id || 'unassigned'
            if (!map[key]) map[key] = []
            map[key].push(g)
        })

        // Sort groups by name since we don't have sort_order
        Object.keys(map).forEach(key => {
            map[key].sort((a, b) => a.name.localeCompare(b.name))
        })

        return map
    }, [groups, locations])

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string)
    }

    const handleDragOver = () => {
        // We can implement optimistic updates here if we want smoother visual feedback
        // For now, let's rely on DragEnd
    }

    function SortableLocationWrapper({ location, children }: { location: Location, children: React.ReactNode }) {
        const {
            attributes,
            listeners,
            setNodeRef,
            transform,
            transition,
            isDragging,
        } = useSortable({ id: location.id, data: { type: 'location', location } })

        const style = {
            transform: CSS.Transform.toString(transform),
            transition,
            opacity: isDragging ? 0.5 : 1,
        }

        return (
            <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
                {children}
            </div>
        )
    }

    // ... inside StructureEditor

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event
        setActiveId(null)

        if (!over) return

        const activeIdStr = active.id as string
        const overIdStr = over.id as string

        if (activeIdStr === overIdStr) return

        const activeType = active.data.current?.type


        // Handle Group Dragging
        if (activeType === 'group') {
            const activeGroup = groups.find(g => g.id === activeIdStr)
            if (!activeGroup) return

            let targetLocationId: string | null = null

            if (overIdStr === 'unassigned') {
                targetLocationId = null
            } else if (locations.find(l => l.id === overIdStr)) {
                targetLocationId = overIdStr
            } else {
                // Dropped on a group?
                const overGroup = groups.find(g => g.id === overIdStr)
                if (overGroup) {
                    targetLocationId = overGroup.location_id
                } else {
                    // Dropped on a location wrapper?
                    const overLocation = locations.find(l => l.id === overIdStr)
                    if (overLocation) {
                        targetLocationId = overLocation.id
                    } else {
                        return // Unknown drop target
                    }
                }
            }

            if (activeGroup.location_id === targetLocationId) return

            // Optimistic Update
            const updatedGroups = groups.map(g =>
                g.id === activeIdStr ? { ...g, location_id: targetLocationId } : g
            )
            setGroups(updatedGroups)

            // DB Update
            try {
                const { error } = await supabase
                    .from('groups')
                    .update({ location_id: targetLocationId })
                    .eq('id', activeIdStr)

                if (error) throw error
                router.refresh()
            } catch (error) {
                console.error('Error updating group location:', error)
                setGroups(groups)
                alert('Failed to update location')
            }
        }
        // Handle Location Dragging (Nesting)
        else if (activeType === 'location') {
            // We only support nesting one location into another
            // If dropped on another location, we nest it.
            // If dropped on 'unassigned' (or empty space?), maybe move to root?
            // For now, let's say dropping A onto B makes A a child of B.

            // Prevent self-nesting and circular dependency checks would be needed in a real app
            // Simple check: can't drop on itself (handled above).

            const targetLocation = locations.find(l => l.id === overIdStr)

            // If dropped on a location, nest it
            if (targetLocation) {
                // Optimistic Update
                const updatedLocations = locations.map(l =>
                    l.id === activeIdStr ? { ...l, belongs_to: targetLocation.id } : l
                )
                setLocations(updatedLocations)

                try {
                    const { error } = await supabase
                        .from('locations')
                        .update({ belongs_to: targetLocation.id })
                        .eq('id', activeIdStr)

                    if (error) throw error
                    router.refresh()
                } catch (error) {
                    console.error('Error nesting location:', error)
                    setLocations(locations)
                    alert('Failed to nest location')
                }
            }
        }
    }



    const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false)
    const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false)
    const [targetLocationId, setTargetLocationId] = useState<string | null>(null)

    const handleCreateLocation = async (name: string, type?: string) => {
        try {
            const { data, error } = await supabase
                .from('locations')
                .insert({
                    name,
                    type: type as Database['public']['Enums']['location_type_enum'] || 'other',
                    belongs_to: currentParentId
                })
                .select()
                .single()

            if (error) throw error

            setLocations([...locations, data])
            router.refresh()
        } catch (error) {
            console.error('Error creating location:', error)
            alert('Failed to create location')
        }
    }

    const handleCreateGroup = async (name: string) => {
        try {
            const { data, error } = await supabase
                .from('groups')
                .insert({
                    name,
                    location_id: targetLocationId
                })
                .select()
                .single()

            if (error) throw error

            setGroups([...groups, data])
            router.refresh()
        } catch (error) {
            console.error('Error creating group:', error)
            alert('Failed to create group')
        }
    }

    const openGroupDialog = (locationId: string | null) => {
        setTargetLocationId(locationId)
        setIsGroupDialogOpen(true)
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <CreateStructureDialog
                isOpen={isLocationDialogOpen}
                onClose={() => setIsLocationDialogOpen(false)}
                onConfirm={handleCreateLocation}
                title={t('addLocation')}
                type="location"
            />

            <CreateStructureDialog
                isOpen={isGroupDialogOpen}
                onClose={() => setIsGroupDialogOpen(false)}
                onConfirm={(name) => handleCreateGroup(name)}
                title={t('addGroup')}
                type="group"
            />

            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 text-sm">
                    <button
                        onClick={() => handleNavigate(null)}
                        className={`hover:text-white transition-colors ${!currentParentId ? 'text-white font-medium' : 'text-neutral-500'}`}
                    >
                        {t('locations')}
                    </button>
                    {breadcrumbs.map((crumb, index) => (
                        <div key={crumb.id} className="flex items-center gap-2">
                            <span className="text-neutral-600">/</span>
                            <button
                                onClick={() => handleNavigate(crumb.id)}
                                className={`hover:text-white transition-colors ${index === breadcrumbs.length - 1 ? 'text-white font-medium' : 'text-neutral-500'}`}
                            >
                                {crumb.name}
                            </button>
                        </div>
                    ))}
                </div>

                <button
                    onClick={() => setIsLocationDialogOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-black bg-white rounded-md hover:bg-neutral-200 transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    {t('addLocation')}
                </button>
            </div>

            <CreateStructureDialog
                isOpen={!!editingLocation}
                onClose={() => setEditingLocation(null)}
                onConfirm={handleUpdateLocation}
                title={t('edit')}
                type="location"
                initialName={editingLocation?.name || ''}
                initialType={editingLocation?.type || 'other'}
                confirmLabel={t('edit')}
            />

            <CreateStructureDialog
                isOpen={!!editingGroup}
                onClose={() => setEditingGroup(null)}
                onConfirm={(name) => handleUpdateGroup(name)}
                title={t('edit')}
                type="group"
                initialName={editingGroup?.name || ''}
                confirmLabel={t('edit')}
            />

            <SortableContext items={visibleLocations.map(l => l.id)} strategy={verticalListSortingStrategy}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                    {/* Unassigned Column - Not draggable itself, but a drop target for groups */}
                    <div className="flex flex-col h-full">
                        <LocationContainer
                            id="unassigned"
                            groups={groupsByLocation['unassigned']}
                            onEditGroup={setEditingGroup}
                            onDeleteGroup={handleDeleteGroup}
                        />
                        <button
                            onClick={() => openGroupDialog(null)}
                            className="mt-2 w-full py-2 text-xs font-medium text-neutral-500 hover:text-white border border-dashed border-neutral-800 hover:border-neutral-600 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <Plus className="h-3 w-3" />
                            {t('addGroup')}
                        </button>
                    </div>

                    {/* Locations Columns */}
                    {visibleLocations.map(location => (
                        <SortableLocationWrapper key={location.id} location={location}>
                            <div className="flex flex-col h-full">
                                <LocationContainer
                                    id={location.id}
                                    location={location}
                                    groups={groupsByLocation[location.id]}
                                    onEdit={setEditingLocation}
                                    onDelete={handleDeleteLocation}
                                    onEditGroup={setEditingGroup}
                                    onDeleteGroup={handleDeleteGroup}
                                    onNavigate={() => handleNavigate(location.id)}
                                />
                                <button
                                    onClick={() => openGroupDialog(location.id)}
                                    className="mt-2 w-full py-2 text-xs font-medium text-neutral-500 hover:text-white border border-dashed border-neutral-800 hover:border-neutral-600 rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    <Plus className="h-3 w-3" />
                                    {t('addGroup')}
                                </button>
                            </div>
                        </SortableLocationWrapper>
                    ))}
                </div>
            </SortableContext>

            <DragOverlay>
                {activeId ? (
                    (() => {
                        const activeGroup = groups.find(g => g.id === activeId)
                        if (activeGroup) {
                            return (
                                <div className="flex items-center gap-3 p-3 bg-neutral-800 rounded-lg border border-neutral-600 shadow-xl opacity-90 cursor-grabbing w-[300px]">
                                    <div className="text-neutral-500">
                                        <GripVertical className="h-4 w-4" />
                                    </div>
                                    <div className="h-8 w-8 rounded bg-neutral-700 flex items-center justify-center text-neutral-400">
                                        <Folder className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-white truncate">{activeGroup.name}</div>
                                    </div>
                                </div>
                            )
                        }
                        const activeLocation = locations.find(l => l.id === activeId)
                        if (activeLocation) {
                            return (
                                <div className="bg-neutral-900 rounded-xl border border-neutral-600 shadow-xl opacity-90 w-[300px] overflow-hidden">
                                    <div className="p-4 border-b border-neutral-800 bg-neutral-950/50 flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-neutral-400" />
                                        <h3 className="font-medium text-white">{activeLocation.name}</h3>
                                    </div>
                                </div>
                            )
                        }
                        return null
                    })()
                ) : null}
            </DragOverlay>
        </DndContext>
    )
}
