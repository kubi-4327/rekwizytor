'use client'

import { useState, useEffect } from 'react'
import { Folder } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { ICONS, getIconComponent } from '@/utils/icon-map'
import { KEYWORD_MAPPINGS } from '@/utils/icon-matcher'
import { useTranslations } from 'next-intl'
import { createClient } from '@/utils/supabase/client'
import { Database } from '@/types/supabase'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

type Group = Pick<Database['public']['Tables']['groups']['Row'], 'id' | 'name' | 'icon' | 'location_id' | 'description' | 'performance_id' | 'color'>

type Props = {
    group: Group | null
    isOpen: boolean
    onClose: () => void
    parentId?: string | null
}

const getSuggestedIcons = (inputName: string): typeof ICONS => {
    if (!inputName) return []
    const lowerName = inputName.toLowerCase()
    const suggestions = new Set<string>()

    Object.entries(KEYWORD_MAPPINGS).forEach(([iconName, keywords]) => {
        if (keywords.some(k => lowerName.includes(k) || k.includes(lowerName))) {
            suggestions.add(iconName)
        }
    })

    ICONS.forEach(item => {
        if (item.name.toLowerCase().includes(lowerName)) {
            suggestions.add(item.name)
        }
    })

    return Array.from(suggestions)
        .map(name => ICONS.find(i => i.name === name))
        .filter((i): i is typeof ICONS[0] => !!i)
        .slice(0, 5)
}

const PLACEHOLDERS = [
    "np. Uwaga na szkło, delikatne elementy...",
    "np. Spakować dnem do góry, użyć folii bąbelkowej...",
    "np. Komplet zawiera 6 elementów, sprawdzić przed zamknięciem...",
    "np. Przechowywać z dala od wilgoci...",
    "np. Tylko do transportu pionowego..."
]

const COLOR_PALETTE = [
    '#3b82f6', // Blue
    '#ef4444', // Red
    '#22c55e', // Green
    '#eab308', // Yellow
    '#f97316', // Orange
    '#a855f7', // Purple
    '#ec4899', // Pink
    '#6366f1', // Indigo
    '#737373', // Neutral
]



export function EditGroupDialog({ group, isOpen, onClose }: Props) {
    const t = useTranslations('Groups')
    const supabase = createClient()
    const router = useRouter()

    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [selectedColor, setSelectedColor] = useState<string>('#3b82f6')
    const [selectedIcon, setSelectedIcon] = useState<string | null>(null)
    const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)
    const [selectedPerformanceId, setSelectedPerformanceId] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [locations, setLocations] = useState<{ id: string, name: string }[]>([])
    const [performances, setPerformances] = useState<{ id: string, title: string }[]>([])
    const [placeholderIndex, setPlaceholderIndex] = useState(0)

    useEffect(() => {
        const fetchData = async () => {
            const { data: locData } = await supabase.from('locations').select('id, name').order('name')
            if (locData) setLocations(locData)

            const { data: perfData } = await supabase.from('performances').select('id, title').order('title')
            if (perfData) setPerformances(perfData)
        }
        fetchData()
    }, [])

    useEffect(() => {
        const interval = setInterval(() => {
            setPlaceholderIndex(prev => (prev + 1) % PLACEHOLDERS.length)
        }, 3000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        if (isOpen && group) {
            setName(group.name)
            setDescription(group.description || '')
            setSelectedIcon(group.icon || 'Folder')
            setSelectedColor(group.color || '#3b82f6')
            setSelectedLocationId(group.location_id || null)
            setSelectedPerformanceId(group.performance_id || null)
            setSearchTerm('')
        }
    }, [isOpen, group])

    const handleSave = async () => {
        if (!group) return

        setIsSaving(true)
        try {
            const iconToSave = selectedIcon || 'Folder'
            const { error } = await supabase
                .from('groups')
                .update({
                    name,
                    description: description || null,
                    icon: iconToSave,
                    location_id: selectedLocationId === 'null' ? null : selectedLocationId,
                    performance_id: selectedPerformanceId === 'null' ? null : selectedPerformanceId
                })
                .eq('id', group.id)

            if (error) throw error
            router.refresh()
            onClose()
        } catch (error) {
            console.error('Failed to save group:', error)
        } finally {
            setIsSaving(false)
        }
    }

    if (!group) return null

    const labelIcon = t('icon', { defaultMessage: 'Ikona' })
    const placeholderSearch = t('searchIcons', { defaultMessage: 'Szukaj ikon...' })
    const labelSuggested = t('suggested', { defaultMessage: 'Sugerowane' })
    const labelCancel = t('cancel', { defaultMessage: 'Anuluj' })
    const labelSave = t('save', { defaultMessage: 'Zapisz' })

    const suggestedIcons = getSuggestedIcons(group.name)

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Edytuj grupę: ${group.name}`}
        >
            <div className="space-y-6 mt-4">
                <div>
                    <label className="block text-sm font-medium text-neutral-400 mb-2">
                        {t('name', { defaultMessage: 'Nazwa' })}
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="block w-full rounded-md border-0 bg-neutral-900 py-1.5 px-3 text-white shadow-sm ring-1 ring-inset ring-neutral-800 placeholder:text-neutral-500 focus:ring-2 focus:ring-inset focus:ring-amber-500 sm:text-sm sm:leading-6"
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-neutral-400 mb-2">
                            Lokalizacja
                        </label>
                        <select
                            value={selectedLocationId || 'null'}
                            onChange={(e) => setSelectedLocationId(e.target.value)}
                            className="block w-full rounded-md border-0 bg-neutral-900 py-1.5 px-3 text-white shadow-sm ring-1 ring-inset ring-neutral-800 focus:ring-2 focus:ring-inset focus:ring-amber-500 sm:text-sm sm:leading-6"
                        >
                            <option value="null">Brak przypisania</option>
                            {locations.map(loc => (
                                <option key={loc.id} value={loc.id}>
                                    {loc.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-neutral-400 mb-2">
                            {t('performance', { defaultMessage: 'Spektakl' })}
                        </label>
                        <select
                            value={selectedPerformanceId || 'null'}
                            onChange={(e) => setSelectedPerformanceId(e.target.value)}
                            className="block w-full rounded-md border-0 bg-neutral-900 py-1.5 px-3 text-white shadow-sm ring-1 ring-inset ring-neutral-800 focus:ring-2 focus:ring-inset focus:ring-amber-500 sm:text-sm sm:leading-6"
                        >
                            <option value="null">{t('noPerformance', { defaultMessage: 'Brak przypisania' })}</option>
                            {performances.map(perf => (
                                <option key={perf.id} value={perf.id}>
                                    {perf.title}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="text-sm font-medium text-neutral-400 mb-2 flex justify-between items-center">
                        {t('description', { defaultMessage: 'Instrukcja / Notatki' })}
                        <span className="text-xs text-neutral-600 font-normal">Opcjonalne</span>
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={PLACEHOLDERS[placeholderIndex]}
                        rows={3}
                        className="block w-full rounded-md border-0 bg-neutral-900 py-1.5 px-3 text-white shadow-sm ring-1 ring-inset ring-neutral-800 placeholder:text-neutral-600 focus:ring-2 focus:ring-inset focus:ring-amber-500 sm:text-sm sm:leading-6 transition-all duration-500 placeholder:transition-opacity"
                    />
                </div>

                {/* Color Selection */}
                <div>
                    <label className="block text-sm font-medium text-neutral-400 mb-2">
                        Kolor
                    </label>
                    {selectedPerformanceId ? (
                        <div className="flex items-center gap-2 text-sm text-neutral-500 bg-neutral-800/50 p-2 rounded-md border border-neutral-800">
                            <div className="w-4 h-4 rounded-full bg-neutral-600 opacity-50" />
                            Kolor przypisany do spektaklu
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {COLOR_PALETTE.map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => setSelectedColor(color)}
                                    className={`w-8 h-8 rounded-full border-2 transition-all ${selectedColor === color
                                        ? 'border-white scale-110'
                                        : 'border-transparent hover:scale-105 hover:border-neutral-500'
                                        }`}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-neutral-400 mb-2">
                        {labelIcon}
                    </label>

                    <div className="mb-4">
                        <input
                            type="text"
                            placeholder={placeholderSearch}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full rounded-md border-0 bg-neutral-900 py-1.5 px-3 text-white shadow-sm ring-1 ring-inset ring-neutral-800 placeholder:text-neutral-500 focus:ring-2 focus:ring-inset focus:ring-white sm:text-sm sm:leading-6"
                        />
                    </div>

                    {/* Suggested Icons */}
                    {!searchTerm && suggestedIcons.length > 0 && (
                        <div className="mb-3">
                            <p className="text-xs text-neutral-500 mb-2">{labelSuggested}</p>
                            <div className="flex gap-2">
                                {suggestedIcons.map((item) => (
                                    <button
                                        key={`suggested-${item.name}`}
                                        onClick={() => setSelectedIcon(item.name)}
                                        className={`p-2 rounded-md flex items-center justify-center transition-colors border border-neutral-700 ${selectedIcon === item.name
                                            ? 'bg-white text-black'
                                            : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
                                            }`}
                                        title={item.name}
                                    >
                                        <item.icon className="w-5 h-5" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-6 gap-2 max-h-60 overflow-y-auto p-2 bg-neutral-900 rounded-md border border-neutral-800">
                        {ICONS
                            .filter(item => {
                                const lowerSearch = searchTerm.toLowerCase()
                                if (item.name.toLowerCase().includes(lowerSearch)) return true
                                const matchingIcons = Object.entries(KEYWORD_MAPPINGS)
                                    .filter(([, keywords]) => keywords.some(k => k.includes(lowerSearch)))
                                    .map(([iconName]) => iconName)
                                return matchingIcons.includes(item.name)
                            })
                            .map((item) => (
                                <button
                                    key={item.name}
                                    onClick={() => setSelectedIcon(item.name)}
                                    className={`p-2 rounded-md flex items-center justify-center transition-colors ${selectedIcon === item.name
                                        ? 'bg-white text-black'
                                        : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
                                        }`}
                                    title={item.name}
                                >
                                    <item.icon className="w-5 h-5" />
                                </button>
                            ))}
                    </div>
                </div>
            </div>

            <div className="mt-5 sm:mt-6 flex gap-3">
                <Button
                    type="button"
                    variant="secondary"
                    onClick={onClose}
                    className="w-full"
                >
                    {labelCancel}
                </Button>
                <Button
                    type="button"
                    variant="primary"
                    onClick={handleSave}
                    isLoading={isSaving}
                    className="w-full"
                >
                    {labelSave}
                </Button>
            </div>
        </Modal>
    )
}
