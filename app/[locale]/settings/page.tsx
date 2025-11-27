import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsForm } from '@/components/settings/SettingsForm'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { getTranslations } from 'next-intl/server';

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
                <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
                <p className="text-neutral-400 text-sm mt-1">
                    {t('description')}
                </p>
            </div>

            <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-6">
                <h2 className="text-lg font-medium text-white mb-4">{t('language')}</h2>
                <LanguageSwitcher />
            </div>

            <SettingsForm user={{ email: user.email, ...profile }} />
        </div>
    )
}
