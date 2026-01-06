'use server'

import { createClient } from '@/utils/supabase/server'
import { generateEmbedding } from '@/utils/embeddings'
import { TaskType } from '@google/generative-ai'
import { refreshSearchIndex } from '@/app/actions/unified-search'

/**
 * Extract text from TipTap JSON content
 */
function extractTextFromTipTap(json: any): string {
    if (!json) return ''
    if (typeof json === 'string') {
        try {
            const parsed = JSON.parse(json)
            return extractTextFromTipTap(parsed)
        } catch {
            return json
        }
    }
    if (Array.isArray(json)) {
        return json.map(extractTextFromTipTap).join(' ')
    }
    if (json.type === 'text' && json.text) {
        return json.text
    }
    if (json.content) {
        return extractTextFromTipTap(json.content)
    }
    return ''
}

/**
 * Generate embedding for a single note
 */
export async function generateNoteEmbedding(noteId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient()

    // Fetch note
    const { data: note, error: fetchError } = await supabase
        .from('notes')
        .select('id, title, content')
        .eq('id', noteId)
        .single()

    if (fetchError || !note) {
        console.error('Failed to fetch note:', fetchError)
        return { success: false, error: fetchError?.message || 'Note not found' }
    }

    // Extract text from TipTap JSON and combine with title
    const contentText = extractTextFromTipTap(note.content)
    const textForEmbedding = [
        note.title,
        contentText
    ].filter(Boolean).join(' - ')

    try {
        // Generate embedding
        const embedding = await generateEmbedding(textForEmbedding, TaskType.RETRIEVAL_DOCUMENT)

        // Update note with embedding
        const { error: updateError } = await supabase
            .from('notes')
            .update({ embedding: JSON.stringify(embedding) } as any)
            .eq('id', noteId)

        if (updateError) {
            console.error('Failed to update note embedding:', updateError)
            return { success: false, error: updateError.message }
        }

        return { success: true }
    } catch (embeddingError: any) {
        console.error('Failed to generate embedding:', embeddingError)
        return { success: false, error: embeddingError.message }
    }
}

/**
 * Generate embeddings for all notes without embeddings
 */
export async function generateAllNoteEmbeddings(): Promise<{
    success: boolean;
    processed: number;
    failed: number;
    errors: string[]
}> {
    const supabase = await createClient()

    // Fetch notes without embeddings
    const { data: notes, error: fetchError } = await supabase
        .from('notes')
        .select('id, title, content')

    if (fetchError) {
        console.error('Failed to fetch notes:', fetchError)
        return { success: false, processed: 0, failed: 0, errors: [fetchError.message] }
    }

    if (!notes || notes.length === 0) {
        return { success: true, processed: 0, failed: 0, errors: [] }
    }

    let processed = 0
    let failed = 0
    const errors: string[] = []

    // Process each note
    for (const note of notes) {
        const contentText = extractTextFromTipTap(note.content)
        const textForEmbedding = [
            note.title,
            contentText
        ].filter(Boolean).join(' - ')

        try {
            const embedding = await generateEmbedding(textForEmbedding, TaskType.RETRIEVAL_DOCUMENT)

            const { error: updateError } = await supabase
                .from('notes')
                .update({ embedding: JSON.stringify(embedding) } as any)
                .eq('id', note.id)

            if (updateError) {
                failed++
                errors.push(`${note.title}: ${updateError.message}`)
            } else {
                processed++
            }
        } catch (embeddingError: any) {
            failed++
            errors.push(`${note.title}: ${embeddingError.message}`)
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
    }

    // Refresh search index after all embeddings are generated
    try {
        await refreshSearchIndex()
    } catch (e) {
        console.error('Failed to refresh search index:', e)
    }

    return {
        success: failed === 0,
        processed,
        failed,
        errors
    }
}
