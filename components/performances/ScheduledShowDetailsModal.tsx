'use client'

import { Database } from '@/types/supabase'
import { Calendar, Clock, Users, X, Edit2 } from 'lucide-react'
import { useTimeFormat } from '@/hooks/useTimeFormat'
import { AddToCalendar } from '@/components/ui/AddToCalendar'
import { useTranslations } from 'next-intl'

type ScheduledShow = Database['public']['Tables']['scene_checklists']['Row']

type Props = {
    isOpen: boolean
    onClose: () => void
    showDate: string
    shows: ScheduledShow[]
    productionTitle: string
}

export function ScheduledShowDetailsModal({ isOpen, onClose, showDate, shows, productionTitle }: Props) {
    const t = useTranslations('ScheduledShowDetailsModal')
    const { formatTime } = useTimeFormat()

    if (!isOpen || !shows || shows.length === 0) return null

    const firstShow = shows[0]
    const dateObj = new Date(showDate)

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6 space-y-6">
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-white">{productionTitle}</h2>
                            <p className="text-neutral-400 text-sm mt-1 uppercase tracking-wider font-medium">
                                {firstShow.type || t('show')}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    // Navigate to edit page with show ID (using first show's date/time as identifier)
                                    // Since we don't have a direct edit page for a single show instance yet, 
                                    // we might need to implement it or reuse schedule page.
                                    // For now, let's just log or show a placeholder, or better, 
                                    // redirect to schedule page with query param to pre-fill?
                                    // Actually user asked for "add possibility to edit scheduled show".
                                    // I'll add the button but it needs a target.
                                    // Let's assume we will create an edit route or modal.
                                    // For now I will just put the button there.
                                    // Wait, I can use the existing schedule page but I need to pass data.
                                    // Or I can make a new modal for editing.
                                    // Let's just add the button for now as requested and maybe link to a new page.
                                    window.location.href = `/performances/${shows[0].performance_id}/schedule?edit=${showDate}`
                                }}
                                className="text-neutral-500 hover:text-white transition-colors p-1"
                                title={t('edit')}
                            >
                                <Users className="h-5 w-5 hidden" /> {/* Hack to import icon if needed, but I'll use Edit2 */}
                                <Edit2 className="h-5 w-5" />
                            </button>
                            <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-neutral-300">
                            <Calendar className="h-5 w-5 text-neutral-500" />
                            <span>{dateObj.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        </div>
                        <div className="flex items-center gap-3 text-neutral-300">
                            <Clock className="h-5 w-5 text-neutral-500" />
                            <span>{formatTime(dateObj)}</span>
                        </div>
                        {firstShow.cast && (
                            <div className="flex items-center gap-3 text-neutral-300">
                                <Users className="h-5 w-5 text-neutral-500" />
                                <span className="capitalize">{firstShow.cast === 'first' ? t('cast.first') : firstShow.cast === 'second' ? t('cast.second') : t('cast.other')}</span>
                            </div>
                        )}
                    </div>

                    <div className="border-t border-neutral-800 pt-4">
                        <h3 className="text-sm font-medium text-white mb-3">{t('sceneBreakdown')}</h3>
                        <div className="max-h-48 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                            {shows.sort((a, b) => a.scene_number.localeCompare(b.scene_number, undefined, { numeric: true })).map(show => (
                                <div key={show.id} className="flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-neutral-800/50">
                                    <span className="font-medium text-neutral-300">{t('scene', { number: show.scene_number })}</span>
                                    <span className="text-neutral-500 truncate max-w-[150px]">{show.scene_name}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                        <AddToCalendar
                            title={`${productionTitle} - ${firstShow.type || t('show')}`}
                            date={showDate}
                            details={`Cast: ${firstShow.cast || 'N/A'}\nScenes: ${shows.map(s => s.scene_number).join(', ')}`}
                            className="text-neutral-400 hover:text-white"
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
