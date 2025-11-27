import { createClient } from '@/utils/supabase/server'


import { ItemsList } from '@/components/items/ItemsList'
import { AddPropsButton } from '@/components/items/AddPropsButton'
import { ExportButton } from '@/components/items/ExportButton'
import { getTranslations } from 'next-intl/server'

export default async function ItemsPage() {
    const supabase = await createClient()
    const t = await getTranslations('Items')
    const { data: items } = await supabase
        .from('items')
        .select('*')
        .is('deleted_at', null)
        .neq('status', 'draft')
        .order('created_at', { ascending: false })

    const { data: locations } = await supabase.from('locations').select('*').order('name')
    const { data: groups } = await supabase.from('groups').select('*').order('name')

    return (
        <div className="p-4 md:p-10 space-y-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
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
                locations={locations || []}
                groups={groups || []}
            />
        </div>
    )
}

