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

  // Fetch Nearest Upcoming Performance
  const { data: nearestPerformance } = await supabase
    .from('performances')
    .select('id, title, premiere_date, image_url, status')
    .is('deleted_at', null)
    .in('status', ['active', 'upcoming'])
    .order('premiere_date', { ascending: true })
    .limit(1)
    .single()

  // Fetch Upcoming Performances (3-5 shows)
  const { data: upcomingPerformances } = await supabase
    .from('performances')
    .select('id, title, premiere_date, status, color')
    .is('deleted_at', null)
    .in('status', ['active', 'upcoming'])
    .gte('premiere_date', new Date().toISOString())
    .order('premiere_date', { ascending: true })
    .limit(5)

  // Fetch Inventory Statistics
  const { count: totalItems } = await supabase
    .from('items')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null)

  const { count: inMaintenance } = await supabase
    .from('items')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null)
    .eq('status', 'in_maintenance')

  const { count: unassigned } = await supabase
    .from('items')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null)
    .is('performance_id', null)

  // Fetch Active Checklists
  const { data: activeShows } = await supabase
    .from('scheduled_shows')
    .select(`
      id,
      performance:performances (
        title
      ),
      scene_checklists (
        id,
        is_staged
      )
    `)
    .eq('status', 'in_progress')

  const activeChecklists = activeShows?.map(show => {
    const checklists = show.scene_checklists || []
    const completed = checklists.filter((c: any) => c.is_staged).length
    const total = checklists.length

    return {
      id: show.id,
      performance_title: (show.performance as any)?.title || 'Unknown',
      completed,
      total
    }
  }) || []

  // Fetch User Mentions in Notes
  let recentMentions: any[] = []
  if (user) {
    const { data: mentions } = await supabase
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

    recentMentions = mentions || []
  }

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      <PendingUsersAlert />

      <div className="space-y-2">
        <Greeting name={displayName} />
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Column (2/3 width on large screens) */}
        <div className="lg:col-span-2 space-y-8">
          <section>
            <h2 className="text-lg font-medium text-white mb-4">{t('nearestPerformance')}</h2>
            <NearestPerformanceCard performance={nearestPerformance} />
          </section>

          <section>
            <UpcomingPerformances performances={upcomingPerformances || []} />
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-4">{t('quickActions')}</h2>
            <QuickNav />
          </section>
        </div>

        {/* Sidebar Column (1/3 width on large screens) */}
        <div className="space-y-8">
          <section>
            <InventoryStats
              totalItems={totalItems || 0}
              inMaintenance={inMaintenance || 0}
              unassigned={unassigned || 0}
            />
          </section>

          <section>
            <ActiveChecklistsStatus checklists={activeChecklists} />
          </section>

          <section>
            <UserMentionsList mentions={recentMentions} />
          </section>
        </div>
      </div>
    </div>
  )
}
