import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsForm } from '@/components/settings/SettingsForm'
import { getTranslations } from 'next-intl/server';
import { UserApprovalList } from '@/components/settings/UserApprovalList'

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
        <div className="p-6 md:p-10 max-w-3xl mx-auto space-y-8">
            <div>
                <h1 className="text-xl font-bold text-white">{t('title')}</h1>
                <p className="text-neutral-400 text-sm mt-1">
                    {t('description')}
                </p>
            </div>

            <UserApprovalList />

            <SettingsForm user={{ ...profile, email: user.email || undefined }} />
        </div>
    )
}
