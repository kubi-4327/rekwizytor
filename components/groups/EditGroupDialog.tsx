'use client'

import { Fragment, useState, useEffect } from 'react'
import {
    X,
    Folder
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'

import { ICONS, KEYWORD_MAPPINGS, getIconComponent } from '@/utils/icon-map'
import { useTranslations } from 'next-intl'
import { createClient } from '@/utils/supabase/client'
import { Database } from '@/types/supabase'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

type Group = Pick<Database['public']['Tables']['groups']['Row'],
    'id' | 'name' | 'icon'>

type Props = {
    group: Group | null
    isOpen: boolean
    onClose: () => void
}



const getSuggestedIcons = (inputName: string): typeof ICONS => {
    if (!inputName) return []

    const lowerName = inputName.toLowerCase()
    const suggestions = new Set<string>()

    // Check mappings
    Object.entries(KEYWORD_MAPPINGS).forEach(([keyword, icons]) => {
        if (lowerName.includes(keyword) || keyword.includes(lowerName)) {
            icons.forEach(icon => suggestions.add(icon))
        }
    })

    // Check direct name matches (fuzzy)
    ICONS.forEach(item => {
        if (item.name.toLowerCase().includes(lowerName)) {
            suggestions.add(item.name)
        }
    })

    // Return top 5 icon objects
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
    const [searchTerm, setSearchTerm] = useState('')
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        if (group) {
            setName(group.name)

            // Auto-assign logic:
            // 1. Use existing icon if any
            // 2. Try to find suggested icon from name (first match)
            // 3. Fallback to 'Folder'
            const suggested = getSuggestedIcons(group.name)
            const autoIcon = group.icon || suggested[0]?.name || 'Folder'

            setSelectedIcon(autoIcon)
        }
    }, [group])

    const handleSave = async () => {
        if (!group) return
        setIsSaving(true)
        try {
            const { error } = await supabase
                .from('groups')
                .update({
                    name,
                    icon: selectedIcon
                })
                .eq('id', group.id)

            if (error) throw error

            router.refresh()
            onClose()
        } catch (error) {
            console.error('Failed to update group:', error)
        } finally {
            setIsSaving(false)
        }
    }

    // Helper text for translation fallback
    const labelTitle = t('editGroup', { defaultMessage: 'Edit Group' })
    const labelName = t('name', { defaultMessage: 'Name' })
    const labelIcon = t('icon', { defaultMessage: 'Icon' })
    const placeholderSearch = t('searchIcons', { defaultMessage: 'Search icons (e.g. box, krzesło)...' })
    const labelSuggested = t('suggested', { defaultMessage: 'Suggested' })
    const labelCancel = t('cancel', { defaultMessage: 'Cancel' })
    const labelSave = t('save', { defaultMessage: 'Save Changes' })

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={labelTitle}
        >
            <div className="space-y-6 mt-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-neutral-400 mb-2">
                        {labelName}
                    </label>
                    <input
                        type="text"
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="block w-full rounded-md border-0 bg-neutral-900 py-1.5 px-3 text-white shadow-sm ring-1 ring-inset ring-neutral-800 placeholder:text-neutral-500 focus:ring-2 focus:ring-inset focus:ring-white sm:text-sm sm:leading-6"
                    />
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
                    {!searchTerm && getSuggestedIcons(name).length > 0 && (
                        <div className="mb-3">
                            <p className="text-xs text-neutral-500 mb-2">{labelSuggested}</p>
                            <div className="flex gap-2">
                                {getSuggestedIcons(name).map((item) => (
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
                                // Direct name match
                                if (item.name.toLowerCase().includes(lowerSearch)) return true

                                // Reverse lookup in mappings to allow searching by Polish term in the input
                                // E.g. user types "krzesło", we find 'Armchair' in mapping['krzesło']
                                const polishMatches = Object.entries(KEYWORD_MAPPINGS)
                                    .filter(([key]) => key.includes(lowerSearch))
                                    .flatMap(([, icons]) => icons)

                                return polishMatches.includes(item.name)
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

