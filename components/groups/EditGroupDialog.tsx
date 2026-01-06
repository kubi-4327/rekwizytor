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

type Group = Pick<Database['public']['Tables']['groups']['Row'], 'id' | 'name' | 'icon' | 'location_id'>

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

export function EditGroupDialog({ group, isOpen, onClose }: Props) {
    const t = useTranslations('Groups')
    const supabase = createClient()
    const router = useRouter()

    const [name, setName] = useState('')
    const [selectedIcon, setSelectedIcon] = useState<string | null>(null)
    const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [locations, setLocations] = useState<{ id: string, name: string }[]>([])

    useEffect(() => {
        const fetchLocations = async () => {
            const { data } = await supabase.from('locations').select('id, name').order('name')
            if (data) setLocations(data)
        }
        fetchLocations()
    }, [])

    useEffect(() => {
        if (isOpen && group) {
            setName(group.name)
            setSelectedIcon(group.icon || 'Folder')
            setSelectedLocationId(group.location_id || null)
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
                    icon: iconToSave,
                    location_id: selectedLocationId === 'null' ? null : selectedLocationId
                })
                .eq('id', group.id)

            if (error) throw error
            router.refresh()
            onClose()
        } catch (error) {
            console.error('Failed to save icon:', error)
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
