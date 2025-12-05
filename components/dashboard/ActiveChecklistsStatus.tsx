'use client'

import { useTranslations } from 'next-intl'
import { CheckSquare, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface ActiveChecklist {
    id: string
    performance_title: string
    completed: number
    total: number
}

interface ActiveChecklistsStatusProps {
    checklists: ActiveChecklist[]
}

export function ActiveChecklistsStatus({ checklists }: ActiveChecklistsStatusProps) {
    const t = useTranslations('Dashboard')

    if (!checklists || checklists.length === 0) {
        return (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 backdrop-blur-sm p-6 h-full flex flex-col justify-center">
                <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                    <CheckSquare className="h-5 w-5 text-action-primary" />
                    {t('activeChecklists')}
                </h3>
                <p className="text-sm text-neutral-400 mb-4">{t('noActiveChecklists')}</p>
                <Link
                    href="/checklists"
                    className="inline-flex items-center gap-2 text-sm text-action-primary hover:text-action-primary/80 transition-colors"
                >
                    {t('viewLiveView')}
                    <ArrowRight className="h-4 w-4" />
                </Link>
            </div>
        )
    }

    return (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 backdrop-blur-sm p-6 h-full flex flex-col">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-action-primary" />
                {t('activeChecklists')}
            </h3>
            <div className="space-y-4 flex-1">
                {checklists.map((checklist) => {
                    const progress = checklist.total > 0
                        ? Math.round((checklist.completed / checklist.total) * 100)
                        : 0

                    return (
                        <div key={checklist.id} className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-white truncate">
                                    {checklist.performance_title}
                                </span>
                                <span className="text-xs text-neutral-400 ml-2 flex-shrink-0">
                                    {progress}%
                                </span>
                            </div>
                            <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden">
                                <div
                                    className="bg-action-primary h-full rounded-full transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <p className="text-xs text-neutral-500">
                                {t('checklistProgress', {
                                    completed: checklist.completed,
                                    total: checklist.total
                                })}
                            </p>
                        </div>
                    )
                })}
                <Link
                    href="/checklists"
                    className="inline-flex items-center gap-2 text-sm text-action-primary hover:text-action-primary/80 transition-colors mt-2"
                >
                    {t('viewLiveView')}
                    <ArrowRight className="h-4 w-4" />
                </Link>
            </div>
        </div>
    )
}
