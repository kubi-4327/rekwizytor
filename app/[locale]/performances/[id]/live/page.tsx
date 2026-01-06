import { createClient } from '@/utils/supabase/server'
import { LiveNoteView } from '@/components/live/LiveNoteView'
import { parseNoteToLiveScenes } from '@/utils/note-parser'
import { JSONContent } from '@tiptap/react'
import { Database } from '@/types/supabase'

type SceneChecklist = Database['public']['Tables']['scene_checklists']['Row']

export default async function LivePerformancePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()

    // 1. Fetch Notes to find Scene Note or Master
    const { data: notes } = await supabase
        .from('notes')
        .select('*')
        .eq('performance_id', id)
        .order('is_master', { ascending: false })
        .order('updated_at', { ascending: false })

    // Prefer "Notatka sceniczna", otherwise fallback to master/first
    const note = notes?.find(n => n.title.startsWith('Notatka sceniczna')) || notes?.[0]

    // 2. Fetch Active Checklist Run (if any)
    const { data: activeChecklist } = await supabase
        .from('scene_checklists')
        .select('*')
        .eq('performance_id', id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()

    // 3. Parse Scenes
    // Note content is JSONB, cast to JSONContent
    const scenes = note?.content
        ? parseNoteToLiveScenes(note.content as unknown as JSONContent)
        : []

    if (!note || scenes.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4 text-center">
                <h2 className="text-xl font-bold mb-2">Brak scenariusza</h2>
                <p className="text-neutral-400 max-w-md">
                    Nie znaleziono notatki z planem spektaklu.
                    Stwórz notatkę dla tego spektaklu i użyj nagłówków oraz list punktowanych, aby zdefiniować sceny.
                </p>
            </div>
        )
    }

    return (
        <LiveNoteView
            performanceId={id}
            scenes={scenes}
            activeChecklist={activeChecklist as SceneChecklist | null}
        />
    )
}
