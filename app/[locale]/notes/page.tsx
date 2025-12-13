import NotesList from '@/components/notes/NotesList'
import { createClient } from '@/utils/supabase/server'

export default async function NotesPage() {
    const supabase = await createClient()

    // Fetch notes on server for SSR
    const { data: notes } = await supabase
        .from('notes')
        .select('*, performances(title, color)')
        .order('updated_at', { ascending: false })

    return (
        <div className="p-4 md:p-10 space-y-6 max-w-7xl mx-auto">
            <NotesList initialNotes={notes || []} />
        </div>
    )
}
