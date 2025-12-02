import { createClient } from '@/utils/supabase/server'
import { getTranslations } from 'next-intl/server'

import { Greeting } from '@/components/dashboard/Greeting'
import { PendingUsersAlert } from '@/components/dashboard/PendingUsersAlert'
import { NearestPerformanceCard } from '@/components/dashboard/NearestPerformanceCard'
import { UserMentionsList } from '@/components/dashboard/UserMentionsList'
import { QuickNav } from '@/components/dashboard/QuickNav'

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

  // Fetch User Mentions in Notes
  // Note: This requires a more complex query or a view if we want to be precise about "mentions".
  // For now, we'll fetch notes created by others that might be relevant, or just recent notes.
  // Ideally, we'd have a 'note_mentions' table or similar.
  // Based on the schema, there is a 'note_mentions' table!
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
        <p className="text-neutral-400">
          {t('subtitle')}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Column (2/3 width on large screens) */}
        <div className="lg:col-span-2 space-y-8">
          <section>
            <h2 className="text-lg font-medium text-white mb-4">{t('nearestPerformance')}</h2>
            <NearestPerformanceCard performance={nearestPerformance} />
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-4">{t('quickActions')}</h2>
            <QuickNav />
          </section>
        </div>

        {/* Sidebar Column (1/3 width on large screens) */}
        <div className="space-y-8">
          <section>
            {/* We can reuse the title inside the component or here. Let's keep it consistent. */}
            <UserMentionsList mentions={recentMentions} />
          </section>
        </div>
      </div>
    </div>
  )
}
