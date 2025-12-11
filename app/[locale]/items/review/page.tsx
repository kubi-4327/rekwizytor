import { createClient } from '@/utils/supabase/server'
import { ReviewList } from '@/components/items/ReviewList'
import { PageHeader } from '@/components/ui/PageHeader'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export default async function ReviewPage() {
    const supabase = await createClient()
    const t = await getTranslations('Review')

    // Fetch draft items
    const { data: draftItems } = await supabase
        .from('items')
        .select('*')
        .eq('status', 'draft')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

    // Fetch locations and groups for editing
    const { data: locations } = await supabase.from('locations').select('id, name').order('name')
    const { data: groups } = await supabase.from('groups').select('id, name').order('name')

    return (
        <div className="p-6 md:p-10 max-w-7xl mx-auto">
            <div className="mb-8">
                <Link href="/items" className="inline-flex items-center text-sm text-neutral-400 hover:text-white mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t('backToInventory')}
                </Link>
                <div className="flex items-center justify-between">
                    <PageHeader
                        title={t('title')}
                        subtitle={t('subtitle')}
                        icon={<CheckCircle2 className="w-6 h-6 text-white" />}
                        iconColor="text-yellow-400"
                        className="mb-0" // Override margin since it's inside a flex container with existing layout if needed, or simply let it be
                    />
                    <div className="text-sm text-neutral-500 hidden sm:block self-start mt-2">
                        {t('pending', { count: draftItems?.length || 0 })}
                    </div>
                </div>
            </div>

            <ReviewList
                initialItems={draftItems || []}
                locations={locations || []}
                groups={groups || []}
            />
        </div>
    )
}
