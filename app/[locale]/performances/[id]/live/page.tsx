import { createClient } from '@/utils/supabase/server'
import { isAfter, subHours, isSameDay } from 'date-fns'
import { getTranslations } from 'next-intl/server'
import { LivePerformanceView } from '@/components/live/LivePerformanceView'

export default async function LivePerformancePage({ params }: { params: Promise<{ id: string }> }) {
    console.log('LivePerformancePage: Starting render')
    const { id } = await params
    console.log('LivePerformancePage: ID:', id)
    const supabase = await createClient()
    const t = await getTranslations('LivePerformance')

    // 1. Fetch all checklists for this performance
    // Note: We used to fetch here, but now we do lazy expiration first.
    // However, the original code had a syntax error where .eq was chained to nothing.
    // We will fetch AFTER the update.

    // 1b. Lazy Expiration: Check for stale heartbeats (older than 20 mins)
    // We do this after fetching (or before) to ensure we don't show stale active shows.
    // Ideally, we'd run an UPDATE query here.


    // We can't easily run a bulk update based on time with simple Supabase client without a stored procedure or Edge Function if we want to be super efficient,
    // but for now, let's find the stale ones and update them one by one or via IN.
    // Actually, we can just do:
    await supabase
        .from('scene_checklists')
        .update({ is_active: false })
        .eq('is_active', true)
        // eslint-disable-next-line react-hooks/purity
        .lt('last_heartbeat', new Date(Date.now() - 20 * 60 * 1000).toISOString())
        .eq('performance_id', id) // Only for this performance to be safe/efficient

    // Re-fetch checklists if we suspect changes? Or just proceed. 
    // The previous fetch might have stale data if we fetched before updating.
    // Let's fetch AFTER updating.
    const { data: freshChecklists } = await supabase
        .from('scene_checklists')
        .select('*')
        .eq('performance_id', id)
        .order('show_date', { ascending: true })

    const checklistsToUse = freshChecklists || []

    if (!checklistsToUse || checklistsToUse.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-neutral-400 p-4">
                <p className="text-lg font-medium mb-2">{t('noUpcomingShows')}</p>
                <p className="text-sm">{t('scheduleShow')}</p>
            </div>
        )
    }

    // 2. Determine Active Show
    // Priority 1: Explicitly active
    let activeChecklist = checklistsToUse.find(c => c.is_active)

    // Priority 2: Today's show (if not finished)
    if (!activeChecklist) {
        const today = new Date()
        const cutoff = subHours(today, 4) // Assume show lasts max 4 hours

        activeChecklist = checklistsToUse.find(c => {
            const showDate = new Date(c.show_date)
            return isSameDay(showDate, today) && isAfter(showDate, cutoff)
        })
    }

    // Priority 3: Next upcoming show (optional, maybe just show the next one?)
    // For now, if nothing is active or today, we might just show the NEXT one?
    // Or we show a "Waiting for show to start" screen.
    // Let's pick the next upcoming one if nothing is active.
    if (!activeChecklist) {
        const now = new Date()
        activeChecklist = checklistsToUse.find(c => isAfter(new Date(c.show_date), subHours(now, 4)))
    }

    if (!activeChecklist) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-neutral-400 p-4">
                <p className="text-lg font-medium mb-2">{t('noActiveShows')}</p>
                <p className="text-sm">{t('allFinished')}</p>
            </div>
        )
    }

    // 3a. Fetch scenes to get act numbers (since scene_checklists might not have it directly or we want to be sure)
    // We can join or just fetch all scenes for this performance.
    const { data: scenes } = await supabase
        .from('scenes')
        .select('scene_number, act_number')
        .eq('performance_id', id)

    // 3b. Get ALL checklists for this specific show instance (same date/time)
    // We group by show_date usually, but here we can just filter by the exact show_date of the active one.
    const activeShowDate = activeChecklist.show_date
    const showChecklists = checklistsToUse.filter(c => c.show_date === activeShowDate)
    const showChecklistIds = showChecklists.map(c => c.id)

    // Sanitize types for the component
    const sanitizedChecklists = showChecklists.map(c => {
        const sceneNum = Number(c.scene_number)
        const sceneDef = scenes?.find(s => s.scene_number === sceneNum)
        return {
            ...c,
            act_number: sceneDef?.act_number || 1,
            scene_number: sceneNum
        }
    })

    // 4. Fetch items for these checklists
    const { data: items } = await supabase
        .from('scene_checklist_items')
        .select(`
            *,
            items (
                name,
                image_url
            )
        `)
        .in('scene_checklist_id', showChecklistIds)



    // Also fetch ALL profiles for the assignment dropdown (if we want to allow assigning to anyone)
    // For now, let's just fetch all active users (admins/managers/users)
    const { data: allProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role')
        .eq('status', 'approved')
        .order('full_name')

    return (
        <LivePerformanceView
            performanceId={id}
            initialChecklists={sanitizedChecklists}
            initialItems={items || []}
            profiles={allProfiles || []}
        />
    )
}
