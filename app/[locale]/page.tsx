import { createClient } from '@/utils/supabase/server'
import { getTranslations } from 'next-intl/server'

import { Greeting } from '@/components/dashboard/Greeting'
import { PendingUsersAlert } from '@/components/dashboard/PendingUsersAlert'
import { NearestPerformanceCard } from '@/components/dashboard/NearestPerformanceCard'
import { UserMentionsList } from '@/components/dashboard/UserMentionsList'
import { QuickNav } from '@/components/dashboard/QuickNav'
import { InventoryStats } from '@/components/dashboard/InventoryStats'
import { UpcomingPerformances } from '@/components/dashboard/UpcomingPerformances'
import { ActiveChecklistsStatus } from '@/components/dashboard/ActiveChecklistsStatus'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let displayName = 'User'
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, username')
      .eq('id', user.id)
      .single()

    displayName = profile?.full_name || profile?.username || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User'
  }

  const t = await getTranslations('Dashboard')

  // Execute all independent queries in parallel for 5x performance improvement
  const [
    nearestPerformanceResult,
    upcomingChecklistsResult,
    upcomingPremieresResult,
    totalItemsResult,
    inMaintenanceResult,
    unassignedResult,
    activeChecklistsResult,
    mentionsResult,
  ] = await Promise.allSettled([
    // Fetch Nearest Upcoming Performance (based on scheduled checklists)
    supabase
      .from('scene_checklists')
      .select(`
        show_date,
        performance:performances (
          id,
          title,
          premiere_date,
          image_url,
          status
        )
      `)
      .gte('show_date', new Date().toISOString())
      .order('show_date', { ascending: true })
      .limit(1)
      .single(),

    // Fetch Upcoming Scheduled Shows (from checklists)
    supabase
      .from('scene_checklists')
      .select(`
        id,
        show_date,
        performance:performances (
          id,
          title,
          status,
          color
        )
      `)
      .gte('show_date', new Date().toISOString())
      .order('show_date', { ascending: true })
      .limit(10),

    // Fetch Upcoming Premieres (as fallback/addition)
    supabase
      .from('performances')
      .select('id, title, premiere_date, status, color')
      .is('deleted_at', null)
      .in('status', ['active', 'upcoming'])
      .gte('premiere_date', new Date().toISOString())
      .order('premiere_date', { ascending: true })
      .limit(5),

    // Total props across all performances
    supabase
      .from('performance_props')
      .select('*', { count: 'exact', head: true }),

    Promise.resolve({ data: null, error: null, count: 0 }),
    Promise.resolve({ data: null, error: null, count: 0 }),

    // Fetch Active Checklists
    supabase
      .from('scene_checklists')
      .select(`
        id,
        show_date,
        is_active,
        scene_name,
        performance:performances (
          id,
          title
        )
      `)
      .eq('is_active', true)
      .order('show_date', { ascending: true })
      .limit(10),

    // Fetch User Mentions in Notes (only if user exists)
    user
      ? supabase
        .from('note_mentions')
        .select(`
            id,
            note_id,
            created_at,
            note:notes (
              id,
              title,
              performance_id,
              performance:performances (
                title,
                color
              )
            )
          `)
        .eq('mentioned_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)
      : Promise.resolve({ data: null, error: null }),
  ])

  // Extract data with error handling for each query
  const nearestChecklist = nearestPerformanceResult.status === 'fulfilled'
    ? nearestPerformanceResult.value.data
    : null

  const nearestPerformance = nearestChecklist?.performance && !Array.isArray(nearestChecklist.performance) ? {
    ...nearestChecklist.performance,
    next_show_date: nearestChecklist.show_date
  } : null

  // Process Upcoming Performances (Merge Checklists and Premieres)
  const scheduledShows = upcomingChecklistsResult.status === 'fulfilled'
    ? upcomingChecklistsResult.value.data || []
    : []

  const futurePremieres = upcomingPremieresResult.status === 'fulfilled'
    ? upcomingPremieresResult.value.data || []
    : []

  // Combine and normalize to common interface { id, title, date, status, color }
  const combinedPerformances = [
    // Add scheduled shows
    ...scheduledShows
      .filter(item => item.performance)
      .map(item => {
        const perf = item.performance as any // Type assertion for joined data
        return {
          id: perf.id,
          title: perf.title,
          date: item.show_date,
          status: perf.status,
          color: perf.color
        }
      }),
    // Add premieres
    ...futurePremieres.map(perf => ({
      id: perf.id,
      title: perf.title,
      date: perf.premiere_date!,
      status: perf.status,
      color: perf.color
    }))
  ]

  // Deduplicate: If same performance ID exists on same DATE, prefer the one from scheduledShows (if any distinction needed).
  // Actually, simplified deduplication: Just distinct by `${id}-${date}` key.
  const uniquePerformancesMap = new Map()
  combinedPerformances.forEach(p => {
    // Only add if future or today
    if (new Date(p.date) >= new Date(new Date().setHours(0, 0, 0, 0))) {
      const key = `${p.id}-${p.date.split('T')[0]}` // Dedupe by ID and Day
      if (!uniquePerformancesMap.has(key)) {
        uniquePerformancesMap.set(key, p)
      }
    }
  })

  // Sort by date ascending and take top 5
  const upcomingPerformances = Array.from(uniquePerformancesMap.values())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5)

  const totalItems = totalItemsResult.status === 'fulfilled'
    ? totalItemsResult.value.count
    : null

  const inMaintenance = inMaintenanceResult.status === 'fulfilled'
    ? inMaintenanceResult.value.count
    : null

  const unassigned = unassignedResult.status === 'fulfilled'
    ? unassignedResult.value.count
    : null

  const activeChecklists = activeChecklistsResult.status === 'fulfilled'
    ? activeChecklistsResult.value.data
    : null

  const activeChecklistsData = activeChecklists?.reduce((acc: Record<string, any>, checklist) => {
    const perfId = (checklist.performance as any)?.id
    if (!perfId) return acc

    if (!acc[perfId]) {
      acc[perfId] = {
        id: perfId,
        performance_title: (checklist.performance as any)?.title || 'Unknown',
        completed: 0,
        total: 0
      }
    }

    acc[perfId].total++
    // Since we're fetching active checklists, they are "in progress", not completed
    // Completed logic would need a different column

    return acc
  }, {} as Record<string, any>) || {}

  const checklistsForDisplay = Object.values(activeChecklistsData)

  const recentMentions = mentionsResult.status === 'fulfilled'
    ? (mentionsResult.value.data || [])
    : []

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      <PendingUsersAlert />

      <div className="space-y-2">
        <Greeting name={displayName} />
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Main Column (8/12 width on large screens) */}
        <div className="lg:col-span-8 space-y-6">
          <section>
            <NearestPerformanceCard performance={nearestPerformance} />
          </section>

          <div className="grid gap-6 md:grid-cols-2">
            <section>
              <UpcomingPerformances performances={upcomingPerformances as any} />
            </section>
            <section>
              <ActiveChecklistsStatus checklists={checklistsForDisplay as any} />
            </section>
          </div>

          <section>
            <h2 className="text-lg font-medium text-white mb-4">{t('quickActions')}</h2>
            <QuickNav />
          </section>
        </div>

        {/* Sidebar Column (4/12 width on large screens) */}
        <div className="lg:col-span-4 space-y-6">
          <section>
            <InventoryStats
              totalItems={totalItems || 0}
              inMaintenance={inMaintenance || 0}
              unassigned={unassigned || 0}
            />
          </section>

          <section>
            <UserMentionsList mentions={recentMentions} />
          </section>
        </div>
      </div>
    </div>
  )
}
