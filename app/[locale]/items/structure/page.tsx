import { createClient } from '@/utils/supabase/server'
import { StructureEditor } from '@/components/structure/StructureEditor'
import { getTranslations } from 'next-intl/server'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function StructurePage() {
    const supabase = await createClient()
    const t = await getTranslations('Structure')

    const { data: locations } = await supabase.from('locations').select('*').order('name')
    const { data: groups } = await supabase.from('groups').select('*').order('name')

    return (
        <div className="p-4 md:p-10 max-w-5xl mx-auto">
            <div className="mb-8">
                <Link href="/items" className="inline-flex items-center text-sm text-neutral-400 hover:text-white mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t('backToItems')}
                </Link>
                <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
                <p className="text-neutral-400 text-sm mt-1">
                    {t('subtitle')}
                </p>
            </div>

            <StructureEditor
                initialLocations={locations || []}
                initialGroups={groups || []}
            />
        </div>
    )
}
