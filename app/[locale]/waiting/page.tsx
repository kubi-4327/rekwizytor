import { getTranslations } from 'next-intl/server'
import { Clock } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function WaitingPage() {
    const t = await getTranslations('Waiting')
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Check if user is already approved
    const { data: profile } = await supabase
        .from('profiles')
        .select('status')
        .eq('id', user.id)
        .single()

    if (profile?.status === 'approved') {
        redirect('/')
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 p-4 text-neutral-200">
            <div className="w-full max-w-md text-center space-y-6">
                <div className="flex justify-center">
                    <div className="rounded-full bg-yellow-900/20 p-4 text-yellow-500">
                        <Clock className="h-12 w-12" />
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-white">
                    {t('title')}
                </h1>

                <p className="text-neutral-400">
                    {t('description')}
                </p>

                <div className="pt-4">
                    <form action="/auth/signout" method="post">
                        <button
                            className="text-sm text-neutral-500 hover:text-white underline underline-offset-4 cursor-pointer"
                            type="submit"
                        >
                            {t('signOut')}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
