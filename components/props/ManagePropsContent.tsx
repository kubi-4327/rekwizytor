'use client'

import { PropsChecklist } from '@/components/props/PropsChecklist'
import { Database } from '@/types/supabase'

type PropItem = Database['public']['Tables']['performance_props']['Row']

interface ManagePropsContentProps {
    performanceId: string
    accentColor?: string | null
    initialItems: PropItem[]
}

export function ManagePropsContent({ performanceId, accentColor, initialItems }: ManagePropsContentProps) {
    // We use items from props which come from Server Component
    // router.refresh() will update initialItems causing re-render
    const items = initialItems

    return (
        <div className="space-y-8">
            <section>
                {/* Loading state removed as data is passed from server */}
                <PropsChecklist
                    performanceId={performanceId}
                    variant="manage"
                    initialProps={items.map(item => ({
                        id: item.id,
                        item_name: item.item_name,
                        is_checked: item.is_checked,
                        created_at: item.created_at,
                        performance_id: item.performance_id,
                        order: item.order
                    }))}
                />
            </section>
        </div>
    )
}
