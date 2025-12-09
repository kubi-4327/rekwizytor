import { createClient } from '@/utils/supabase/server'


import { ItemsList } from '@/components/items/ItemsList'
import { AddPropsButton } from '@/components/items/AddPropsButton'
import { ExportButton } from '@/components/items/ExportButton'
import { getTranslations } from 'next-intl/server'

type Props = {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function ItemsPage({ searchParams }: Props) {
    const resolvedSearchParams = await searchParams
    const supabase = await createClient()
    const t = await getTranslations('Items')

    const groupId = typeof resolvedSearchParams.groupId === 'string' ? resolvedSearchParams.groupId : undefined
    const viewItemId = typeof resolvedSearchParams.view === 'string' ? resolvedSearchParams.view : undefined
    const locationId = typeof resolvedSearchParams.locationId === 'string' ? resolvedSearchParams.locationId : undefined

    let query = supabase
        .from('items')
        .select('*', { count: 'exact' })
        .is('deleted_at', null)
        .neq('status', 'draft')
        .order('created_at', { ascending: false })

    if (groupId) {
        query = query.eq('group_id', groupId)
    }
    if (locationId) {
        query = query.eq('location_id', locationId)
    }

    const { data: items, count } = await query.range(0, 49)

    const { data: locations } = await supabase.from('locations').select('*').order('name')
    const { data: groups } = await supabase.from('groups').select('*').order('name')

    return (
        <div className="p-4 md:p-10 space-y-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-xl font-bold text-white">{t('title')}</h1>
                    <p className="text-neutral-400 text-sm mt-1">
                        {t('subtitle')}
                    </p>
                </div>
                <div className="flex gap-2 ml-auto">
                    <ExportButton items={items || []} />



                    <AddPropsButton />
                </div>
            </div>

            <ItemsList
                initialItems={items || []}
                totalCount={count || 0}
                locations={locations || []}
                groups={groups || []}
                initialCategoryId={groupId}
                initialViewItemId={viewItemId}
            />
        </div>
    )
}
