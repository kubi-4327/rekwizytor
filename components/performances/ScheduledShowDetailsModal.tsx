
import { useState, useEffect, useMemo } from 'react'
import { Database } from '@/types/supabase'
import { Calendar, Clock, Users, Edit2 } from 'lucide-react'
import { useTimeFormat } from '@/hooks/useTimeFormat'
import { AddToCalendar } from '@/components/ui/AddToCalendar'
import { useTranslations } from 'next-intl'
import { format } from 'date-fns'
import { ScheduleShowDialog } from './ScheduleShowDialog'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

type ScheduledShow = Database['public']['Tables']['scene_checklists']['Row']

type Props = {
    isOpen: boolean
    onClose: () => void
    showDate: string
    shows: ScheduledShow[]
    productionTitle: string
    performanceColor?: string | null
}

export function ScheduledShowDetailsModal({ isOpen, onClose, showDate, shows, productionTitle, performanceColor }: Props) {
    const t = useTranslations('ScheduledShowDetailsModal')
    const { formatTime } = useTimeFormat()

    const [isEditing, setIsEditing] = useState(false)

    // Close editing when modal closes
    useEffect(() => {
        if (!isOpen) setIsEditing(false)
    }, [isOpen])

    if (!shows || shows.length === 0) return null

    const firstShow = shows[0]
    const dateObj = new Date(showDate)

    const editData = useMemo(() => ({
        date: dateObj,
        cast: (firstShow.cast as any) || 'first',
        originalDate: showDate
    }), [dateObj.getTime(), firstShow.cast, showDate])

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title={productionTitle}
                description={
                    <span className="uppercase tracking-wider font-medium">
                        {firstShow.type || t('show')}
                    </span>
                }
                maxWidth="md"
            >
                <div className="space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-neutral-300">
                            <Calendar className="h-5 w-5 text-neutral-500" />
                            <span>{format(dateObj, 'dd/MM/yyyy')}</span>
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

                    <div className="pt-2 flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center">
                        <Button
                            onClick={() => setIsEditing(true)}
                            variant="outline"
                            className="text-neutral-400 hover:text-white border-neutral-700 hover:bg-neutral-800"
                        >
                            <Edit2 className="h-4 w-4 mr-2" />
                            {t('edit')}
                        </Button>

                        <AddToCalendar
                            title={`${productionTitle} - ${firstShow.type || t('show')} `}
                            date={showDate}
                            details={`Cast: ${firstShow.cast || 'N/A'} \nScenes: ${shows.map(s => s.scene_number).join(', ')} `}
                            className="text-neutral-400 hover:text-white"
                        />
                    </div>
                </div>
            </Modal>

            <ScheduleShowDialog
                isOpen={isEditing}
                onClose={() => {
                    setIsEditing(false)
                }}
                performanceId={firstShow.performance_id || ''}
                performanceColor={performanceColor || null}
                editData={editData}
            />
        </>
    )
}
