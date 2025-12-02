import { createClient } from '@/utils/supabase/server'
import { GroupsList } from '@/components/groups/GroupsList'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'

type Props = {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function GroupsPage({ searchParams }: Props) {
    const resolvedSearchParams = await searchParams
    const supabase = await createClient()
    const t = await getTranslations('Groups')

    const groupId = typeof resolvedSearchParams.groupId === 'string' ? resolvedSearchParams.groupId : null

    // Fetch all groups to build hierarchy and list
    const { data: groups } = await supabase
        .from('groups')
        .select('*, locations(name)')
        .order('name')

    if (!groups) return null

    // Build breadcrumbs
    const breadcrumbs = []
    if (groupId) {
        let currentId = groupId
        while (currentId) {
            const group = groups.find(g => g.id === currentId)
            if (group) {
                breadcrumbs.unshift(group)
                currentId = group.parent_id || ''
            } else {
                break
            }
        }
    }

    return (
        <div className="p-4 md:p-10 space-y-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-white">{t('title')}</h1>
                    <p className="text-neutral-400 text-sm mt-1">
                        {t('subtitle')}
                    </p>
                </div>
            </div>



            <GroupsList
                groups={groups}
                currentParentId={groupId}
            />
        </div>
    )
}
