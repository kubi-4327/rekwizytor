'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, Upload, Save, X } from 'lucide-react'
import Image from 'next/image'
import { SearchableSelect } from '@/components/ui/SearchableSelect'

type Props = {
    groups: { id: string; name: string }[]
    locations: { id: string; name: string }[]
}

export function CreateItemForm({ groups, locations }: Props) {
    const [name, setName] = useState('')
    const [notes, setNotes] = useState('')
    const [groupId, setGroupId] = useState<string>('')
    const [locationId, setLocationId] = useState<string>('')
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isDraft, setIsDraft] = useState(false)

    const router = useRouter()
    const supabase = createClient()

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0]
            setImageFile(file)
            setImagePreview(URL.createObjectURL(file))
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            let imageUrl = null

            if (imageFile) {
                const fileExt = imageFile.name.split('.').pop()
                const fileName = `${Math.random()}.${fileExt}`
                const filePath = `${fileName}`

                const { error: uploadError } = await supabase.storage
                    .from('item-images')
                    .upload(filePath, imageFile)

                if (uploadError) throw uploadError

                const { data: { publicUrl } } = supabase.storage
                    .from('item-images')
                    .getPublicUrl(filePath)

                imageUrl = publicUrl
            }

            const { error: insertError } = await supabase
                .from('items')
                .insert({
                    name,
                    notes: notes || null,
                    group_id: groupId || null,
                    location_id: locationId || null,
                    image_url: imageUrl,
                    performance_status: 'unassigned',
                    status: isDraft ? 'draft' : 'active'
                })

            if (insertError) throw insertError

            router.push('/items')
            router.refresh()
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message)
            } else {
                setError('An unknown error occurred')
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl">
            <div className="space-y-6 bg-neutral-900/50 p-6 rounded-xl border border-neutral-800">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-neutral-300">
                        Item Name <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        id="name"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="mt-2 block w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-white placeholder-neutral-500 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 sm:text-sm"
                        placeholder="e.g. Vintage Lamp"
                    />
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                        <SearchableSelect
                            label="Group"
                            options={groups}
                            value={groupId}
                            onChange={setGroupId}
                            placeholder="Select a group..."
                        />
                    </div>

                    <div>
                        <SearchableSelect
                            label="Location"
                            options={locations}
                            value={locationId}
                            onChange={setLocationId}
                            placeholder="Select a location..."
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-neutral-300">
                        Notes
                    </label>
                    <textarea
                        id="notes"
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="mt-2 block w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-white placeholder-neutral-500 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 sm:text-sm"
                        placeholder="Any specific details about the item..."
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-neutral-300">
                        Image
                    </label>
                    <div className="mt-2 flex items-center gap-4">
                        <div className="relative h-32 w-32 overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950">
                            {imagePreview ? (
                                <>
                                    <Image
                                        src={imagePreview}
                                        alt="Preview"
                                        fill
                                        className="object-cover"
                                        unoptimized
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setImageFile(null)
                                            setImagePreview(null)
                                        }}
                                        className="absolute top-1 right-1 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </>
                            ) : (
                                <div className="flex h-full w-full items-center justify-center text-neutral-500">
                                    <Upload className="h-8 w-8" />
                                </div>
                            )}
                        </div>
                        <div className="flex-1">
                            <input
                                type="file"
                                id="image"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="block w-full text-sm text-neutral-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-neutral-800 file:text-white hover:file:bg-neutral-700"
                            />
                            <p className="mt-2 text-xs text-neutral-500">
                                JPG, PNG, GIF up to 5MB
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="draft"
                            checked={isDraft}
                            onChange={(e) => setIsDraft(e.target.checked)}
                            className="h-4 w-4 rounded border-neutral-800 bg-neutral-950 text-white focus:ring-neutral-500"
                        />
                        <label htmlFor="draft" className="text-sm font-medium text-neutral-300">
                            Save as Draft (skip AI generation)
                        </label>
                    </div>
                </div>
            </div>

            {error && (
                <div className="rounded-md bg-red-900/20 p-4 text-sm text-red-400 border border-red-900/50">
                    {error}
                </div>
            )}

            <div className="flex justify-end gap-4">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-4 py-2 text-sm font-medium text-neutral-400 hover:text-white"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 focus:ring-offset-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Item
                </button>
            </div>
        </form>
    )
}
