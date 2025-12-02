import { getTranslations } from 'next-intl/server'
import { XCircle } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { signOut } from '@/app/actions/auth'

export default async function RejectedPage() {
    const t = await getTranslations('Rejected')
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Check if user is approved (in case they were re-approved)
    const { data: profile } = await supabase
        .from('profiles')
        .select('status')
        .eq('id', user.id)
        .single()

    if (profile?.status === 'approved') {
        redirect('/')
    }

    if (profile?.status === 'pending') {
        redirect('/waiting')
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 p-4 text-neutral-200">
            <div className="w-full max-w-md text-center space-y-6">
                <div className="flex justify-center">
                    <div className="rounded-full bg-red-900/20 p-4 text-red-500">
                        <XCircle className="h-12 w-12" />
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-white">
                    {t('title')}
                </h1>

                <p className="text-neutral-400">
                    {t('description')}
                </p>

                <div className="pt-4">
                    <form action={signOut}>
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
