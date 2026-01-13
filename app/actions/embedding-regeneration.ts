'use server'

import { createClient } from '@/utils/supabase/server'
import { generateEmbedding } from '@/utils/embeddings'
import { TaskType } from '@google/generative-ai'
import { enrichGroupNameForEmbedding } from '@/utils/group-embedding-enrichment'

// Types
export interface RegenerationJob {
    id: string
    created_at: string
    updated_at: string
    status: 'pending' | 'running' | 'completed' | 'failed' | 'aborted'
    embedding_model: string
    enrichment_model: string
    use_sample_groups: boolean
    total_groups: number
    processed_groups: number
    current_group_id: string | null
    current_group_name: string | null
    current_enrichment: {
        identity: string
        physical: string
        context: string
    } | null
    total_tokens: number
    error_message: string | null
    failed_groups: Array<{
        group_id: string
        group_name: string
        error: string
    }>
}

// Get all regeneration jobs
export async function getRegenerationJobs(): Promise<RegenerationJob[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('embedding_regeneration_jobs')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching regeneration jobs:', error)
        return []
    }

    return data as RegenerationJob[]
}

// Get single regeneration job
export async function getRegenerationJob(id: string): Promise<RegenerationJob | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('embedding_regeneration_jobs')
        .select('*')
        .eq('id', id)
        .single()

    if (error) {
        console.error('Error fetching regeneration job:', error)
        return null
    }

    return data as RegenerationJob
}

// Create and start regeneration job
export async function createRegenerationJob(config: {
    embedding_model: string
    enrichment_model: string
    use_sample_groups: boolean
}): Promise<{ success: boolean; jobId?: string; error?: string }> {
    const supabase = await createClient()

    // Get groups to regenerate
    let query = supabase
        .from('groups')
        .select('id, name')

    if (config.use_sample_groups) {
        query = query.limit(50)
    }

    const { data: groups, error: groupsError } = await query

    if (groupsError || !groups) {
        return { success: false, error: 'Failed to fetch groups' }
    }

    // Create job record
    const { data: job, error: jobError } = await supabase
        .from('embedding_regeneration_jobs')
        .insert([{
            embedding_model: config.embedding_model,
            enrichment_model: config.enrichment_model,
            use_sample_groups: config.use_sample_groups,
            total_groups: groups.length,
            status: 'pending'
        }])
        .select('id')
        .single()

    if (jobError || !job) {
        console.error('Error creating regeneration job:', jobError)
        return { success: false, error: jobError?.message || 'Failed to create job' }
    }

    console.log('✅ [REGEN] Job created with ID:', job.id)
    console.log('🎬 [REGEN] Starting background regeneration...')

    // Start background process
    runRegenerationInBackground(job.id, groups, config.embedding_model, config.enrichment_model)

    return { success: true, jobId: job.id }
}

// Abort regeneration job
export async function abortRegenerationJob(jobId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient()

    const { error } = await supabase
        .from('embedding_regeneration_jobs')
        .update({ status: 'aborted' })
        .eq('id', jobId)

    if (error) {
        console.error('Error aborting regeneration job:', error)
        return { success: false, error: error.message }
    }

    console.log(`🛑 [REGEN] Job aborted: ${jobId}`)
    return { success: true }
}

// Delete regeneration job
export async function deleteRegenerationJob(jobId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient()

    const { error } = await supabase
        .from('embedding_regeneration_jobs')
        .delete()
        .eq('id', jobId)

    if (error) {
        console.error('Error deleting regeneration job:', error)
        return { success: false, error: error.message }
    }

    console.log(`🗑️ [REGEN] Job deleted: ${jobId}`)
    return { success: true }
}

// Background regeneration process
async function runRegenerationInBackground(
    jobId: string,
    groups: { id: string; name: string }[],
    embeddingModel: string,
    enrichmentModel: string
) {
    console.log(`🔄 [REGEN] Starting regeneration for ${groups.length} groups`)
    console.log(`📦 [REGEN] Embedding: ${embeddingModel}, Enrichment: ${enrichmentModel}`)

    const supabase = await createClient()
    let totalTokens = 0
    const failedGroups: Array<{ group_id: string; group_name: string; error: string }> = []

    // Update status to running
    await supabase
        .from('embedding_regeneration_jobs')
        .update({ status: 'running' })
        .eq('id', jobId)

    for (let i = 0; i < groups.length; i++) {
        const group = groups[i]

        // Check if job should be aborted
        const { data: jobStatus } = await supabase
            .from('embedding_regeneration_jobs')
            .select('status')
            .eq('id', jobId)
            .single()

        if (jobStatus?.status === 'aborted') {
            console.log(`🛑 [REGEN] Job aborted by user at ${i}/${groups.length}`)
            return
        }

        try {
            console.log(`📝 [REGEN] Processing ${i + 1}/${groups.length}: "${group.name}"`)

            // Update current group being processed
            await supabase
                .from('embedding_regeneration_jobs')
                .update({
                    current_group_id: group.id,
                    current_group_name: group.name,
                    processed_groups: i
                })
                .eq('id', jobId)

            // Enrich and generate embeddings
            const enriched = await enrichGroupNameForEmbedding(group.name, enrichmentModel)

            // Validate enrichment - use group name as fallback for empty fields
            const safeEnriched = {
                identity: enriched.identity?.trim() || group.name,
                physical: enriched.physical?.trim() || 'przedmiot',
                context: enriched.context?.trim() || 'rekwizyt teatralny'
            }

            console.log(`🔍 [REGEN] Enriched: identity="${safeEnriched.identity.substring(0, 50)}..."`)

            // Update current enrichment (live preview!)
            await supabase
                .from('embedding_regeneration_jobs')
                .update({
                    current_enrichment: safeEnriched
                })
                .eq('id', jobId)

            // Generate 3 embeddings (identity, physical, context)
            const [identityEmb, physicalEmb, contextEmb] = await Promise.all([
                generateEmbedding(safeEnriched.identity, TaskType.RETRIEVAL_DOCUMENT, embeddingModel),
                generateEmbedding(safeEnriched.physical, TaskType.RETRIEVAL_DOCUMENT, embeddingModel),
                generateEmbedding(safeEnriched.context, TaskType.RETRIEVAL_DOCUMENT, embeddingModel)
            ])

            // Generate key: enricher_embedder
            const generateKey = (enricher: string, embedder: string): string => {
                const shortEnricher = enricher.includes('gemini') ? 'gemini' :
                    enricher.includes('gpt') ? 'openai' :
                        enricher.includes('mistral') ? 'mistral' : 'gemini'

                const shortEmbedder = embedder.includes('gemini') || embedder.includes('text-embedding-004') ? 'gemini' :
                    embedder.includes('mistral') ? 'mistral' :
                        embedder.includes('text-embedding-3-large') ? 'openai_large' :
                            embedder.includes('text-embedding-3-small') ? 'openai_small' :
                                embedder.includes('voyage-3.5-lite') ? 'voyage_lite' :
                                    embedder.includes('voyage') ? 'voyage' : 'gemini'

                return `${shortEnricher}_${shortEmbedder}`
            }

            const embeddingKey = generateKey(enrichmentModel, embeddingModel)
            console.log(`💾 [REGEN] Saving to key: ${embeddingKey}`)

            // Fetch current embeddings
            const { data: currentGroup } = await supabase
                .from('groups')
                .select('embeddings')
                .eq('id', group.id)
                .single()

            const currentEmbeddings = (currentGroup?.embeddings as any) || {}

            // Update group with new embeddings
            await supabase
                .from('groups')
                .update({
                    embeddings: {
                        ...currentEmbeddings,
                        [embeddingKey]: {
                            identity: identityEmb,
                            physical: physicalEmb,
                            context: contextEmb
                        }
                    }
                })
                .eq('id', group.id)

            // Calculate tokens: enrichment (input ~20 + output ~150) + embeddings (3 × ~50)
            const enrichmentInputTokens = Math.ceil(group.name.length / 4) // ~4 chars per token
            const enrichmentOutputTokens = 150 // identity + physical + context
            const embeddingTokens = 150 // 3 embeddings × ~50 tokens each
            const tokensUsed = enrichmentInputTokens + enrichmentOutputTokens + embeddingTokens
            totalTokens += tokensUsed

            // Log to ai_usage_logs
            await supabase.from('ai_usage_logs').insert({
                operation_type: 'embedding_regeneration',
                model_name: embeddingModel,
                tokens_input: enrichmentInputTokens + embeddingTokens,
                tokens_output: enrichmentOutputTokens,
                total_tokens: tokensUsed,
                context: 'embedding_regeneration',
                details: {
                    group_id: group.id,
                    embedding_key: embeddingKey,
                    job_id: jobId,
                    enrichment_model: enrichmentModel
                }
            } as any)

            // Update progress and tokens
            await supabase
                .from('embedding_regeneration_jobs')
                .update({
                    processed_groups: i + 1,
                    total_tokens: totalTokens
                })
                .eq('id', jobId)

            // Delay to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 1000))
            console.log(`✅ [REGEN] Group ${i + 1}/${groups.length} completed`)

        } catch (error: any) {
            console.error(`❌ [REGEN] Error processing group ${group.id}:`, error)

            // Track failed group
            failedGroups.push({
                group_id: group.id,
                group_name: group.name,
                error: error.message || 'Unknown error'
            })

            // Update failed groups in job
            await supabase
                .from('embedding_regeneration_jobs')
                .update({
                    failed_groups: failedGroups
                })
                .eq('id', jobId)

            // Continue with next group
        }
    }

    // Mark as completed
    await supabase
        .from('embedding_regeneration_jobs')
        .update({
            status: failedGroups.length > 0 ? 'completed' : 'completed',
            current_group_id: null,
            current_group_name: null,
            current_enrichment: null
        })
        .eq('id', jobId)

    console.log(`🎉 [REGEN] Regeneration completed!`)
    console.log(`📊 [REGEN] Total: ${groups.length}, Success: ${groups.length - failedGroups.length}, Failed: ${failedGroups.length}`)
    console.log(`🎯 [REGEN] Total tokens: ${totalTokens.toLocaleString()}`)
}
