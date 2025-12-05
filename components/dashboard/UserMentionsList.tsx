'use client'

import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'
import { MessageSquare, FileText, ArrowRight, Bell } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { pl, enUS } from 'date-fns/locale'

interface NoteMention {
    id: string
    note_id: string
    created_at: string
    note: {
        id: string
        title: string
        performance_id: string | null
        performance: {
            title: string
            color: string | null
        } | null
    }
}

interface UserMentionsListProps {
    mentions: NoteMention[]
}

export function UserMentionsList({ mentions }: UserMentionsListProps) {
    const t = useTranslations('Dashboard')
    const locale = useLocale()
    const dateLocale = locale === 'pl' ? pl : enUS

    if (!mentions || mentions.length === 0) {
        return (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 flex flex-col items-center justify-center text-center min-h-[150px]">
                <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center mb-3">
                    <Bell className="h-6 w-6 text-neutral-600" />
                </div>
                <p className="text-neutral-500 text-sm">{t('noMentions')}</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
                <Bell className="h-5 w-5 text-action-primary" />
                {t('recentMentions')}
            </h3>
            <div className="space-y-3">
                {mentions.map((mention) => (
                    <Link
                        key={mention.id}
                        href={`/notes/${mention.note_id}`}
                        className="block group relative overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 hover:border-neutral-700 hover:bg-neutral-900 transition-all duration-200"
                    >
                        <div className="flex items-start gap-4">
                            <div className="p-2 rounded-lg bg-action-primary/10 text-action-primary flex-shrink-0">
                                <MessageSquare className="h-5 w-5" />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                    <span className="text-sm font-medium text-white truncate group-hover:text-action-primary transition-colors">
                                        {mention.note.title}
                                    </span>
                                    <span className="text-xs text-neutral-500 whitespace-nowrap">
                                        {formatDistanceToNow(new Date(mention.created_at), { addSuffix: true, locale: dateLocale })}
                                    </span>
                                </div>

                                <p className="text-sm text-neutral-400 mb-2">
                                    {t('mentionedIn', { title: mention.note.title })}
                                </p>

                                {mention.note.performance && (
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                                            style={{
                                                backgroundColor: `${mention.note.performance.color || '#d97706'}20`,
                                                color: mention.note.performance.color || '#d97706'
                                            }}
                                        >
                                            {mention.note.performance.title}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <ArrowRight className="h-4 w-4 text-neutral-600 group-hover:text-white group-hover:translate-x-1 transition-all self-center" />
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    )
}
