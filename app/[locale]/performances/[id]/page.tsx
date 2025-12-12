import { createClient } from '@/utils/supabase/server'
import { format } from 'date-fns'
import { Calendar, Box, ArrowLeft, Settings } from 'lucide-react'
import { ScheduledShowsList } from '@/components/performances/ScheduledShowsList'
import { PerformanceContent } from '@/components/performances/PerformanceContent'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { Fragment } from 'react'
import { Database } from '@/types/supabase'
import { getTranslations } from 'next-intl/server'
import { ExportPerformanceButton } from '@/components/performances/ExportPerformanceButton'
import { PerformanceLabelButton } from '@/components/performances/PerformanceLabelButton'
import { Button } from '@/components/ui/Button'
import { buttonVariants } from '@/components/ui/button-variants'
import { PerformanceNotesPreview } from '@/components/performances/PerformanceNotesPreview'

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

    const { data: { user: supabaseUser } } = await supabase.auth.getUser()

    // Map Supabase user to the shape expected by ExportPerformanceButton
    const user = supabaseUser ? {
        full_name: supabaseUser.user_metadata?.full_name || null,
        email: supabaseUser.email
    } : null

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

    // Fetch notes for this performance
    const { data: notes } = await supabase
        .from('notes')
        .select('*')
        .eq('performance_id', id)
        .order('is_master', { ascending: false })
        .order('updated_at', { ascending: false })

    return (
        <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
            <div>
                <Link href="/performances" className="inline-flex items-center text-sm text-neutral-400 hover:text-white mb-4 transition-colors">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t('backToProductions')}
                </Link>

                {/* Header Container */}
                <div className="bg-neutral-900/50 backdrop-blur-sm border border-neutral-800 rounded-xl p-6 shadow-xl">
                    <div className="flex flex-col md:flex-row gap-6 items-start">
                        {/* Poster */}
                        <div
                            className="relative h-48 w-32 shrink-0 overflow-hidden rounded-lg border-2 shadow-2xl group"
                            style={{ borderColor: production.color || '#262626' }}
                        >
                            {production.image_url ? (
                                <Image
                                    src={production.image_url}
                                    alt={production.title}
                                    fill
                                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center bg-neutral-900 text-neutral-700">
                                    <Box className="h-8 w-8" />
                                </div>
                            )}
                        </div>

                        <div className="flex-1 min-w-0 w-full">
                            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                                <div className="space-y-4">
                                    <div>
                                        <h1 className="text-3xl font-bold text-white tracking-tight leading-tight">{production.title}</h1>

                                        <div className="flex items-center flex-wrap gap-3 mt-3 text-neutral-400">
                                            <span className={`capitalize px-2.5 py-0.5 rounded-full text-xs font-medium border flex items-center gap-2 ${production.status === 'active'
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
                                                <span className="text-sm flex items-center bg-neutral-800/50 px-2 py-0.5 rounded border border-neutral-800">
                                                    <Calendar className="mr-1.5 h-4 w-4 text-neutral-500" />
                                                    {format(new Date(production.premiere_date), 'dd MMM yyyy')}
                                                </span>
                                            )}
                                            <span className="text-sm text-neutral-500 flex items-center gap-1.5">
                                                <span className="w-1 h-1 rounded-full bg-neutral-600" />
                                                {scenes?.length || 0} {t('scenes')}
                                                <span className="w-1 h-1 rounded-full bg-neutral-600" />
                                                {new Set(scenes?.map((s: Scene) => s.act_number)).size || 0} {t('acts')}
                                            </span>
                                        </div>
                                    </div>

                                    {production.notes && (
                                        <p className="text-neutral-300 max-w-2xl leading-relaxed text-sm border-l-2 border-neutral-700 pl-4 py-1">
                                            {production.notes}
                                        </p>
                                    )}
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3 shrink-0 pt-2 lg:pt-0">
                                    <Link
                                        href={`/performances/${id}/live`}
                                        className={buttonVariants({ variant: "destructive", className: "gap-2 shadow-lg hover:shadow-red-900/20" })}
                                    >
                                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse mr-2 border border-red-400" />
                                        {t('liveView')}
                                    </Link>

                                    {/* Actions Menu */}
                                    <div className="relative group">
                                        <Button
                                            variant="outline"
                                            leftIcon={<Settings className="w-4 h-4" />}
                                            className="bg-neutral-900 border-neutral-700 hover:bg-neutral-800 hover:text-white"
                                        >
                                            <span className="hidden sm:inline">{t('actions')}</span>
                                        </Button>

                                        <div className="absolute right-0 top-full pt-2 w-56 z-50 hidden group-hover:block">
                                            <div className="bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl overflow-hidden ring-1 ring-white/5">
                                                <Link
                                                    href={`/performances/${id}/edit`}
                                                    className="block px-4 py-2.5 text-sm text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
                                                >
                                                    {t('editDetails')}
                                                </Link>
                                                <Link
                                                    href={`/performances/${id}/scenes`}
                                                    className="block px-4 py-2.5 text-sm text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors border-t border-neutral-800"
                                                >
                                                    {t('manageScenes')}
                                                </Link>
                                                <div className="border-t border-neutral-800">
                                                    <PerformanceLabelButton
                                                        performanceId={id}
                                                        performanceTitle={production.title}
                                                        premiereDate={production.premiere_date}
                                                        variant="menu"
                                                    />
                                                    <ExportPerformanceButton
                                                        production={production}
                                                        items={assignedProps || []}
                                                        scenes={scenes || []}
                                                        notes={notes || []}
                                                        user={user}
                                                        variant="menu"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid gap-12 lg:grid-cols-3 items-start">
                {/* Left Column: Scheduled Shows & Notes */}
                <div className="lg:col-span-1 space-y-8">
                    <ScheduledShowsList
                        scheduledShows={scheduledShows || []}
                        productionTitle={production.title}
                        performanceId={id}
                        performanceColor={production.color}
                    />

                    <PerformanceNotesPreview
                        notes={notes || []}
                        performanceId={id}
                        title={production.title}
                    />
                </div>

                {/* Right Column: Props List */}
                <div className="lg:col-span-2">
                    <PerformanceContent
                        performanceId={id}
                        propsByAct={propsByAct}
                        assignedProps={assignedProps}
                        scenes={scenes || []}
                    />
                </div>
            </div>
        </div>
    )
}
