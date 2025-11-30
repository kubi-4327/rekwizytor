import { createClient } from '@/utils/supabase/server'
import { ManagePropsForm } from '@/components/performances/ManagePropsForm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Database } from '@/types/supabase'
import { getTranslations } from 'next-intl/server'

type Props = {
    params: Promise<{ id: string }>
}

type Scene = Database['public']['Tables']['scenes']['Row']
type Item = Database['public']['Tables']['items']['Row']
type PerformanceItem = Database['public']['Tables']['performance_items']['Row'] & {
    items: {
        id: string
        name: string
        image_url: string | null
        notes: string | null
        performance_status: string | null
    } | null
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

    // Fetch all available items
    const { data: items } = await supabase
        .from('items')
        .select('id, name, image_url, notes, performance_status')
        .is('deleted_at', null)
        .order('name')
        .returns<Item[]>()

    // Fetch available scenes
    const { data: scenes } = await supabase
        .from('scenes')
        .select('*')
        .eq('performance_id', id)
        .order('scene_number', { ascending: true })
        .returns<Scene[]>()

    // Fetch current assignments
    const { data: assignments } = await supabase
        .from('performance_items')
        .select(`
      *,
      items (
        id,
        name,
        image_url
      )
    `)
        .eq('performance_id', id)
        .order('scene_number', { ascending: true })
        .order('sort_order', { ascending: true })
        .returns<PerformanceItem[]>()

    // Fetch all profiles for assignment
    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .order('full_name')

    // Fetch locations and groups for item details
    const { data: locations } = await supabase.from('locations').select('*').order('name')
    const { data: groups } = await supabase.from('groups').select('*').order('name')

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

            <ManagePropsForm
                performanceId={id}
                initialAssignments={assignments || []}
                availableItems={items || []}
                definedScenes={scenes?.map((s: Scene) => ({ ...s, act_number: s.act_number ?? 1 })) || []}
                accentColor={production.color}
                profiles={profiles || []}
                locations={locations || []}
                groups={groups || []}
            />
        </div>
    )
}
