import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { ChangePasswordForm } from '@/components/auth/ChangePasswordForm'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function ChangePasswordPage() {
    const supabase = await createClient()
    const t = await getTranslations('SettingsForm')
    const tCommon = await getTranslations('Common')

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return redirect('/login')
    }

    return (
        <div className="p-6 md:p-10 max-w-xl mx-auto space-y-8">
            <div>
                <Link
                    href="/settings"
                    className="inline-flex items-center text-sm text-neutral-400 hover:text-white mb-6 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {tCommon('cancel')}
                </Link>
                <h1 className="text-xl font-bold text-white">{t('changePassword')}</h1>
                <p className="text-neutral-400 text-sm mt-1">
                    {t('security')}
                </p>
            </div>

            <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-6">
                <ChangePasswordForm redirectTo="/settings" />
            </div>
        </div>
    )
}
