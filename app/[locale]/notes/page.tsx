import NotesList from '@/components/notes/NotesList'

export default function NotesPage() {
    return (
        <div className="p-6 w-full">
            <h1 className="text-3xl font-bold mb-6">All Notes</h1>
            <NotesList />
        </div>
    )
}
