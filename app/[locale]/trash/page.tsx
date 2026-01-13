import { createClient } from '@/utils/supabase/server'
import { getTranslations } from 'next-intl/server'
import { TrashList } from '@/components/trash/TrashList'

export default async function TrashPage() {
    const supabase = await createClient()
    const t = await getTranslations('Trash')

    // Legacy items table - removed
    // const { data: deletedItems } = await supabase
    //     .from('items')
    //     .select('*')
    //     .not('deleted_at', 'is', null)
    //     .order('deleted_at', { ascending: false })

    // Fetch deleted performances
    const { data: deletedPerformances } = await supabase
        .from('performances')
        .select('*')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false })

    return (
        <div className="p-4 md:p-10 space-y-6 max-w-7xl mx-auto">
            <div>
                <h1 className="text-xl font-bold text-white">{t('title')}</h1>
                <p className="text-neutral-400 text-sm mt-1">
                    {t('subtitle')}
                </p>
            </div>

            <TrashList
                initialPerformances={deletedPerformances || []}
            />
        </div>
    )
}
