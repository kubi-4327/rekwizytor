'use client'

import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'
import { MessageSquare, FileText, ArrowRight } from 'lucide-react'
import { format } from 'date-fns'
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
                <MessageSquare className="h-8 w-8 text-neutral-700 mb-3" />
                <p className="text-neutral-500 text-sm">{t('noMentions')}</p>
            </div>
        )
    }

    return (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 overflow-hidden">
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
                <h3 className="text-lg font-medium text-white flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-action-primary" />
                    {t('recentMentions')}
                </h3>
            </div>
            <div className="divide-y divide-neutral-800">
                {mentions.map((mention) => (
                    <Link
                        key={mention.id}
                        href={`/notes/${mention.note_id}`}
                        className="block p-4 hover:bg-neutral-800/50 transition-colors group"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <FileText className="h-4 w-4 text-neutral-500" />
                                    <span className="text-white font-medium truncate">
                                        {mention.note.title}
                                    </span>
                                    {mention.note.performance && (
                                        <span
                                            className="text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider truncate max-w-[120px]"
                                            style={{
                                                backgroundColor: `${mention.note.performance.color || '#d97706'}20`,
                                                color: mention.note.performance.color || '#d97706'
                                            }}
                                        >
                                            {mention.note.performance.title}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-neutral-400">
                                    {t('mentionedIn', { title: mention.note.title })}
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-xs text-neutral-600 whitespace-nowrap">
                                    {format(new Date(mention.created_at), 'MMM d', { locale: dateLocale })}
                                </span>
                                <ArrowRight className="h-4 w-4 text-neutral-600 group-hover:text-white transition-colors" />
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    )
}
