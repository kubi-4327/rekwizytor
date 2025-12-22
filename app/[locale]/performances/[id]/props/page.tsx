import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { ManagePropsContent } from '@/components/props/ManagePropsContent'

type Props = {
    params: Promise<{ id: string }>
}

export default async function ManagePropsPage({ params }: Props) {
    const { id } = await params
    const supabase = await createClient()
    const t = await getTranslations('ManageProps')

    // Fetch production details
    const { data: production } = await supabase
        .from('performances')
        .select('title, color')
        .eq('id', id)
        .single()

    if (!production) {
        notFound()
    }

    // Fetch props
    const { data: props } = await supabase
        .from('performance_props')
        .select('*')
        .eq('performance_id', id)
        .order('order', { ascending: true })
        .order('created_at', { ascending: true })

    return (
        <div className="p-4 md:p-10 max-w-5xl mx-auto">
            <div className="mb-8">
                <Link href={`/performances/${id}`} className="inline-flex items-center text-sm text-neutral-400 hover:text-white mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t('backToProduction')}
                </Link>
                <h1 className="text-2xl font-bold text-white">{t('title', { title: production.title })}</h1>
                <p className="text-neutral-400 text-sm mt-1">
                    {t('subtitle')}
                </p>
            </div>

            <ManagePropsContent
                performanceId={id}
                accentColor={production.color}
                initialItems={props || []}
            />
        </div>
    )
}
