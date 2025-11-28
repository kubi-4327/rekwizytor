import { createClient } from '@/utils/supabase/server'
import { FastAddForm } from '@/components/items/FastAddForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export default async function FastAddPage() {
    const supabase = await createClient()
    const t = await getTranslations('FastAdd')

    // Fetch locations
    const { data: locations } = await supabase
        .from('locations')
        .select('id, name')
        .order('name')

    // Fetch groups
    const { data: groups } = await supabase
        .from('groups')
        .select('id, name')
        .order('name')

    return (
        <div className="p-4 md:p-10 max-w-2xl mx-auto">
            <div className="mb-6">
                <Link href="/items" className="inline-flex items-center text-sm text-neutral-400 hover:text-white mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t('backToInventory')}
                </Link>
                <h1 className="text-xl font-bold text-white">{t('title')}</h1>
                <p className="text-neutral-400 text-sm mt-1">
                    {t('subtitle')}
                </p>
            </div>

            <FastAddForm
                locations={locations || []}
                groups={groups || []}
            />
        </div>
    )
}
