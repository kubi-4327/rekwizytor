import { createClient } from '@/utils/supabase/server'
import { ManageScenesForm } from '@/components/performances/ManageScenesForm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Database } from '@/types/supabase'
import { getTranslations } from 'next-intl/server'

type Props = {
    params: Promise<{ id: string }>
}

type Scene = Database['public']['Tables']['scenes']['Row']

export default async function ManageScenesPage({ params }: Props) {
    const { id } = await params
    const supabase = await createClient()
    const t = await getTranslations('ManageScenes')

    // Fetch production details
    const { data: production } = await supabase
        .from('performances')
        .select('title, color')
        .eq('id', id)
        .single()

    if (!production) {
        notFound()
    }

    // Fetch scenes
    const { data: scenes } = await supabase
        .from('scenes')
        .select('*')
        .eq('performance_id', id)
        .order('scene_number', { ascending: true })
        .returns<Scene[]>()

    return (
        <div className="p-6 md:p-10 max-w-4xl mx-auto">
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

            <ManageScenesForm
                performanceId={id}
                initialScenes={scenes?.map((s: Scene) => ({ ...s, act_number: s.act_number ?? 1 })) || []}
                performanceColor={production.color}
            />
        </div>
    )
}
