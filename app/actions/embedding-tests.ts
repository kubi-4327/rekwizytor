'use server'

import { createClient } from '@/utils/supabase/server'
import { generateEmbedding } from '@/utils/embeddings'
import { TaskType } from '@google/generative-ai'
import { enrichGroupNameForEmbedding } from '@/utils/group-embedding-enrichment'
import { classifyQueryIntent, getWeightsForIntent } from '@/utils/search-logic'

// Types
export interface EmbeddingTestRun {
    id: string
    name: string
    status: 'pending' | 'running' | 'completed' | 'aborted' | 'failed'
    embedding_model: string
    tester_model: string
    tester_temperature: number
    difficulty_mode: 'easy' | 'medium' | 'hard' | 'mixed'
    mvs_weight_identity: number
    mvs_weight_physical: number
    mvs_weight_context: number
    use_dynamic_weights: boolean
    target_query_count: number
    completed_query_count: number
    total_search_tokens: number
    total_tester_tokens: number
    created_at: string
    updated_at: string
}

export interface TestMetrics {
    accuracy_at_1: number
    accuracy_at_5: number
    accuracy_at_10: number
    mean_reciprocal_rank: number
    average_rank: number
    total_queries: number
    successful_queries: number
}

// Get all test runs
export async function getTestRuns(): Promise<EmbeddingTestRun[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('embedding_test_runs')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching test runs:', error)
        return []
    }

    return data as EmbeddingTestRun[]
}

// Get single test run with metrics
export async function getTestRun(id: string): Promise<{
    run: EmbeddingTestRun | null
    metrics: TestMetrics | null
}> {
    const supabase = await createClient()

    const { data: run, error: runError } = await supabase
        .from('embedding_test_runs')
        .select('*')
        .eq('id', id)
        .single()

    if (runError || !run) {
        return { run: null, metrics: null }
    }

    const { data: metrics, error: metricsError } = await supabase
        .rpc('calculate_test_metrics', { test_run_id: id })
        .single()

    if (metricsError) {
        console.error('Error calculating metrics:', metricsError)
        return { run: run as EmbeddingTestRun, metrics: null }
    }

    return {
        run: run as EmbeddingTestRun,
        metrics: metrics as TestMetrics
    }
}

// Get test results for a run
export async function getTestResults(runId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('embedding_test_results')
        .select('*')
        .eq('run_id', runId)
        .order('created_at', { ascending: true })

    if (error) {
        console.error('Error fetching test results:', error)
        return []
    }

    return data
}

// Create new test run
export async function createTestRun(config: {
    name: string
    embedding_model: string
    group_enrichment_prompt?: string
    query_rewriter_prompt?: string
    use_sample_groups?: boolean
    tester_model: string
    tester_temperature: number
    difficulty_mode: 'easy' | 'medium' | 'hard' | 'mixed'
    mvs_weight_identity: number
    mvs_weight_physical: number
    mvs_weight_context: number
    match_threshold: number
    delay_between_queries_ms: number
    target_query_count: number
    use_dynamic_weights?: boolean
    skip_auto_start?: boolean
}): Promise<{ success: boolean; runId?: string; error?: string }> {
    const supabase = await createClient()

    // Extract non-db fields
    const { skip_auto_start, ...dbConfig } = config

    // Validate weights sum to 1.0 (only if not using dynamic weights)
    if (!config.use_dynamic_weights) {
        const weightSum = config.mvs_weight_identity + config.mvs_weight_physical + config.mvs_weight_context
        if (Math.abs(weightSum - 1.0) > 0.01) {
            return { success: false, error: 'MVS weights must sum to 1.0' }
        }
    }

    const { data, error } = await supabase
        .from('embedding_test_runs')
        .insert([dbConfig])
        .select('id')
        .single()

    if (error) {
        console.error('Error creating test run:', error)
        return { success: false, error: error.message }
    }

    console.log('✅ [CREATE] Test run created with ID:', data.id)

    // Trigger test execution in background ONLY if not skipped
    if (!skip_auto_start) {
        console.log('🎬 [CREATE] Triggering background test execution...')
        runTestQueriesInBackground(data.id)
    } else {
        console.log('⏭️ [CREATE] Skipping auto-start (standalone task)')
    }

    return { success: true, runId: data.id }
}

// Update test run status
export async function updateTestRunStatus(
    runId: string,
    status: 'pending' | 'running' | 'completed' | 'aborted' | 'failed',
    errorMessage?: string
): Promise<{ success: boolean }> {
    const supabase = await createClient()

    const { error } = await supabase
        .from('embedding_test_runs')
        .update({ status, error_message: errorMessage })
        .eq('id', runId)

    if (error) {
        console.error('Error updating test run status:', error)
        return { success: false }
    }

    return { success: true }
}


// Background test execution process
async function runTestQueriesInBackground(runId: string) {
    console.log('🚀 [TEST] Starting background test execution for run:', runId)
    const supabase = await createClient()

    // 1. Get run config
    console.log('📋 [TEST] Fetching run configuration...')
    const { data: run, error: runError } = await supabase
        .from('embedding_test_runs')
        .select('*')
        .eq('id', runId)
        .single()

    if (runError || !run) {
        console.error('❌ [TEST] Failed to fetch run config:', runError)
        return
    }
    console.log('✅ [TEST] Run config loaded:', { name: run.name, targetCount: run.target_query_count })

    // 2. Update status to running
    console.log('🔄 [TEST] Updating status to running...')
    await supabase
        .from('embedding_test_runs')
        .update({ status: 'running' })
        .eq('id', runId)
    console.log('✅ [TEST] Status updated to running')

    try {
        // 3. Get source groups for query generation
        console.log('👥 [TEST] Fetching groups...')
        let query = supabase.from('groups').select('id, name, embeddings')
        if (run.use_sample_groups) query = query.limit(200) // Fetch more initially to filter
        const { data: allGroups } = await query

        if (!allGroups || allGroups.length === 0) {
            console.error('❌ [TEST] No groups found for testing')
            throw new Error('No groups found for testing')
        }

        // Filter to only groups that have embeddings for the selected key
        const groups = allGroups.filter(g => {
            const embeddings = g.embeddings as any
            return embeddings && embeddings[run.embedding_model]
        }).map(g => ({ id: g.id, name: g.name }))

        if (groups.length === 0) {
            const errorMsg = `No groups found with embeddings for key: ${run.embedding_model}`
            console.error(`❌ [TEST] ${errorMsg}`)
            throw new Error(errorMsg)
        }

        // If using sample, limit to requested amount
        const finalGroups = run.use_sample_groups ? groups.slice(0, 50) : groups
        console.log(`✅ [TEST] Found ${finalGroups.length} groups with embeddings for key ${run.embedding_model}`)

        let completed = 0
        let totalSearchTokens = 0
        let totalTesterTokens = 0

        // 4. Test Loop
        console.log(`🔁 [TEST] Starting test loop for ${run.target_query_count} queries...`)
        for (let i = 0; i < run.target_query_count; i++) {
            console.log(`\n📝 [TEST] Query ${i + 1}/${run.target_query_count}`)

            // Pick a random group as the "target"
            const targetGroup = finalGroups[Math.floor(Math.random() * finalGroups.length)]
            console.log(`🎯 [TEST] Target group: "${targetGroup.name}" (${targetGroup.id})`)

            try {
                // a. Generate test query using Tester Model
                console.log(`🤖 [TEST] Generating query with ${run.tester_model}...`)
                const { query: testQuery, tokensUsed: testerTokens } = await generateTestQuery(
                    targetGroup.name,
                    run.tester_model,
                    run.tester_temperature ?? 0.7,
                    run.difficulty_mode ?? 'medium'
                )
                totalTesterTokens += testerTokens
                console.log(`✅ [TEST] Generated query: "${testQuery}" (${testerTokens} tokens)`)

                // b. Classify query intent and determine weights
                const queryIntent = classifyQueryIntent(testQuery)
                let appliedWeights = {
                    identity: run.mvs_weight_identity,
                    physical: run.mvs_weight_physical,
                    context: run.mvs_weight_context
                }

                if (run.use_dynamic_weights) {
                    appliedWeights = getWeightsForIntent(queryIntent)
                    console.log(`🧠 [TEST] Smart Search Intent: [${queryIntent.toUpperCase()}]`, appliedWeights)
                }

                // c. Perform search (generates query embedding)
                console.log(`🔍 [TEST] Performing search...`)
                const { results: searchResults, tokensUsed: searchTokens } = await performTestSearch(
                    testQuery,
                    run.embedding_model,
                    appliedWeights
                )
                totalSearchTokens += searchTokens
                console.log(`✅ [TEST] Search completed (${searchTokens} tokens), ${searchResults.length} results`)

                // d. Extract analytics data
                const top1 = searchResults[0]
                const top2 = searchResults[1]
                const similarityMargin = top1 && top2 ? top1.similarity - top2.similarity : null

                // e. Determine Rank of target group
                const rank = searchResults.findIndex(r => r.id === targetGroup.id) + 1
                const isMatch = rank > 0 && rank <= 10
                console.log(`📊 [TEST] Target rank: ${rank > 0 ? rank : 'not found'} ${isMatch ? '✅' : '❌'} (margin: ${similarityMargin?.toFixed(4) || 'N/A'})`)

                // f. Record Result with analytics
                console.log(`💾 [TEST] Saving result to database...`)
                await supabase.from('embedding_test_results').insert({
                    run_id: runId,
                    generated_query: testQuery,
                    source_group_id: targetGroup.id,
                    source_group_name: targetGroup.name,
                    correct_rank: rank > 0 ? rank : null,
                    top_results: searchResults.slice(0, 5) as any,
                    search_tokens: searchTokens,
                    tester_tokens: testerTokens,
                    // New analytics columns
                    query_intent: queryIntent,
                    similarity_margin: similarityMargin,
                    applied_weights: appliedWeights,
                    top1_group_id: top1?.id || null,
                    top1_group_name: top1?.name || null
                })

                completed++
                console.log(`✅ [TEST] Result saved. Completed: ${completed}/${run.target_query_count}`)

                // Update run progress
                console.log(`🔄 [TEST] Updating progress...`)
                await supabase
                    .from('embedding_test_runs')
                    .update({
                        completed_query_count: completed,
                        total_search_tokens: totalSearchTokens,
                        total_tester_tokens: totalTesterTokens
                    })
                    .eq('id', runId)
                console.log(`✅ [TEST] Progress updated`)

                // Delay
                const delay = run.delay_between_queries_ms || 500
                if (i < run.target_query_count - 1) {
                    console.log(`⏳ [TEST] Waiting ${delay}ms before next query...`)
                    await new Promise(resolve => setTimeout(resolve, delay))
                }

            } catch (err) {
                console.error(`❌ [TEST] Error during test iteration ${i + 1}:`, err)
            }
        }

        // 5. Mark as completed
        console.log('🎉 [TEST] All queries completed. Marking test as completed...')
        await supabase
            .from('embedding_test_runs')
            .update({ status: 'completed' })
            .eq('id', runId)
        console.log('✅ [TEST] Test marked as completed')

    } catch (error: any) {
        console.error('💥 [TEST] Test run failed:', error)
        await supabase
            .from('embedding_test_runs')
            .update({ status: 'failed', error_message: error.message })
            .eq('id', runId)
    }
}

// Helper to generate query with LLM
async function generateTestQuery(
    groupName: string,
    model: string,
    temp: number,
    difficulty: string
): Promise<{ query: string; tokensUsed: number }> {
    const systemInstruction = `Jesteś testerem systemu wyszukiwania. Twoim zadaniem jest wygenerowanie KRÓTKIEGO zapytania (1-4 słowa), które użytkownik mógłby wpisać w wyszukiwarkę, aby znaleźć przedmiot: "${groupName}".

ZASADY:
- Zwróć TYLKO treść zapytania, bez cudzysłowów i wyjaśnień
- Maksymalnie 4 słowa
- Użyj języka polskiego
- Nie używaj zdań, tylko frazy/słowa kluczowe

Poziomy trudności:
- easy: synonim lub alternatywna nazwa (np. "${groupName}" → "nazwa podobna")
- medium: opis funkcji/przeznaczenia (np. "do czego służy")
- hard: kontekst, skojarzenie, miejsce użycia`

    let userPrompt = ''

    switch (difficulty) {
        case 'easy':
            userPrompt = `Podaj synonim lub alternatywną nazwę dla: "${groupName}"\nOdpowiedz TYLKO nazwą (1-3 słowa):`
            break
        case 'medium':
            userPrompt = `Opisz do czego służy: "${groupName}"\nUżyj 2-4 słów描述 funkcji:`
            break
        case 'hard':
            userPrompt = `W jakim kontekście można spotkać: "${groupName}"?\nPodaj miejsca/sytuacje (2-4 słowa):`
            break
        default:
            userPrompt = `Wygeneruj krótkie zapytanie wyszukiwania dla: "${groupName}"\n(1-4 słowa):`
    }

    if (model.startsWith('gemini')) {
        const { geminiFlash } = await import('@/utils/gemini')
        if (!geminiFlash) throw new Error('Gemini not available')

        const result = await geminiFlash.generateContent({
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            generationConfig: {
                temperature: temp,
                maxOutputTokens: 20, // Force short output
            }
        })

        const text = result.response.text().trim()
        const query = text
            .replace(/^["']|["']$/g, '')
            .split('\n')[0]
            .substring(0, 100)
            .trim()

        // Estimate tokens: input prompt + output (max 20)
        const inputTokens = Math.ceil((systemInstruction.length + userPrompt.length) / 4)
        const outputTokens = Math.min(20, Math.ceil(query.length / 4))
        return { query, tokensUsed: inputTokens + outputTokens }
    }

    // OpenAI & Mistral
    const messages = [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: userPrompt }
    ]

    if (model.includes('mistral')) {
        const apiKey = process.env.MISTRAL_API_KEY
        if (!apiKey) throw new Error('MISTRAL_API_KEY missing')
        const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
                model,
                messages,
                temperature: temp,
                max_tokens: 20
            })
        })
        const data = await response.json()
        const text = data.choices[0].message.content.trim()
        const query = text.replace(/^["']|["']$/g, '').split('\n')[0].substring(0, 100).trim()

        // Extract token usage from API response
        const tokensUsed = data.usage?.total_tokens || 40 // fallback estimate
        return { query, tokensUsed }
    } else {
        // OpenAI
        const apiKey = process.env.OPENAI_API_KEY
        if (!apiKey) throw new Error('OPENAI_API_KEY missing')
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
                model,
                messages,
                temperature: temp,
                max_tokens: 20
            })
        })
        const data = await response.json()
        const text = data.choices[0].message.content.trim()
        const query = text.replace(/^["']|["']$/g, '').split('\n')[0].substring(0, 100).trim()

        // Extract token usage from API response
        const tokensUsed = data.usage?.total_tokens || 40 // fallback estimate
        return { query, tokensUsed }
    }
}

// Helper to perform multi-vector search directly on groups
async function performTestSearch(
    query: string,
    modelOrKey: string,
    weights: any
): Promise<{ results: any[]; tokensUsed: number }> {
    const { generateEmbedding } = await import('@/utils/embeddings')
    const { TaskType } = await import('@google/generative-ai')

    // Determine Model Name and Lookup Key
    let embeddingModelName = modelOrKey
    let embeddingKey = modelOrKey

    if (modelOrKey.includes('_')) {
        // It's a composite key (e.g. g25f_gem004)
        embeddingKey = modelOrKey

        const suffix = modelOrKey.split('_').pop() || ''

        // Map short identifiers back to full model names
        const reverseEmbeddingMap: Record<string, string> = {
            'gem004': 'gemini-text-embedding-004',
            'oai3l': 'text-embedding-3-large',
            'oai3s': 'text-embedding-3-small',
            'mste': 'mistral-embed',
            'voy35l': 'voyage-3.5-lite',
            'voy35': 'voyage-3.5'
        }

        if (reverseEmbeddingMap[suffix]) {
            embeddingModelName = reverseEmbeddingMap[suffix]
        } else {
            const errorMsg = `Unknown embedding suffix '${suffix}' in key '${modelOrKey}'. Valid suffixes: ${Object.keys(reverseEmbeddingMap).join(', ')}`
            console.error(`❌ [SEARCH] ${errorMsg}`)
            throw new Error(errorMsg)
        }
        console.log(`🔍 [SEARCH] Resolved key '${modelOrKey}' to model '${embeddingModelName}'`)
    } else {
        // Legacy fallback: hardcoded generation (removed in favor of explicit keys)
        // If exact model name is passed, we try to use it with a default enricher prefix for lookup?
        // Better to warn that we expect keys now.
        console.log(`⚠️ [SEARCH] Received raw model name '${modelOrKey}', assuming it is the key (legacy behavior might fail if key mismatch)`)
        embeddingKey = modelOrKey // Try using it as is, or maybe hardcode 'gemini_gemini' logic if needed?
        // Previous logic used generateKey('gemini-2.0-flash-exp', model) -> result was e.g. gemini_gemini
        // We will stick to the new explicit approach.
    }

    // Generate embedding for the query
    const qEmbedding = await generateEmbedding(query, TaskType.RETRIEVAL_QUERY, embeddingModelName)

    const supabase = await createClient()

    console.log(`🔍 [SEARCH] Using embeddings key: ${embeddingKey}`)

    // Search directly in groups table using JSONB embeddings
    const { data: groups, error } = await supabase
        .from('groups')
        .select('id, name, embeddings')
        .not('embeddings', 'is', null)

    if (error) {
        console.error(`❌ [SEARCH] Error fetching groups:`, error)
        throw error
    }
    if (!groups) return { results: [], tokensUsed: 0 }

    console.log(`🔍 [SEARCH] Processing ${groups.length} groups for similarity`)

    // Calculate similarity scores for each group
    const results = groups.map((group: any) => {
        let totalSimilarity = 0
        let validVectors = 0

        // Get embeddings from key
        const allEmbeddings = group.embeddings || {}
        const embeddings = allEmbeddings[embeddingKey]

        if (!embeddings || typeof embeddings !== 'object') {
            return {
                id: group.id as string,
                name: group.name as string,
                similarity: 0
            }
        }

        // Identity similarity
        if (embeddings.identity && Array.isArray(embeddings.identity) && embeddings.identity.length === qEmbedding.length) {
            const sim = cosineSimilarity(qEmbedding, embeddings.identity)
            totalSimilarity += sim * weights.identity
            validVectors++
        }

        // Physical similarity
        if (embeddings.physical && Array.isArray(embeddings.physical) && embeddings.physical.length === qEmbedding.length) {
            const sim = cosineSimilarity(qEmbedding, embeddings.physical)
            totalSimilarity += sim * weights.physical
            validVectors++
        }

        // Context similarity
        if (embeddings.context && Array.isArray(embeddings.context) && embeddings.context.length === qEmbedding.length) {
            const sim = cosineSimilarity(qEmbedding, embeddings.context)
            totalSimilarity += sim * weights.context
            validVectors++
        }

        if (validVectors === 0 && embeddings) {
            console.warn(`⚠️  [SEARCH] Group "${group.name}" has invalid embeddings for key ${embeddingKey}`)
        }

        return {
            id: group.id as string,
            name: group.name as string,
            similarity: validVectors > 0 ? totalSimilarity : 0
        }
    })

    const nonZeroResults = results.filter(r => r.similarity > 0)
    console.log(`✅ [SEARCH] Found ${nonZeroResults.length}/${results.length} groups with embeddings for key ${embeddingKey}`)
    console.log(`✅ [SEARCH] Top 3:`, nonZeroResults
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 3)
        .map(r => `${r.name}: ${r.similarity.toFixed(4)}`))

    // Calculate tokens used for embedding generation
    // Estimate: query embedding generation ~50 tokens
    const tokensUsed = Math.ceil(query.length / 4) + 50

    // Sort by similarity and return top 20
    const sortedResults = results
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 20)

    return { results: sortedResults, tokensUsed }
}

// Cosine similarity helper
function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i]
        normA += a[i] * a[i]
        normB += b[i] * b[i]
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB)
    return denominator === 0 ? 0 : dotProduct / denominator
}


// Delete test run
export async function deleteTestRun(runId: string): Promise<{ success: boolean }> {
    const supabase = await createClient()

    const { error } = await supabase
        .from('embedding_test_runs')
        .delete()
        .eq('id', runId)

    if (error) {
        console.error('Error deleting test run:', error)
        return { success: false }
    }

    return { success: true }
}

// Get list of existing embedding keys from database
export async function getExistingEmbeddingKeys(): Promise<string[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('groups')
        .select('embeddings')
        .not('embeddings', 'is', null)
        .limit(100)

    if (error || !data) {
        console.error('Error fetching embeddings:', error)
        return []
    }

    // Extract all unique keys from embeddings JSONB
    const keysSet = new Set<string>()
    data.forEach(group => {
        if (group.embeddings && typeof group.embeddings === 'object') {
            Object.keys(group.embeddings).forEach(key => keysSet.add(key))
        }
    })

    return Array.from(keysSet).sort()
}

// Regenerate embeddings for all groups (simplified version)
export async function regenerateEmbeddings(config: {
    embedding_model: string
    enrichment_model: string
    use_sample: boolean
}): Promise<{ success: boolean; message?: string; error?: string }> {
    const supabase = await createClient()

    console.log(`🔄 [REGEN] Starting regeneration with ${config.embedding_model} + ${config.enrichment_model}`)

    // Get groups
    let query = supabase.from('groups').select('id, name')
    if (config.use_sample) {
        query = query.limit(50)
    }

    const { data: groups, error: groupsError } = await query

    if (groupsError || !groups) {
        return { success: false, error: 'Failed to fetch groups' }
    }

    console.log(`📊 [REGEN] Processing ${groups.length} groups`)

    // Generate precise embedding key based on exact model names
    const generateEmbeddingKey = (enrichmentModel: string, embeddingModel: string): string => {
        // Map enrichment models to short identifiers
        const enrichmentMap: Record<string, string> = {
            'gemini-2.5-flash-lite': 'g25fl',
            'gemini-2.5-flash': 'g25f',
            'gemini-2.0-flash-exp': 'g20f',
            'gemini-1.5-flash': 'g15f',
            'gpt-5-nano': 'gpt5n',
            'gpt-5-mini': 'gpt5m',
            'gpt-4.1-nano': 'gpt41n',
            'gpt-4o-mini': 'gpt4om',
            'gpt-4o': 'gpt4o',
            'mistral-large-latest': 'mstl'
        }

        // Map embedding models to short identifiers
        const embeddingMap: Record<string, string> = {
            'gemini-text-embedding-004': 'gem004',
            'text-embedding-3-large': 'oai3l',
            'text-embedding-3-small': 'oai3s',
            'mistral-embed': 'mste',
            'voyage-3.5-lite': 'voy35l',
            'voyage-3.5': 'voy35'
        }

        const enrichKey = enrichmentMap[enrichmentModel] || enrichmentModel.substring(0, 6)
        const embedKey = embeddingMap[embeddingModel] || embeddingModel.substring(0, 6)

        return `${enrichKey}_${embedKey}`
    }

    const embeddingKey = generateEmbeddingKey(config.enrichment_model, config.embedding_model)
    console.log(`🔑 [REGEN] Using key: ${embeddingKey}`)

    // Create job record for tracking
    const { data: job, error: jobError } = await supabase
        .from('embedding_regeneration_jobs')
        .insert({
            status: 'running',
            embedding_model: config.embedding_model,
            enrichment_model: config.enrichment_model,
            use_sample_groups: config.use_sample,
            total_groups: groups.length,
            processed_groups: 0,
            total_tokens: 0
        })
        .select('id')
        .single()

    if (jobError || !job) {
        console.error('Failed to create job record:', jobError)
        return { success: false, error: 'Failed to create job record' }
    }

    console.log(`📝 [REGEN] Created job record: ${job.id}`)

    // Process groups in background
    processGroupsInBackground(groups, config.embedding_model, config.enrichment_model, embeddingKey, job.id)

    return {
        success: true,
        message: `Started regeneration for ${groups.length} groups with key: ${embeddingKey}`
    }
}

// Background processing function
async function processGroupsInBackground(
    groups: { id: string; name: string }[],
    embeddingModel: string,
    enrichmentModel: string,
    embeddingKey: string,
    jobId: string
) {
    const supabase = await createClient()
    let totalTokens = 0

    for (let i = 0; i < groups.length; i++) {
        const group = groups[i]

        try {
            console.log(`[${i + 1}/${groups.length}] Processing: ${group.name}`)

            // Update job progress
            await supabase
                .from('embedding_regeneration_jobs')
                .update({
                    current_group_id: group.id,
                    current_group_name: group.name,
                    processed_groups: i
                })
                .eq('id', jobId)

            // Enrich
            const enriched = await enrichGroupNameForEmbedding(group.name, enrichmentModel)

            // Validate
            const safeEnriched = {
                identity: enriched.identity?.trim() || group.name,
                physical: enriched.physical?.trim() || 'przedmiot',
                context: enriched.context?.trim() || 'rekwizyt teatralny'
            }

            // Generate embeddings
            const [identityEmb, physicalEmb, contextEmb] = await Promise.all([
                generateEmbedding(safeEnriched.identity, TaskType.RETRIEVAL_DOCUMENT, embeddingModel),
                generateEmbedding(safeEnriched.physical, TaskType.RETRIEVAL_DOCUMENT, embeddingModel),
                generateEmbedding(safeEnriched.context, TaskType.RETRIEVAL_DOCUMENT, embeddingModel)
            ])

            // Get current embeddings
            const { data: currentGroup } = await supabase
                .from('groups')
                .select('embeddings')
                .eq('id', group.id)
                .single()

            const currentEmbeddings = (currentGroup?.embeddings as any) || {}

            // Update
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

            console.log(`✅ [${i + 1}/${groups.length}] Completed`)

            // Estimate tokens (enrichment ~200 input + ~150 output, embeddings ~100 input each)
            totalTokens += 550

            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000))

        } catch (error) {
            console.error(`❌ Error processing group ${group.id}:`, error)

            // Update job with error
            await supabase
                .from('embedding_regeneration_jobs')
                .update({
                    error_message: error instanceof Error ? error.message : 'Unknown error'
                })
                .eq('id', jobId)
        }
    }

    // Mark job as completed
    await supabase
        .from('embedding_regeneration_jobs')
        .update({
            status: 'completed',
            processed_groups: groups.length,
            total_tokens: totalTokens
        })
        .eq('id', jobId)

    console.log(`🎉 [REGEN] Completed all ${groups.length} groups with ${totalTokens} tokens`)
}

// ============================================
// TEST QUEUE MANAGEMENT
// ============================================

export interface QueueItem {
    id: string
    position: number
    status: 'pending' | 'running' | 'completed' | 'paused' | 'failed' | 'cancelled'
    config: Record<string, unknown>
    run_id: string | null
    error_message: string | null
    created_at: string
    started_at: string | null
    completed_at: string | null
}

export interface QueueState {
    status: 'idle' | 'running' | 'paused'
    current_queue_item_id: string | null
    updated_at: string
}

// Get queue state and items
export async function getQueueState(): Promise<{ state: QueueState | null, items: QueueItem[] }> {
    const supabase = await createClient()

    const [stateResult, itemsResult] = await Promise.all([
        supabase.from('embedding_queue_state').select('*').eq('id', 'global').single(),
        supabase.from('embedding_test_queue').select('*').order('position', { ascending: true })
    ])

    return {
        state: stateResult.data as QueueState | null,
        items: (itemsResult.data || []) as QueueItem[]
    }
}

// Add test config to queue
export async function addToQueue(config: Record<string, unknown>): Promise<{ success: boolean; id?: string; error?: string }> {
    const supabase = await createClient()

    // Get max position
    const { data: maxItem } = await supabase
        .from('embedding_test_queue')
        .select('position')
        .order('position', { ascending: false })
        .limit(1)
        .single()

    const newPosition = (maxItem?.position ?? -1) + 1

    const { data, error } = await supabase
        .from('embedding_test_queue')
        .insert({
            position: newPosition,
            status: 'pending',
            config: config as any
        })
        .select()
        .single()

    if (error) {
        console.error('Error adding to queue:', error)
        return { success: false, error: error.message }
    }

    return { success: true, id: data.id }
}

// Remove item from queue
export async function removeFromQueue(id: string): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient()

    const { error } = await supabase
        .from('embedding_test_queue')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('Error removing from queue:', error)
        return { success: false, error: error.message }
    }

    return { success: true }
}

// Clear all items from queue except currently running
export async function clearQueue(): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient()

    const { error } = await supabase
        .from('embedding_test_queue')
        .delete()
        .neq('status', 'running')

    if (error) {
        console.error('Error clearing queue:', error)
        return { success: false, error: error.message }
    }

    return { success: true }
}

// Reorder queue items
export async function reorderQueue(orderedIds: string[]): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient()

    // Update positions based on array order
    const updates = orderedIds.map((id, index) =>
        supabase.from('embedding_test_queue').update({ position: index }).eq('id', id)
    )

    await Promise.all(updates)
    return { success: true }
}

// Start queue execution
export async function startQueue(): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient()

    // Update queue state to running
    await supabase
        .from('embedding_queue_state')
        .update({ status: 'running', updated_at: new Date().toISOString() })
        .eq('id', 'global')

    // Frontend will poll and process items
    return { success: true }
}

// Pause queue (finish current test, don't start next)
export async function pauseQueue(): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient()

    await supabase
        .from('embedding_queue_state')
        .update({ status: 'paused', updated_at: new Date().toISOString() })
        .eq('id', 'global')

    return { success: true }
}

// Stop queue (mark current as cancelled)
export async function stopQueue(): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient()

    // Get current item
    const { data: state } = await supabase
        .from('embedding_queue_state')
        .select('current_queue_item_id')
        .eq('id', 'global')
        .single()

    // Set queue to idle
    await supabase
        .from('embedding_queue_state')
        .update({
            status: 'idle',
            current_queue_item_id: null,
            updated_at: new Date().toISOString()
        })
        .eq('id', 'global')

    // Mark current item as cancelled if exists
    if (state?.current_queue_item_id) {
        await supabase
            .from('embedding_test_queue')
            .update({ status: 'cancelled' })
            .eq('id', state.current_queue_item_id)
    }

    return { success: true }
}

// Process next queue item (called by frontend polling, NOT infinite loop)
export async function processNextQueueItem(): Promise<{
    success: boolean
    hasMore: boolean
    currentItemId?: string
    error?: string
}> {
    const supabase = await createClient()

    // Check queue state
    const { data: state } = await supabase
        .from('embedding_queue_state')
        .select('status')
        .eq('id', 'global')
        .single()

    if (!state || state.status !== 'running') {
        return { success: true, hasMore: false }
    }

    // Get next pending item
    const { data: nextItem } = await supabase
        .from('embedding_test_queue')
        .select('*')
        .eq('status', 'pending')
        .order('position', { ascending: true })
        .limit(1)
        .single()

    if (!nextItem) {
        // No more items - set queue to idle
        await supabase
            .from('embedding_queue_state')
            .update({ status: 'idle', current_queue_item_id: null, updated_at: new Date().toISOString() })
            .eq('id', 'global')

        return { success: true, hasMore: false }
    }

    // Mark item as running
    await supabase
        .from('embedding_test_queue')
        .update({ status: 'running', started_at: new Date().toISOString() })
        .eq('id', nextItem.id)

    await supabase
        .from('embedding_queue_state')
        .update({ current_queue_item_id: nextItem.id, updated_at: new Date().toISOString() })
        .eq('id', 'global')

    console.log(`[QUEUE] Starting test: ${nextItem.id}`)

    try {
        // Create the test run
        const result = await createTestRun(nextItem.config as any)

        if (result.success && result.runId) {
            // Link run to queue item
            await supabase
                .from('embedding_test_queue')
                .update({ run_id: result.runId })
                .eq('id', nextItem.id)

            return {
                success: true,
                hasMore: true,
                currentItemId: nextItem.id
            }
        } else {
            throw new Error(result.error || 'Failed to create test run')
        }

    } catch (error) {
        console.error(`[QUEUE] Error processing item ${nextItem.id}:`, error)
        await supabase
            .from('embedding_test_queue')
            .update({
                status: 'failed',
                error_message: error instanceof Error ? error.message : 'Unknown error',
                completed_at: new Date().toISOString()
            })
            .eq('id', nextItem.id)

        return {
            success: false,
            hasMore: true,
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
}

// Mark queue item as completed (called when test finishes)
export async function markQueueItemCompleted(queueItemId: string): Promise<{ success: boolean }> {
    const supabase = await createClient()

    await supabase
        .from('embedding_test_queue')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', queueItemId)

    return { success: true }
}
