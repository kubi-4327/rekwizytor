'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'

type Props = {
    isOpen: boolean
    onClose: () => void
    onConfirm: (name: string, type?: string) => void
    title: string
    type?: 'location' | 'group'
    initialName?: string
    initialType?: string
    confirmLabel?: string
}

export function CreateStructureDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    type = 'group',
    initialName = '',
    initialType = 'other',
    confirmLabel
}: Props) {
    const t = useTranslations('Structure')
    const [name, setName] = useState(initialName)
    const [locationType, setLocationType] = useState(initialType)

    // Reset state when dialog opens with new initial values
    // We can use a key on the component or useEffect, but key is cleaner in parent
    // However, since we are reusing the same dialog instance in parent (likely), we might need useEffect
    // Or just rely on parent passing key.
    // Let's use useEffect to sync initial values when isOpen changes to true

    // Actually, simpler to just use key={isOpen ? 'open' : 'closed'} or similar in parent, 
    // OR just use useEffect here.

    // Let's use useEffect
    const [prevIsOpen, setPrevIsOpen] = useState(isOpen)
    if (isOpen !== prevIsOpen) {
        setPrevIsOpen(isOpen)
        if (isOpen) {
            setName(initialName)
            setLocationType(initialType)
        }
    }

    if (!isOpen) return null

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return
        onConfirm(name, type === 'location' ? locationType : undefined)
        setName('')
        onClose()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-md shadow-2xl">
                <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white">{title}</h2>
                    <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-neutral-400 mb-1">
                            {t('name')}
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600 transition-colors"
                            placeholder={t('namePlaceholder')}
                            autoFocus
                        />
                    </div>

                    {type === 'location' && (
                        <div>
                            <label className="block text-sm font-medium text-neutral-400 mb-1">
                                {t('type')}
                            </label>
                            <select
                                value={locationType}
                                onChange={(e) => setLocationType(e.target.value)}
                                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-neutral-600 transition-colors"
                            >
                                <option value="main_storage">{t('types.main_storage')}</option>
                                <option value="backstage">{t('types.backstage')}</option>
                                <option value="stage">{t('types.stage')}</option>
                                <option value="other">{t('types.other')}</option>
                            </select>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors"
                        >
                            {t('cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={!name.trim()}
                            className="px-4 py-2 text-sm font-medium text-black bg-white rounded-md hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {confirmLabel || t('create')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
