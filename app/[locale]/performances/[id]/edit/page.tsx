import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { EditPerformanceForm } from '@/components/performances/EditPerformanceForm'
import { getTranslations } from 'next-intl/server'

type Props = {
    params: Promise<{ id: string }>
}

export default async function EditPerformancePage({ params }: Props) {
    const { id } = await params
    const supabase = await createClient()
    const t = await getTranslations('EditPerformance')

    const { data: performance } = await supabase
        .from('performances')
        .select('*')
        .eq('id', id)
        .single()

    if (!performance) {
        notFound()
    }

    return (
        <div className="p-6 md:p-10 max-w-3xl mx-auto space-y-8">
            <div>
                <Link href={`/performances/${id}`} className="inline-flex items-center text-sm text-neutral-400 hover:text-white mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t('backToProduction')}
                </Link>
                <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
                <p className="text-neutral-400 text-sm mt-1">
                    {t('subtitle', { title: performance.title })}
                </p>
            </div>

            <EditPerformanceForm performance={performance} />
        </div>
    )
}
