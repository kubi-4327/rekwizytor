'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, Save, Calendar, Upload, X } from 'lucide-react'
import { compressImage, createThumbnail } from '@/utils/image-processing'
import { extractTopColors } from '@/utils/colors'
import Image from 'next/image'
import DatePicker from 'react-datepicker'
import "react-datepicker/dist/react-datepicker.css"
import { pl } from 'date-fns/locale'
import { useTranslations } from 'next-intl'

export function CreatePerformanceForm() {
    const t = useTranslations('CreatePerformanceForm')
    const [title, setTitle] = useState('')
    const [premiereDate, setPremiereDate] = useState('')
    const [notes, setNotes] = useState('')
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [extractedColors, setExtractedColors] = useState<string[]>([])
    const [selectedColor, setSelectedColor] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isDragging, setIsDragging] = useState(false)

    const router = useRouter()
    const supabase = createClient()

    const processFile = async (file: File) => {
        try {
            // Create preview immediately
            const previewUrl = URL.createObjectURL(file)
            setImagePreview(previewUrl)

            // Extract colors from preview
            const colors = await extractTopColors(previewUrl)
            setExtractedColors(colors)
            if (colors.length > 0) {
                setSelectedColor(colors[0])
            } else {
                setSelectedColor(null)
            }

            setImageFile(file)
        } catch (err) {
            console.error('Error processing image:', err)
        }
    }

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            await processFile(e.target.files[0])
        }
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
    }

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0]
            if (file.type.startsWith('image/')) {
                await processFile(file)
            }
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {

            let imageUrl = null
            let thumbnailUrl = null

            if (imageFile) {
                const fileExt = imageFile.name.split('.').pop()
                const fileName = `${Math.random()}.${fileExt}`
                const thumbnailName = `thumb_${fileName}`

                // Compress main image
                const compressedBlob = await compressImage(imageFile)
                const compressedFile = new File([compressedBlob], fileName, { type: 'image/jpeg' })

                // Create thumbnail
                const thumbnailBlob = await createThumbnail(imageFile, 300)
                const thumbnailFile = new File([thumbnailBlob], thumbnailName, { type: 'image/jpeg' })

                // Upload main image
                const { error: uploadError } = await supabase.storage
                    .from('posters')
                    .upload(fileName, compressedFile)

                if (uploadError) throw uploadError

                // Upload thumbnail
                const { error: thumbError } = await supabase.storage
                    .from('posters')
                    .upload(thumbnailName, thumbnailFile)

                if (thumbError) throw thumbError

                // Get public URLs
                const { data: { publicUrl: publicImgUrl } } = supabase.storage
                    .from('posters')
                    .getPublicUrl(fileName)

                const { data: { publicUrl: publicThumbUrl } } = supabase.storage
                    .from('posters')
                    .getPublicUrl(thumbnailName)

                imageUrl = publicImgUrl
                thumbnailUrl = publicThumbUrl
            }

            const { data: performanceData, error: insertError } = await supabase
                .from('performances')
                .insert({
                    title,
                    premiere_date: premiereDate || null,
                    notes: notes || null,
                    status: (premiereDate && new Date(premiereDate) > new Date()) ? 'upcoming' : 'active',
                    image_url: imageUrl,
                    thumbnail_url: thumbnailUrl,
                    color: selectedColor
                })
                .select()
                .single()

            if (insertError) throw insertError

            // Create Master Note
            if (performanceData) {
                await supabase.from('notes').insert({
                    title: `${title} - Master Note`,
                    performance_id: performanceData.id,
                    content: {
                        type: 'doc',
                        content: [
                            {
                                type: 'heading',
                                attrs: { level: 1 },
                                content: [{ type: 'text', text: `${title} - Master Note` }]
                            },
                            {
                                type: 'paragraph',
                                content: [{ type: 'text', text: notes || 'General information about the performance.' }]
                            }
                        ]
                    },
                    is_master: true
                })
            }

            if (insertError) throw insertError

            router.push('/performances')
            router.refresh()
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message)
            } else {
                setError(t('unknownError'))
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl">
            <div className="space-y-6 bg-neutral-900/50 p-6 rounded-xl border border-neutral-800">
                <div>
                    <label htmlFor="title" className="block text-sm font-medium text-neutral-300">
                        {t('showTitle')} <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        id="title"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="mt-2 block w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-white placeholder-neutral-500 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 sm:text-sm"
                        placeholder={t('titlePlaceholder')}
                    />
                </div>

                {/* Poster Upload */}
                <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                        {t('showPoster')}
                    </label>
                    <div
                        className={`flex items-start gap-6 p-4 rounded-lg border-2 border-dashed transition-colors ${isDragging ? 'border-neutral-500 bg-neutral-800/50' : 'border-transparent'}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <div
                            className="relative w-32 h-48 bg-neutral-950 rounded-lg border border-neutral-800 overflow-hidden flex items-center justify-center shrink-0"
                            style={{ borderColor: selectedColor || undefined }}
                        >
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
                                            setExtractedColors([])
                                            setSelectedColor(null)
                                        }}
                                        className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full hover:bg-black/80"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </>
                            ) : (
                                <div className="text-neutral-600 flex flex-col items-center gap-2">
                                    <Upload className="w-6 h-6" />
                                    <span className="text-xs">{t('noPoster')}</span>
                                </div>
                            )}
                        </div>

                        <div className="flex-1 space-y-4">
                            <div>
                                <input
                                    type="file"
                                    id="poster"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="block w-full text-sm text-neutral-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-neutral-800 file:text-white hover:file:bg-neutral-700"
                                />
                                <p className="mt-2 text-xs text-neutral-500">
                                    {t('uploadPoster')}
                                    <br />
                                    <span className="text-neutral-400">{t('dragDrop')}</span>
                                </p>
                            </div>

                            {extractedColors.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-medium text-neutral-400">{t('selectThemeColor')}</p>
                                    <div className="flex gap-3">
                                        {extractedColors.map((color) => (
                                            <button
                                                key={color}
                                                type="button"
                                                onClick={() => setSelectedColor(color)}
                                                className={`w-8 h-8 rounded-full shadow-sm ring-2 transition-all ${selectedColor === color ? 'ring-white scale-110' : 'ring-transparent hover:scale-105'}`}
                                                style={{ backgroundColor: color }}
                                                title={color}
                                            />
                                        ))}
                                    </div>
                                    {/* Hex code removed as per user request */}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div>
                    <label htmlFor="premiereDate" className="block text-sm font-medium text-neutral-300">
                        {t('premiereDate')}
                    </label>
                    <div className="relative mt-2">
                        <DatePicker
                            selected={premiereDate ? new Date(premiereDate) : null}
                            onChange={(date) => {
                                if (date) {
                                    setPremiereDate(date.toISOString())
                                } else {
                                    setPremiereDate('')
                                }
                            }}
                            dateFormat="dd.MM.yyyy"
                            locale={pl}
                            className="block w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-white placeholder-neutral-500 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 sm:text-sm pl-10"
                            placeholderText={t('datePlaceholder')}
                            wrapperClassName="w-full"
                        />
                        <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500 pointer-events-none" />
                    </div>
                </div>

                <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-neutral-300">
                        {t('notes')}
                    </label>
                    <textarea
                        id="notes"
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="mt-2 block w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-white placeholder-neutral-500 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 sm:text-sm"
                        placeholder={t('notesPlaceholder')}
                    />
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
                    {t('cancel')}
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
                    {t('saveShow')}
                </button>
            </div>
        </form>
    )
}
