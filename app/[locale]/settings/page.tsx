import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsForm } from '@/components/settings/SettingsForm'
import { getTranslations } from 'next-intl/server';
import { UserApprovalList } from '@/components/settings/UserApprovalList'
import { ThumbnailRegenerator } from '@/components/admin/ThumbnailRegenerator'
import { PageHeader } from '@/components/ui/PageHeader'
import { Settings } from 'lucide-react'

import { EmbeddingMigrationButton } from '@/components/admin/EmbeddingMigrationButton'

export default async function SettingsPage() {
    const supabase = await createClient()
    const t = await getTranslations('Settings');

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    return (
        <div className="p-4 md:p-10 space-y-6 max-w-7xl mx-auto text-white">
            <PageHeader
                title={t('title')}
                subtitle={t('description')}
                icon={<Settings className="w-6 h-6 text-white" />}
                iconColor="text-purple-400"
            />

            <UserApprovalList />

            <SettingsForm user={{ ...profile, email: user.email || undefined }} />

            {profile && ((profile.role as string) === 'admin' || (profile.role as string) === 'superadmin') && (
                <div className="pt-8 mt-8 border-t border-neutral-800 space-y-4">
                    <h2 className="text-lg font-bold text-white mb-4">{t('adminZone')}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <ThumbnailRegenerator />
                        <EmbeddingMigrationButton />
                    </div>
                </div>
            )}
        </div>
    )
}
