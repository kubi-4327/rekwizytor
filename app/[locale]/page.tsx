import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Box, Layers, ClipboardList, ArrowRight } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { Greeting } from '@/components/dashboard/Greeting'

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

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
      <div className="space-y-2">
        <Greeting name={displayName} />
        <p className="text-neutral-400">
          {t('subtitle')}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Link
          href="/items"
          className="group relative overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 p-6 hover:border-neutral-700 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-burgundy-main/20 p-3 text-burgundy-light">
              <Box className="h-6 w-6" />
            </div>
            <ArrowRight className="h-5 w-5 text-neutral-600 group-hover:text-white transition-colors" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-white">{t('propsInventory')}</h3>
          <p className="mt-2 text-sm text-neutral-400">
            {t('propsInventoryDesc')}
          </p>
        </Link>

        <Link
          href="/performances"
          className="group relative overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 p-6 hover:border-neutral-700 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-ai-primary/20 p-3 text-ai-secondary">
              <Layers className="h-6 w-6" />
            </div>
            <ArrowRight className="h-5 w-5 text-neutral-600 group-hover:text-white transition-colors" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-white">{t('productions')}</h3>
          <p className="mt-2 text-sm text-neutral-400">
            {t('productionsDesc')}
          </p>
        </Link>

        <Link
          href="/checklists"
          className="group relative overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 p-6 hover:border-neutral-700 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-green-900/20 p-3 text-green-400">
              <ClipboardList className="h-6 w-6" />
            </div>
            <ArrowRight className="h-5 w-5 text-neutral-600 group-hover:text-white transition-colors" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-white">{t('checklists')}</h3>
          <p className="mt-2 text-sm text-neutral-400">
            {t('checklistsDesc')}
          </p>
        </Link>
      </div>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
        <h3 className="text-lg font-medium text-white mb-4">{t('recentActivity')}</h3>
        <div className="text-sm text-neutral-500 text-center py-8">
          {t('noActivity')}
        </div>
      </div>
    </div>
  )
}
