'use client'

import { SuggestionCloudsTest } from '@/components/admin/SuggestionCloudsTest'
import { Compass, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

export default function SuggestionCloudsPage() {
    const t = useTranslations('SuggestionTests')

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link
                    href="/admin"
                    className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-zinc-500" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <Compass className="w-6 h-6 text-indigo-500" />
                        {t('title')}
                    </h1>
                    <p className="text-zinc-500 dark:text-zinc-400">
                        {t('subtitle')}
                    </p>
                </div>
            </div>

            <SuggestionCloudsTest />
        </div>
    )
}
