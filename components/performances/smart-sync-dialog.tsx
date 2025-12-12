'use client'

import React from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface Props {
    isOpen: boolean
    onConfirm: () => void
    onCancel: () => void
    onIgnore: () => void
    isSyncing: boolean
}

export function SmartSyncDialog({ isOpen, onConfirm, onCancel, onIgnore, isSyncing }: Props) {
    if (!isOpen) return null

    // Hardcode translations for now or use useTranslations if available context
    // Assuming context is available
    const t = useTranslations('ManageScenesForm')

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60]">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 max-w-md w-full shadow-2xl">
                <div className="flex items-start gap-4 mb-4">
                    <div className="p-3 bg-amber-500/10 rounded-full border border-amber-500/20">
                        <AlertTriangle className="w-6 h-6 text-amber-500" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white mb-1">
                            {t('syncSceneNoteTitle', { defaultMessage: 'Update Scene Note?' })}
                        </h3>
                        <p className="text-sm text-neutral-400">
                            {t('syncSceneNoteDescription', { defaultMessage: 'Do you want to synchronize your changes (renames, reorders) with the Scene Note? Your text will be moved to match the new scene structure.' })}
                        </p>
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={onConfirm}
                        disabled={isSyncing}
                        className="w-full py-2.5 px-4 bg-ai-primary hover:bg-ai-primary/90 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    >
                        {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        {t('syncAndSave', { defaultMessage: 'Yes, Sync & Save' })}
                    </button>

                    <button
                        onClick={onIgnore}
                        disabled={isSyncing}
                        className="w-full py-2.5 px-4 bg-neutral-800 hover:bg-neutral-700 text-white font-medium rounded-lg transition-colors"
                    >
                        {t('saveOnly', { defaultMessage: 'No, just Save Scenes' })}
                    </button>

                    <button
                        onClick={onCancel}
                        disabled={isSyncing}
                        className="w-full py-2 px-4 text-neutral-400 hover:text-white text-sm transition-colors"
                    >
                        {t('cancel', { defaultMessage: 'Cancel' })}
                    </button>
                </div>
            </div>
        </div>
    )
}
