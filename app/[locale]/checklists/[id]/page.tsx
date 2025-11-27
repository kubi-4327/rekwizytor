import { createClient } from '@/utils/supabase/server'
import { LiveChecklist } from '@/components/checklists/LiveChecklist'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Calendar, Clock } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

type Props = {
    params: Promise<{ id: string }>
}

export default async function ChecklistPage({ params }: Props) {
    const { id } = await params
    const supabase = await createClient()
    const t = await getTranslations('ChecklistPage')

    // Fetch checklist details
    const { data: checklist } = await supabase
        .from('scene_checklists')
        .select(`
      *,
      performances (
        title
      )
    `)
        .eq('id', id)
        .single()

    if (!checklist) {
        notFound()
    }

    // Fetch checklist items
    const { data: items } = await supabase
        .from('scene_checklist_items')
        .select(`
      *,
      items (
        name,
        image_url
      )
    `)
        .eq('scene_checklist_id', id)
        .order('created_at', { ascending: true }) // Ideally sort by some order, but created_at works for now

    const showDate = new Date(checklist.show_date)

    // Fetch all checklists for this show to determine prev/next
    const { data: siblingChecklists } = await supabase
        .from('scene_checklists')
        .select('id, scene_number')
        .eq('performance_id', checklist.performance_id)
        .eq('show_date', checklist.show_date)
        .order('scene_number', { ascending: true })

    const currentSceneIndex = siblingChecklists?.findIndex(c => c.id === id) ?? -1
    const prevScene = currentSceneIndex > 0 ? siblingChecklists?.[currentSceneIndex - 1] : null
    const nextScene = currentSceneIndex !== -1 && siblingChecklists && currentSceneIndex < siblingChecklists.length - 1
        ? siblingChecklists[currentSceneIndex + 1]
        : null

    return (
        <div className="p-4 md:p-6 max-w-3xl mx-auto pb-24">
            {/* Header */}
            <div className="mb-6">
                <Link href={`/performances/${checklist.performance_id}`} className="inline-flex items-center text-sm text-neutral-400 hover:text-white mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t('backToPerformance')}
                </Link>

                <div className="bg-neutral-900/50 rounded-xl p-4 border border-neutral-800">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-xl font-bold text-white mb-1">
                                {checklist.performances?.title}
                            </h1>
                            <div className="flex items-center text-sm text-neutral-400 space-x-4">
                                <span className="flex items-center">
                                    <Calendar className="h-3 w-3 mr-1.5" />
                                    {showDate.toLocaleDateString()}
                                </span>
                                <span className="flex items-center">
                                    <Clock className="h-3 w-3 mr-1.5" />
                                    {showDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-bold text-white">{t('scene', { number: checklist.scene_number })}</div>
                            {checklist.scene_name && (
                                <div className="text-sm text-neutral-500">{checklist.scene_name}</div>
                            )}
                        </div>
                    </div>

                    {/* Scene Navigation */}
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-neutral-800">
                        {prevScene ? (
                            <Link
                                href={`/checklists/${prevScene.id}`}
                                className="text-sm text-neutral-400 hover:text-white flex items-center"
                            >
                                <ArrowLeft className="mr-1 h-3 w-3" />
                                {t('scene', { number: prevScene.scene_number })}
                            </Link>
                        ) : (
                            <span className="text-sm text-neutral-700 cursor-not-allowed flex items-center">
                                <ArrowLeft className="mr-1 h-3 w-3" />
                                {t('start')}
                            </span>
                        )}

                        {nextScene ? (
                            <Link
                                href={`/checklists/${nextScene.id}`}
                                className="text-sm text-blue-400 hover:text-blue-300 flex items-center font-medium"
                            >
                                {t('scene', { number: nextScene.scene_number })}
                                <ArrowRight className="ml-1 h-3 w-3" />
                            </Link>
                        ) : (
                            <span className="text-sm text-neutral-700 cursor-not-allowed flex items-center">
                                {t('end')}
                                <ArrowRight className="ml-1 h-3 w-3" />
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Checklist */}
            <div className="mt-8">
                <LiveChecklist checklistId={id} initialItems={items || []} />
            </div>

            {/* Sticky Bottom Navigation */}
            {(nextScene || prevScene) && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/90 to-transparent pt-12 pointer-events-none flex justify-between gap-4 max-w-3xl mx-auto">
                    {prevScene ? (
                        <Link
                            href={`/checklists/${prevScene.id}`}
                            className="flex items-center justify-center bg-neutral-800 text-white font-medium py-4 px-6 rounded-full shadow-lg hover:bg-neutral-700 transition-all active:scale-95 pointer-events-auto"
                        >
                            <ArrowLeft className="h-5 w-5 mr-2" />
                            <span>{t('prev')}</span>
                        </Link>
                    ) : <div />}

                    {nextScene && (
                        <Link
                            href={`/checklists/${nextScene.id}`}
                            className="flex-1 flex items-center justify-between bg-white text-black font-bold py-4 px-6 rounded-full shadow-lg hover:bg-neutral-200 transition-all active:scale-95 pointer-events-auto"
                        >
                            <span>{t('nextScene', { number: nextScene.scene_number })}</span>
                            <ArrowRight className="h-5 w-5" />
                        </Link>
                    )}
                </div>
            )}
        </div>
    )
}

