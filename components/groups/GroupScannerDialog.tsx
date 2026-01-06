'use client'

import { Fragment, useState, useRef } from 'react'
import { X, Camera, ScanLine, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { analyzeGroupImage } from '@/app/actions/vision-group'
import { generateGroupEmbedding } from '@/app/actions/generate-group-embeddings'

interface GroupScannerDialogProps {
    isOpen: boolean
    onClose: () => void
    parentId?: string | null
}

export function GroupScannerDialog({ isOpen, onClose, parentId }: GroupScannerDialogProps) {
    const supabase = createClient()
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)

    // State
    const [step, setStep] = useState<'capture' | 'analyzing' | 'confirm'>('capture')
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [groupName, setGroupName] = useState('')
    const [description, setDescription] = useState('')
    const [isSaving, setIsSaving] = useState(false)

    const reset = () => {
        setStep('capture')
        setPreviewUrl(null)
        setGroupName('')
        setDescription('')
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
            const result = await analyzeGroupImage(base64)

            if (result.error) {
                console.error(result.error)
                setGroupName('New Group') // Fallback
            } else {
                setGroupName(result.suggestedName || '')
                setDescription(result.description || '')
            }
            setStep('confirm')
        }
        reader.readAsDataURL(file)
    }

    const handleSave = async () => {
        setIsSaving(true)
        try {
            const { data, error } = await supabase.from('groups').insert({
                name: groupName,
                parent_id: parentId || null,
                icon: 'Box' // Default icon
            }).select('id').single()

            if (error) throw error

            // Generate embedding in background (don't wait for it)
            if (data?.id) {
                generateGroupEmbedding(data.id).catch(err =>
                    console.error('Failed to generate embedding:', err)
                )
            }

            router.refresh()
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
                    Scan & Add Group
                </div>
            }
            maxWidth="md"
        >
            <div className="text-center sm:text-left sm:mt-2">
                {/* STEP: CAPTURE */}
                {step === 'capture' && (
                    <div className="py-8 space-y-4 text-center">
                        <div className="w-20 h-20 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                            <Camera className="w-8 h-8 text-neutral-500" />
                        </div>
                        <p className="text-neutral-400 text-sm">
                            Take a photo of items to automatically create a category.
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
                        <p className="text-neutral-500 text-xs">Identifying objects and suggesting a category name.</p>
                    </div>
                )}

                {/* STEP: CONFIRM */}
                {step === 'confirm' && (
                    <div className="space-y-4 text-left">
                        {previewUrl && (
                            <div className="w-full h-32 rounded-lg overflow-hidden border border-neutral-700 mb-4">
                                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-neutral-400 mb-1">Group Name</label>
                            <input
                                type="text"
                                value={groupName}
                                onChange={e => setGroupName(e.target.value)}
                                className="w-full bg-neutral-900 border border-neutral-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-accent-main"
                            />
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button variant="secondary" onClick={reset} className="flex-1">Retake</Button>
                            <Button
                                variant="primary"
                                onClick={handleSave}
                                isLoading={isSaving}
                                disabled={!groupName}
                                className="flex-1"
                            >
                                Add Group
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    )
}

