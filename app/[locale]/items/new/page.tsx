import { createClient } from '@/utils/supabase/server'
import { CreateItemForm } from '@/components/items/CreateItemForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export default async function NewItemPage() {
    const supabase = await createClient()
    const t = await getTranslations('NewItem')

    const { data: groups } = await supabase.from('groups').select('*').order('name')
    const { data: locations } = await supabase.from('locations').select('*').order('name')

    return (
        <div className="p-6 md:p-10 max-w-4xl mx-auto">
            <div className="mb-8">
                <Link href="/items" className="inline-flex items-center text-sm text-neutral-400 hover:text-white mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t('backToInventory')}
                </Link>
                <h1 className="text-3xl font-bold text-white">{t('title')}</h1>
                <p className="text-neutral-400 mt-2">
                    {t('subtitle')}
                </p>
            </div>

            <div className="flex justify-center">
                <CreateItemForm
                    groups={groups || []}
                    locations={locations || []}
                />
            </div>
        </div>
    )
}
