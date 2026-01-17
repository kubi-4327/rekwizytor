import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { UsersList } from '@/components/admin/UsersList'

export default async function AdminUsersPage() {
    const supabase = await createClient()
    const t = await getTranslations('AdminUsers')

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Verify admin role
    const { data: currentUserProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (currentUserProfile?.role !== 'admin') {
        redirect('/')
    }

    // Fetch all profiles
    const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

    return (
        <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
            <div className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight text-white">
                    {t('title')}
                </h1>
                <p className="text-neutral-400">
                    {t('subtitle')}
                </p>
            </div>

            <UsersList initialProfiles={(profiles || []).map(p => ({
                ...p,
                role: p.role || 'user',
                status: p.status || 'pending',
                created_at: p.created_at ?? undefined
            }))} />
        </div>
    )
}
