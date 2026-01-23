import { createClient } from '@/utils/supabase/server'
import { SimpleLiveView } from '@/components/live/SimpleLiveView'

export default async function LivePerformancePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()

    // Fetch all scenes for this performance
    const { data: scenes, error: scenesError } = await supabase
        .from('scenes')
        .select('*')
        .eq('performance_id', id)
        .order('act_number', { ascending: true })
        .order('scene_number', { ascending: true })

    if (scenesError || !scenes || scenes.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4 text-center">
                <h2 className="text-xl font-bold mb-2">Brak scen</h2>
                <p className="text-neutral-400 max-w-md">
                    Nie znaleziono scen dla tego spektaklu.
                    Najpierw zdefiniuj sceny w zarządzaniu spektaklem.
                </p>
            </div>
        )
    }

    // Fetch all tasks for these scenes
    const sceneIds = scenes.map(s => s.id)
    const { data: tasks, error: tasksError } = await supabase
        .from('scene_tasks')
        .select('*')
        .in('scene_id', sceneIds)
        .order('order_index', { ascending: true })

    if (tasksError) {
        console.error('Error fetching scene tasks:', tasksError)
    }

    // Fetch user profiles for assignment
    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('status', 'approved')

    return (
        <SimpleLiveView
            performanceId={id}
            initialScenes={scenes}
            initialTasks={tasks || []}
            profiles={profiles || []}
        />
    )
}
