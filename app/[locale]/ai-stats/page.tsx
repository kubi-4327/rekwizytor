import { createClient } from '@/utils/supabase/server'
import { StatsDashboard } from '@/components/ai-stats/StatsDashboard'

export default async function AIStatsPage() {
    const supabase = await createClient()

    const { data: logs } = await supabase
        .from('ai_usage_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

    const { data: stats } = await supabase
        .from('ai_usage_logs')
        .select('tokens_input, tokens_output, operation_type')

    return (
        <StatsDashboard
            logs={logs || []}
            allStats={stats || []}
        />
    )
}
