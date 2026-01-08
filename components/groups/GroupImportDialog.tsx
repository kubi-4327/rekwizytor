'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { KanbanBoard, KanbanColumn, KanbanItem } from '@/components/ui/KanbanBoard'
import { Folder, Trash2, X } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { notify } from '@/utils/notify'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface GroupImportDialogProps {
    isOpen: boolean
    onClose: () => void
    parentId?: string | null
    locations?: { id: string, name: string }[]
}

// ... types
import { getSuggestedIcon } from '@/utils/icon-matcher'
import { icons } from 'lucide-react'

// Dynamic icon component
const DynamicIcon = ({ name, className }: { name: string, className?: string }) => {
    const Icon = (icons as any)[name] || Folder
    return <Icon className={className} />
}

type ImportItem = {
    id: string
    name: string
    columnId: string // 'input' or locationId
    icon: string
}

const SortableImportItem = ({
    item,
    isOverlay,
    onDelete,
    onUpdate,
    locations
}: {
    item: ImportItem,
    isOverlay?: boolean,
    onDelete: (id: string) => void,
    onUpdate: (id: string, data: Partial<ImportItem>) => void,
    locations: { id: string, name: string }[]
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: item.id })

    const [isEditing, setIsEditing] = useState(false)
    const [editName, setEditName] = useState(item.name)

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    }

    const handleSaveName = () => {
        if (editName.trim()) {
            // Auto-update icon if name changed significantly? Maybe not to avoid overriding user choice.
            // But let's at least save the name.
            onUpdate(item.id, { name: editName })
        }
        setIsEditing(false)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSaveName()
        if (e.key === 'Escape') {
            setEditName(item.name)
            setIsEditing(false)
        }
    }

    if (isOverlay) {
        return (
            <div className="flex items-center gap-2 p-3 rounded-lg border border-neutral-800 bg-neutral-900/90 text-sm shadow-xl ring-2 ring-white/20 cursor-grabbing w-[300px]">
                <DynamicIcon name={item.icon || 'Folder'} className="w-4 h-4 text-neutral-500" />
                <span className="flex-1 truncate text-neutral-200 font-medium">{item.name}</span>
            </div>
        )
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="group flex items-center gap-2 p-3 rounded-lg border border-neutral-800 bg-neutral-900/90 text-sm shadow-sm hover:border-neutral-700 touch-none"
        >
            {/* Drag Handle (Icon area acts as handle) */}
            <div {...attributes} {...listeners} className="cursor-grab hover:text-white transition-colors">
                <DynamicIcon name={item.icon || 'Folder'} className="w-4 h-4 text-neutral-500" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 flex flex-col gap-1">
                {isEditing ? (
                    <input
                        autoFocus
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onBlur={handleSaveName}
                        onKeyDown={handleKeyDown}
                        className="w-full bg-neutral-950 border border-neutral-700 rounded px-1.5 py-0.5 text-white text-sm focus:outline-none focus:border-amber-500"
                        onPointerDown={e => e.stopPropagation()} // Allow clicking input without dragging
                    />
                ) : (
                    <span
                        onClick={() => {
                            setEditName(item.name)
                            setIsEditing(true)
                        }}
                        className="truncate text-neutral-200 font-medium cursor-text hover:text-white"
                    >
                        {item.name}
                    </span>
                )}

                {/* Location Selector (Small) */}
                <div className="flex items-center gap-2">
                    <select
                        value={item.columnId}
                        onChange={(e) => onUpdate(item.id, { columnId: e.target.value })}
                        className="bg-transparent text-[10px] text-neutral-500 border-none p-0 hover:text-neutral-300 focus:ring-0 cursor-pointer w-full max-w-[120px] truncate"
                        onPointerDown={e => e.stopPropagation()}
                    >
                        <option value="input" className="bg-neutral-900 text-neutral-400">Do utworzenia</option>
                        {locations.map(loc => (
                            <option key={loc.id} value={loc.id} className="bg-neutral-900 text-white truncate">
                                ⮑ {loc.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <button
                onClick={(e) => {
                    e.stopPropagation() // Prevent drag start
                    onDelete(item.id)
                }}
                className="p-1 text-neutral-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <Trash2 className="w-3.5 h-3.5" />
            </button>
        </div>
    )
}


export function GroupImportDialog({ isOpen, onClose, parentId, locations = [] }: GroupImportDialogProps) {
    const [inputText, setInputText] = useState('')
    const [items, setItems] = useState<ImportItem[]>([])
    const [isSaving, setIsSaving] = useState(false)

    const supabase = createClient()
    const router = useRouter()

    const COL_INPUT = 'input'

    // Define columns
    // 1. "Ready to Create" (Default)
    // 2. Optional: Locations (for assigning location by drag-drop)
    const columns: KanbanColumn[] = [
        { id: COL_INPUT, title: 'Grupy do utworzenia' },
        ...locations.map(l => ({ id: l.id, title: l.name }))
    ]

    const handleParse = () => {
        const lines = inputText.split('\n').map(l => l.trim()).filter(l => l.length > 0)

        const newItems: ImportItem[] = lines.map(line => ({
            id: crypto.randomUUID(),
            name: line,
            columnId: COL_INPUT,
            icon: getSuggestedIcon(line)
        }))

        setItems(prev => [...prev, ...newItems])
        setInputText('')
    }

    const handleUpdateItem = (id: string, updates: Partial<ImportItem>) => {
        setItems(prev => prev.map(item => {
            if (item.id === id) {
                const newItem = { ...item, ...updates }
                // If name changed and icon wasn't manually updated (or simple heuristic), update icon?
                // For now, let's update icon only if name changed and we want to allow auto-update. 
                // Simple approach: just update checks.
                if (updates.name && !updates.icon) {
                    newItem.icon = getSuggestedIcon(updates.name)
                }
                return newItem
            }
            return item
        }))
    }

    const handleSave = async () => {
        if (items.length === 0) return
        setIsSaving(true)

        try {
            const inserts = items.map(item => ({
                name: item.name,
                location_id: item.columnId === COL_INPUT ? null : item.columnId,
                icon: item.icon || 'Folder',
                color: '#000000'
            }))

            const { data, error } = await supabase.from('groups').insert(inserts).select('id')
            if (error) throw error

            // Generate embeddings in background (don't wait for them)
            if (data && data.length > 0) {
                // Dynamic import to avoid issues with client component
                import('@/app/actions/generate-group-embeddings').then(({ generateGroupEmbedding }) => {
                    data.forEach(group => {
                        generateGroupEmbedding(group.id).catch(err =>
                            console.error('Failed to generate embedding:', err)
                        )
                    })
                })
            }

            notify.success(`Utworzono ${items.length} grup`)
            router.refresh()
            onClose()
            setItems([])
        } catch (error) {
            console.error('Import error:', error)
            notify.error('Błąd podczas tworzenia grup')
        } finally {
            setIsSaving(false)
        }
    }

    const handleDeleteItem = (id: string) => {
        setItems(prev => prev.filter(i => i.id !== id))
    }

    const renderItem = (item: ImportItem, isOverlay?: boolean) => (
        <SortableImportItem
            key={item.id}
            item={item}
            isOverlay={isOverlay}
            onDelete={handleDeleteItem}
            onUpdate={handleUpdateItem}
            locations={locations}
        />
    )

    const renderColumnHeader = (col: KanbanColumn, colItems: ImportItem[]) => (
        <div className="flex items-center justify-between p-3 border-b border-neutral-800 bg-neutral-900/50 rounded-t-lg">
            <span className="font-medium text-neutral-400 text-sm">{col.title}</span>
            <span className="text-xs bg-neutral-800 text-neutral-500 px-2 py-0.5 rounded-full">
                {colItems.length}
            </span>
        </div>
    )

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Importuj Grupy z Listy"
            maxWidth="4xl"
        >
            <div className="flex flex-col h-[70vh] gap-4 mt-4">
                {/* Input Area */}
                <div className="flex gap-2 items-start shrink-0">
                    <textarea
                        className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-sm text-white placeholder-neutral-600 focus:ring-1 focus:ring-amber-500 resize-none h-24"
                        placeholder="Wklej listę grup (jedna pod drugą)..."
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        onKeyDown={e => {
                            // Cmd+Enter (Meta+Enter) or Ctrl+Enter
                            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                                if (inputText.trim()) {
                                    handleParse()
                                } else if (items.length > 0) {
                                    handleSave()
                                }
                            }
                        }}
                    />
                    <Button
                        onClick={handleParse}
                        variant="secondary"
                        className="h-24 px-6"
                        disabled={!inputText.trim()}
                    >
                        Przetwórz
                    </Button>
                </div>

                {/* Kanban Area */}
                <div className="flex-1 min-h-0 border border-neutral-800 rounded-xl bg-neutral-950/30 p-4">
                    <KanbanBoard
                        items={items}
                        columns={columns}
                        onItemReorder={setItems}
                        renderItem={renderItem}
                        renderColumnHeader={renderColumnHeader}
                    />
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 pt-2 shrink-0 border-t border-neutral-800/50">
                    <Button variant="ghost" onClick={onClose}>Anuluj</Button>
                    <Button
                        variant="primary"
                        onClick={handleSave}
                        disabled={items.length === 0}
                        isLoading={isSaving}
                    >
                        Utwórz {items.length} Grup
                    </Button>
                </div>
            </div>
        </Modal>
    )
}
