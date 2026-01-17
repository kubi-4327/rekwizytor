'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Save, Calendar, Upload, X, Globe, ArrowDownToLine, ArrowRight, SkipForward } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { compressImage, createThumbnail } from '@/utils/image-processing'
import { extractTopColors } from '@/utils/colors'
import Image from 'next/image'
import DatePicker from 'react-datepicker'
import "react-datepicker/dist/react-datepicker.css"
import { pl } from 'date-fns/locale'
import { useTranslations } from 'next-intl'
import { Database } from '@/types/supabase'
import { scrapePerformance } from '@/app/actions/scrape-performance'
import { refreshSearchIndex } from '@/app/actions/unified-search'
import { motion, AnimatePresence } from 'framer-motion'

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
    const [scrapeUrl, setScrapeUrl] = useState('')
    const [isScraping, setIsScraping] = useState(false)
    const [upcomingDates, setUpcomingDates] = useState<string[]>([])
    const [step, setStep] = useState<'import' | 'edit'>('import')

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

    const base64ToBlob = (dataURI: string) => {
        const splitDataURI = dataURI.split(',')
        const byteString = splitDataURI[0].indexOf('base64') >= 0 ? atob(splitDataURI[1]) : decodeURI(splitDataURI[1])
        const mimeString = splitDataURI[0].split(':')[1].split(';')[0]
        const ia = new Uint8Array(byteString.length)
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i)
        }
        return new Blob([ia], { type: mimeString })
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
                // ... (existing upload logic)
                const fileName = `${Math.random()}.${fileExt}`
                const thumbnailName = `thumb_${fileName}`

                // Compress main image
                const compressedBlob = await compressImage(imageFile)
                const compressedFile = new File([compressedBlob], fileName, { type: 'image/jpeg' })

                // Create thumbnail (No crop for posters, just resize)
                const thumbnailBlob = await createThumbnail(imageFile, 300, false)
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
                thumbnailUrl = publicThumbUrl
            } else if (imagePreview && imagePreview.startsWith('data:')) {
                // Handle Base64 image from scraper
                try {
                    // Convert base64 to blob using manual helper
                    const blob = base64ToBlob(imagePreview)
                    const fileExt = blob.type.split('/')[1] || 'jpeg'
                    const fileName = `${Math.random()}.${fileExt}`
                    const thumbnailName = `thumb_${fileName}`

                    // Create file from blob
                    const file = new File([blob], fileName, { type: blob.type })

                    // Compress main image (re-use existing compression logic if possible, or upload directly)
                    // For safety, let's treat it like a user upload
                    const compressedBlob = await compressImage(file)
                    const compressedFile = new File([compressedBlob], fileName, { type: 'image/jpeg' })

                    // Create thumbnail (No crop for posters)
                    const thumbnailBlob = await createThumbnail(file, 300, false)
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

                } catch (e) {
                    console.error('Error uploading scraped image:', e)
                    // Fallback?? If upload fail, we might just not save image or save base64 (bad idea for DB)
                    // Let's just log error.
                }
            } else if (imagePreview && imagePreview.startsWith('http')) {
                // Use scraped image URL directly if it's a remote URL
                imageUrl = imagePreview
                thumbnailUrl = imagePreview // Or leave null if we don't have a specific thumb
            }

            const { data: performanceData, error: insertError } = await supabase
                .from('performances')
                .insert({
                    title,
                    premiere_date: premiereDate || null,
                    notes: notes || null,
                    status: ((premiereDate && new Date(premiereDate) > new Date()) ? 'upcoming' : 'active') as Database["public"]["Enums"]["performance_status_enum"],
                    image_url: imageUrl,
                    thumbnail_url: thumbnailUrl,
                    color: selectedColor
                })
                .select()
                .single()

            if (insertError) throw insertError

            // Create Group for the performance
            const { data: groupData, error: groupError } = await supabase
                .from('groups')
                .insert({
                    name: title,
                    color: selectedColor,
                    performance_id: performanceData.id
                })
                .select('id')
                .single()

            if (groupError) {
                console.error('Error creating group:', groupError)
            } else if (groupData) {
                // Generate embedding in background
                import('@/app/actions/generate-group-embeddings').then(({ generateGroupEmbedding }) => {
                    generateGroupEmbedding(groupData.id).catch(err =>
                        console.error('Failed to generate embedding:', err)
                    )
                })
            }

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

            // Add scheduled shows if any
            // Add scheduled shows if any
            if (upcomingDates.length > 0 && performanceData) {
                // 1. Create a default scene first (required for checklists)
                const { error: sceneError } = await supabase
                    .from('scenes')
                    .insert({
                        performance_id: performanceData.id,
                        act_number: 1,
                        scene_number: 1,
                        name: 'Scene 1'
                    })

                if (sceneError) {
                    console.error('Error creating default scene:', sceneError)
                } else {
                    // 2. Create scene_checklists for each date
                    const checklistsToInsert = upcomingDates.map(dateStr => ({
                        performance_id: performanceData.id,
                        show_date: dateStr,
                        scene_number: '1',
                        scene_name: 'Scene 1',
                        type: 'show',
                        is_active: false
                    }))

                    const { error: showsError } = await supabase
                        .from('scene_checklists')
                        .insert(checklistsToInsert)

                    if (showsError) console.error('Error adding scheduled shows:', showsError)
                }
            }

            // Refresh search index
            try {
                await refreshSearchIndex()
            } catch (e) {
                console.error('Failed to refresh search index:', e)
            }

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

    const handleScrape = async () => {
        if (!scrapeUrl) return
        setIsScraping(true)
        setError(null)
        setUpcomingDates([])

        try {
            const result = await scrapePerformance(scrapeUrl)

            if (result.success && result.data) {
                const data = result.data

                if (data.title) setTitle(data.title)

                const scrapedDesc = data.description || ''
                if (scrapedDesc) setNotes(scrapedDesc)

                if (data.premiereDate) {
                    setPremiereDate(data.premiereDate)
                }

                if (data.imageUrl) {
                    console.log('[Client] Received image URL from scraper:', data.imageUrl.substring(0, 50) + '...')
                    setImagePreview(data.imageUrl)
                    setImageFile(null) // Clear any local file

                    try {
                        console.log('[Client] Attempting to extract colors...')
                        const colors = await extractTopColors(data.imageUrl)
                        console.log('[Client] Extracted colors:', colors)
                        if (colors.length > 0) {
                            setExtractedColors(colors)
                            setSelectedColor(colors[0])
                        }
                    } catch (e) {
                        console.warn('[Client] Could not extract colors from remote image', e)
                    }
                } else {
                    console.log('[Client] No image URL returned from scraper.')
                }

                if (data.dates && data.dates.length > 0) {
                    setUpcomingDates(data.dates)
                }

                // Move to next step on success
                setStep('edit')
            } else {
                setError(result.error || 'Failed to scrape data')
            }
        } catch (err) {
            console.error(err)
            setError('Error scraping data')
        } finally {
            setIsScraping(false)
        }
    }

    return (
        <div className="w-full">
            <AnimatePresence mode="wait">
                {step === 'import' ? (
                    <motion.div
                        key="import-step"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-8 max-w-2xl mx-auto"
                    >
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold bg-linear-to-r from-white to-neutral-400 bg-clip-text text-transparent">
                                {t('importTitle', { defaultMessage: 'Importuj dane' })}
                            </h2>
                            <p className="text-neutral-400">
                                {t('importDescription', { defaultMessage: 'Wklej link do strony spektaklu aby automatycznie uzupełnić dane.' })}
                            </p>
                        </div>

                        <div className="bg-neutral-900/50 p-8 rounded-xl border border-neutral-800 space-y-6 shadow-xl backdrop-blur-sm">
                            <div className="space-y-4">
                                <label htmlFor="scrapeUrl" className="text-sm font-medium text-neutral-300 flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-blue-400" />
                                    {t('importFromUrl', { defaultMessage: 'Importuj ze strony teatru' })}
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="url"
                                        id="scrapeUrl"
                                        value={scrapeUrl}
                                        onChange={(e) => setScrapeUrl(e.target.value)}
                                        className="flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-3 text-white placeholder-neutral-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm transition-all"
                                        placeholder="https://teatr-rozrywki.pl/..."
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleScrape();
                                            }
                                        }}
                                    />
                                    <Button
                                        type="button"
                                        onClick={handleScrape}
                                        disabled={isScraping || !scrapeUrl}
                                        isLoading={isScraping}
                                        variant="glassy-primary"
                                        leftIcon={<ArrowRight className="w-4 h-4" />}
                                    >
                                        {t('next', { defaultMessage: 'Dalej' })}
                                    </Button>
                                </div>
                            </div>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-neutral-800" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-neutral-900 px-2 text-neutral-500">
                                        Lub
                                    </span>
                                </div>
                            </div>

                            <Button
                                type="button"
                                onClick={() => setStep('edit')}
                                variant="glassy-secondary"
                                className="w-full justify-center"
                                leftIcon={<SkipForward className="w-4 h-4" />}
                            >
                                {t('manualEntry', { defaultMessage: 'Wypełnij ręcznie (Pomiń import)' })}
                            </Button>
                        </div>

                        {error && (
                            <div className="rounded-md bg-red-900/20 p-4 text-sm text-red-400 border border-red-900/50">
                                {error}
                            </div>
                        )}

                        <div className="flex justify-end pt-4">
                            <Button
                                type="button"
                                variant="glassy-secondary"
                                onClick={() => router.back()}
                                className="text-neutral-400 hover:text-white"
                            >
                                {t('cancel')}
                            </Button>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="edit-step"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="max-w-5xl mx-auto"
                    >
                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-semibold text-white">{t('fillDetails', { defaultMessage: 'Uzupełnij szczegóły' })}</h2>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setStep('import')}
                                    className="text-neutral-400 hover:text-white text-xs"
                                >
                                    {t('backToImport', { defaultMessage: 'Wróć do importu' })}
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 bg-neutral-900/50 p-6 rounded-xl border border-neutral-800">
                                {/* Left Column: Image Upload */}
                                <div className="md:col-span-1 space-y-4">
                                    <label className="block text-sm font-medium text-neutral-300">
                                        {t('showPoster')}
                                    </label>
                                    <div
                                        className={`flex flex-col items-center gap-4 p-4 rounded-lg border-2 border-dashed transition-colors ${isDragging ? 'border-neutral-500 bg-neutral-800/50' : 'border-transparent bg-neutral-900/30'}`}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                    >
                                        <div
                                            className="relative w-full aspect-2/3 bg-neutral-950 rounded-lg border border-neutral-800 overflow-hidden flex items-center justify-center shrink-0 shadow-lg"
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
                                                        onError={(e) => console.error('[Client] Image preview failed to load:', e)}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setImageFile(null)
                                                            setImagePreview(null)
                                                            setExtractedColors([])
                                                            setSelectedColor(null)
                                                        }}
                                                        className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-full hover:bg-black/80 transition-colors"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </>
                                            ) : (
                                                <div className="text-neutral-600 flex flex-col items-center gap-3 p-4 text-center">
                                                    <Upload className="w-10 h-10 opacity-50" />
                                                    <span className="text-xs">{t('noPoster')}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="w-full space-y-4">
                                            <div>
                                                <input
                                                    type="file"
                                                    id="poster"
                                                    accept="image/*"
                                                    onChange={handleImageChange}
                                                    className="hidden"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    size="sm"
                                                    className="w-full text-xs"
                                                    onClick={() => document.getElementById('poster')?.click()}
                                                >
                                                    {t('selectImage', { defaultMessage: 'Wybierz grafikę' })}
                                                </Button>
                                                <div className="mt-3 text-center space-y-1">
                                                    <p className="text-[10px] text-neutral-400 leading-tight">
                                                        {t('uploadPoster')}
                                                    </p>
                                                    <p className="text-[10px] text-neutral-500">
                                                        {t('dragDrop')}
                                                    </p>
                                                </div>
                                            </div>

                                            {extractedColors.length > 0 && (
                                                <div className="space-y-2 pt-2 border-t border-neutral-800">
                                                    <p className="text-xs font-medium text-neutral-400 text-center">{t('selectThemeColor')}</p>
                                                    <div className="flex gap-2 justify-center flex-wrap">
                                                        {extractedColors.map((color) => (
                                                            <button
                                                                key={color}
                                                                type="button"
                                                                onClick={() => setSelectedColor(color)}
                                                                className={`w-6 h-6 rounded-full shadow-sm ring-2 transition-all ${selectedColor === color ? 'ring-white scale-110' : 'ring-transparent hover:scale-105'}`}
                                                                style={{ backgroundColor: color }}
                                                                title={color}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Fields */}
                                <div className="md:col-span-2 space-y-6">
                                    {upcomingDates.length > 0 && (
                                        <div className="p-4 bg-green-900/10 border border-green-900/30 rounded-lg flex items-start gap-3">
                                            <Calendar className="w-5 h-5 text-green-400 mt-0.5" />
                                            <div>
                                                <h4 className="text-sm font-medium text-green-400">{t('scheduleImported', { defaultMessage: 'Pobrano harmonogram' })}</h4>
                                                <p className="text-xs text-green-500/80 mt-1">
                                                    {t('datesFound', { count: upcomingDates.length, defaultMessage: `Znaleziono ${upcomingDates.length} terminów do zaplanowania.` })}
                                                    {' '}{t('scheduleImportedDesc', { defaultMessage: 'Te terminy zostaną automatycznie dodane po zapisaniu.' })}
                                                </p>
                                            </div>
                                        </div>
                                    )}

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
                                            rows={6}
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            className="mt-2 block w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-white placeholder-neutral-500 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 sm:text-sm"
                                            placeholder={t('notesPlaceholder')}
                                        />
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="rounded-md bg-red-900/20 p-4 text-sm text-red-400 border border-red-900/50">
                                    {error}
                                </div>
                            )}

                            <div className="flex justify-end gap-4">
                                <Button
                                    type="button"
                                    variant="glassy-secondary"
                                    onClick={() => router.back()}
                                    className="text-neutral-400 hover:text-white"
                                >
                                    {t('cancel')}
                                </Button>
                                <Button
                                    type="submit"
                                    variant="glassy-success"
                                    isLoading={loading}
                                    leftIcon={<Save className="w-4 h-4" />}
                                >
                                    {t('saveShow')}
                                </Button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
