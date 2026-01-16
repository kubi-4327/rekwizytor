import { createClient } from '@/utils/supabase/server'
import { GroupsList } from '@/components/groups/GroupsList'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { ChevronRight, Home, FolderTree } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { GroupsHeaderActions } from '@/components/groups/GroupsHeaderActions'

type Props = {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function GroupsPage({ searchParams }: Props) {
    const resolvedSearchParams = await searchParams
    const supabase = await createClient()
    const t = await getTranslations('Groups')

    const groupId = typeof resolvedSearchParams.groupId === 'string' ? resolvedSearchParams.groupId : null

    // Fetch all groups to build hierarchy and list - optimized query
    const { data: groups } = await supabase
        .from('groups')
        .select('id, name, icon, color, created_at, location_id, description, performance_id, locations(id, name), performances(id, title, color)')
        .order('name')



    return (
        <div className="p-4 md:p-10 space-y-6 max-w-7xl mx-auto">
            <PageHeader
                title={t('title')}
                subtitle={t('subtitle')}
                icon={<FolderTree className="w-6 h-6 text-white" />}
                iconColor="text-blue-400"
            >
                <GroupsHeaderActions
                    groups={groups || []}
                    currentParentId={groupId}
                />
            </PageHeader>



            <GroupsList
                groups={groups || []}
                currentParentId={groupId}
            />
        </div>
    )
}
