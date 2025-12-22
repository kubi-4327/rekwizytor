'use client'

import { Fragment, useState, useRef } from 'react'
import { X, Camera, ScanLine, Loader2, Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

import { analyzePropsImage } from '@/app/actions/vision-props'
import { bulkInsertProps } from '@/app/actions/performance-props'
import { useRouter } from 'next/navigation'

interface PropsScannerDialogProps {
    isOpen: boolean
    onClose: () => void
    performanceId: string
    onItemsAdded?: () => void
}

/**
 * PropsScannerDialog - AI Vision for Props
 * 
 * UI Component cloned from GroupScannerDialog.tsx with modifications:
 * - Returns array of item names instead of single group name
 * - Allows editing the list before saving (add/remove/edit items)
 * - Bulk inserts to performance_props table
 * 
 * @note UI styling matches GroupScannerDialog - update both if changing design
 */
export function PropsScannerDialog({ isOpen, onClose, performanceId, onItemsAdded }: PropsScannerDialogProps) {
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)

    // State
    const [step, setStep] = useState<'capture' | 'analyzing' | 'confirm'>('capture')
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [items, setItems] = useState<string[]>([])
    const [editingIndex, setEditingIndex] = useState<number | null>(null)
    const [editingValue, setEditingValue] = useState('')
    const [newItemName, setNewItemName] = useState('')
    const [isSaving, setIsSaving] = useState(false)

    const reset = () => {
        setStep('capture')
        setPreviewUrl(null)
        setItems([])
        setEditingIndex(null)
        setEditingValue('')
        setNewItemName('')
        setIsSaving(false)
    }

    const handleClose = () => {
        reset()
        onClose()
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Create Preview
        const url = URL.createObjectURL(file)
        setPreviewUrl(url)
        setStep('analyzing')

        // Convert to Base64
        const reader = new FileReader()
        reader.onloadend = async () => {
            const base64 = reader.result as string

            // Call AI
            const result = await analyzePropsImage(base64)

            if (result.error) {
                console.error(result.error)
                setItems([]) // Empty list on error
            } else {
                setItems(result.items || [])
            }
            setStep('confirm')
        }
        reader.readAsDataURL(file)
    }

    const handleAddItem = () => {
        if (!newItemName.trim()) return
        setItems([...items, newItemName.trim()])
        setNewItemName('')
    }

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index))
    }

    const handleStartEdit = (index: number) => {
        setEditingIndex(index)
        setEditingValue(items[index])
    }

    const handleSaveEdit = () => {
        if (editingIndex !== null && editingValue.trim()) {
            const newItems = [...items]
            newItems[editingIndex] = editingValue.trim()
            setItems(newItems)
        }
        setEditingIndex(null)
        setEditingValue('')
    }

    const handleCancelEdit = () => {
        setEditingIndex(null)
        setEditingValue('')
    }

    const handleSave = async () => {
        if (items.length === 0) return

        setIsSaving(true)
        try {
            const result = await bulkInsertProps(performanceId, items)

            if (result.error) {
                throw new Error(result.error)
            }

            router.refresh()
            if (onItemsAdded) onItemsAdded()
            handleClose()
        } catch (e) {
            console.error(e)
            setIsSaving(false)
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={
                <div className="flex items-center justify-center sm:justify-start gap-2">
                    <ScanLine className="w-5 h-5 text-accent-main" />
                    Quick Add Props by Photo
                </div>
            }
        >
            <div className="text-center sm:text-left sm:mt-2">
                {/* STEP: CAPTURE */}
                {step === 'capture' && (
                    <div className="py-8 space-y-4 text-center">
                        <div className="w-20 h-20 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                            <Camera className="w-8 h-8 text-neutral-500" />
                        </div>
                        <p className="text-neutral-400 text-sm">
                            Take a photo of props to automatically extract a list of items.
                        </p>
                        <Button
                            variant="primary"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full"
                        >
                            Open Camera / Gallery
                        </Button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                    </div>
                )}

                {/* STEP: ANALYZING */}
                {step === 'analyzing' && (
                    <div className="py-8 space-y-4 text-center">
                        {previewUrl && (
                            <div className="w-full h-48 rounded-lg overflow-hidden relative mx-auto mb-4 border border-neutral-700">
                                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover opacity-50" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Loader2 className="w-10 h-10 text-accent-main animate-spin" />
                                </div>
                            </div>
                        )}
                        <p className="text-white font-medium animate-pulse">Analyzing image...</p>
                        <p className="text-neutral-500 text-xs">Identifying props and extracting names.</p>
                    </div>
                )}

                {/* STEP: CONFIRM & EDIT */}
                {step === 'confirm' && (
                    <div className="space-y-4 text-left max-h-[60vh] overflow-y-auto pr-1">
                        {previewUrl && (
                            <div className="w-full h-32 rounded-lg overflow-hidden border border-neutral-700 mb-4">
                                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-neutral-400 mb-2">
                                Found Items ({items.length})
                            </label>

                            {/* Items List */}
                            <div className="space-y-2 mb-4">
                                {items.map((item, index) => (
                                    <div key={index} className="flex items-center gap-2 bg-neutral-900 border border-neutral-700 rounded-md p-2">
                                        {editingIndex === index ? (
                                            <>
                                                <input
                                                    type="text"
                                                    value={editingValue}
                                                    onChange={e => setEditingValue(e.target.value)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') handleSaveEdit()
                                                        if (e.key === 'Escape') handleCancelEdit()
                                                    }}
                                                    className="flex-1 bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent-main"
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={handleSaveEdit}
                                                    className="p-1 text-green-400 hover:text-green-300"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={handleCancelEdit}
                                                    className="p-1 text-neutral-400 hover:text-white"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <span
                                                    onClick={() => handleStartEdit(index)}
                                                    className="flex-1 text-white text-sm cursor-pointer hover:text-accent-main"
                                                >
                                                    {item}
                                                </span>
                                                <button
                                                    onClick={() => handleRemoveItem(index)}
                                                    className="p-1 text-neutral-400 hover:text-red-400"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Add New Item */}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newItemName}
                                    onChange={e => setNewItemName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddItem()}
                                    placeholder="Add another item..."
                                    className="flex-1 bg-neutral-900 border border-neutral-700 rounded-md py-2 px-3 text-white text-sm placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-accent-main"
                                />
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={handleAddItem}
                                    disabled={!newItemName.trim()}
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button variant="secondary" onClick={reset} className="flex-1">Retake</Button>
                            <Button
                                variant="primary"
                                onClick={handleSave}
                                isLoading={isSaving}
                                disabled={items.length === 0}
                                className="flex-1"
                            >
                                Add {items.length} Item{items.length !== 1 ? 's' : ''}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    )
}

