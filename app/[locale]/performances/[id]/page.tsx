import { createClient } from '@/utils/supabase/server'
import { Calendar, Box, ArrowLeft } from 'lucide-react'
import { ScheduledShowsList } from '@/components/performances/ScheduledShowsList'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { Fragment } from 'react'
import { Database } from '@/types/supabase'
import { getTranslations } from 'next-intl/server'

type Props = {
    params: Promise<{ id: string }>
}

type Scene = Database['public']['Tables']['scenes']['Row']
type PerformanceItem = Database['public']['Tables']['performance_items']['Row'] & {
    items: {
        name: string
        image_url: string | null
    } | null
}

export default async function ProductionDetailsPage({ params }: Props) {
    const { id } = await params
    const supabase = await createClient()
    const t = await getTranslations('ProductionDetails')

    const { data: production } = await supabase
        .from('performances')
        .select('*')
        .eq('id', id)
        .single()

    if (!production) {
        notFound()
    }

    // Fetch scheduled shows (checklists)
    const { data: scheduledShows } = await supabase
        .from('scene_checklists')
        .select('*')
        .eq('performance_id', id)
        .order('show_date', { ascending: true })

    // Fetch assigned props (performance_items)
    const { data: assignedProps } = await supabase
        .from('performance_items')
        .select(`
        *,
        items (
            name,
            image_url
        )
    `)
        .eq('performance_id', id)
        .order('scene_number', { ascending: true })
        .returns<PerformanceItem[]>()

    // Fetch scenes for Act info
    const { data: scenes } = await supabase
        .from('scenes')
        .select('*')
        .eq('performance_id', id)
        .returns<Scene[]>()

    // Helper to get Act number
    const getActNumber = (sceneNum: string | null) => {
        if (!sceneNum) return 1
        const scene = scenes?.find((s: Scene) => s.scene_number.toString() === sceneNum)
        return scene?.act_number || 1
    }

    // Group props by Act
    const propsByAct: Record<number, PerformanceItem[]> = {}

    assignedProps?.forEach((prop: PerformanceItem) => {
        const actNum = getActNumber(prop.scene_number)
        if (!propsByAct[actNum]) propsByAct[actNum] = []
        propsByAct[actNum].push(prop)
    })



    return (
        <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
            <div>
                <Link href="/performances" className="inline-flex items-center text-sm text-neutral-400 hover:text-white mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t('backToProductions')}
                </Link>
                <div className="flex flex-col md:flex-row gap-6 items-start">
                    {/* Poster */}
                    <div
                        className="relative h-48 w-32 shrink-0 overflow-hidden rounded-lg border-4 bg-neutral-900 shadow-2xl"
                        style={{ borderColor: production.color || '#262626' }}
                    >
                        {production.image_url ? (
                            <Image
                                src={production.image_url}
                                alt={production.title}
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center text-neutral-700">
                                <Box className="h-8 w-8" />
                            </div>
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-bold text-white">{production.title}</h1>
                                <div className="flex items-center flex-wrap gap-3 mt-3 text-neutral-400">
                                    <span className={`capitalize px-2.5 py-0.5 rounded-full text-xs border flex items-center gap-2 ${production.status === 'active'
                                        ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                        : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                                        }`}>
                                        {production.status === 'active' && (
                                            <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                            </span>
                                        )}
                                        {production.status}
                                    </span>

                                    {production.premiere_date && (
                                        <span className="text-sm flex items-center">
                                            <Calendar className="mr-1.5 h-4 w-4" />
                                            {new Date(production.premiere_date).toLocaleDateString()}
                                        </span>
                                    )}
                                    <span className="text-sm text-neutral-500">
                                        {scenes?.length || 0} {t('scenes')} • {new Set(scenes?.map((s: Scene) => s.act_number)).size || 0} {t('acts')}
                                    </span>
                                </div>
                                {production.notes && (
                                    <p className="mt-4 text-neutral-300 max-w-2xl leading-relaxed">{production.notes}</p>
                                )}
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                                <Link
                                    href={`/performances/${id}/scenes`}
                                    className="px-4 py-2 text-sm font-medium text-neutral-400 hover:text-white border border-neutral-800 rounded-md hover:bg-neutral-900 transition-colors text-center"
                                >
                                    {t('manageScenes')}
                                </Link>
                                <Link
                                    href={`/performances/${id}/edit`}
                                    className="px-4 py-2 text-sm font-medium text-neutral-400 hover:text-white border border-neutral-800 rounded-md hover:bg-neutral-900 transition-colors text-center"
                                >
                                    {t('editDetails')}
                                </Link>
                                <Link
                                    href={`/performances/${id}/live`}
                                    className="px-4 py-2 text-sm font-medium text-red-400 hover:text-red-300 border border-red-900/30 bg-red-900/10 rounded-md hover:bg-red-900/20 transition-colors text-center flex items-center gap-2"
                                >
                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                    {t('liveView')}
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
                {/* Scheduled Shows Column */}
                <div className="lg:col-span-1 space-y-6">
                    <ScheduledShowsList
                        scheduledShows={scheduledShows || []}
                        productionTitle={production.title}
                        performanceId={id}
                        performanceColor={production.color}
                    />
                </div>

                {/* Props List Column */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-white">{t('propsList')}</h2>
                        <Link
                            href={`/performances/${id}/props`}
                            className="inline-flex items-center justify-center rounded-md bg-neutral-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700"
                        >
                            <Box className="mr-1.5 h-3.5 w-3.5" />
                            {t('manageProps')}
                        </Link>
                    </div>

                    <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-neutral-800">
                            <thead className="bg-neutral-950">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase">{t('table.scene')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase">{t('table.item')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase">{t('table.instructions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800">
                                {Object.entries(propsByAct)
                                    .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                                    .map(([actNum, props]) => (
                                        <Fragment key={actNum}>
                                            {/* Act Header */}
                                            <tr className="bg-neutral-950/50">
                                                <td colSpan={3} className="px-4 py-2 text-xs font-bold text-neutral-500 uppercase tracking-wider border-y border-neutral-800 text-center">
                                                    {t('act', { actNum })}
                                                </td>
                                            </tr>
                                            {props.map((prop, index) => {
                                                const isFirstInScene = index === 0 || prop.scene_number !== props[index - 1].scene_number
                                                return (
                                                    <tr key={prop.id} className="hover:bg-neutral-800/50">
                                                        <td className="px-4 py-3 text-sm text-neutral-300 align-top">
                                                            {isFirstInScene && (
                                                                <>
                                                                    <div className="font-medium">{prop.scene_number}</div>
                                                                    <div className="text-xs text-neutral-500">{prop.scene_name}</div>
                                                                </>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-white align-top">
                                                            {prop.items?.name || prop.item_name_snapshot}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-neutral-400 align-top">
                                                            {prop.setup_instructions || '-'}
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </Fragment>
                                    ))}

                                {(!assignedProps || assignedProps.length === 0) && (
                                    <tr>
                                        <td colSpan={3} className="px-4 py-8 text-center text-sm text-neutral-500">
                                            {t('noProps')}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div >
    )
}
