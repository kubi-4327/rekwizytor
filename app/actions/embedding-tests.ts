'use server'

import { createPocketBaseAdmin } from '@/lib/pocketbase/client'
import type { PocketBaseTestRun, PocketBaseTestResult, PocketBaseGroup } from '@/types/pocketbase'
import { generateEmbedding } from '@/utils/embeddings'
import { TaskType } from '@google/generative-ai'
import { enrichGroupNameForEmbedding } from '@/utils/group-embedding-enrichment'
import { classifyQueryIntent, getWeightsForIntent } from '@/utils/search-logic'
import { initWandBRun, logWandBMetrics, logWandBSummary, finishWandBRun } from '@/utils/wandb-logger'

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
    // Intent classification metrics
    vector_match_rate?: number
    identity_accuracy?: number
    physical_accuracy?: number
    context_accuracy?: number
    total_intent_tests?: number
}

// Get all test runs
export async function getTestRuns(): Promise<EmbeddingTestRun[]> {
    try {
        const pb = await createPocketBaseAdmin()
        // Using getList instead of getFullList due to PocketBase API issue with sort
        const result = await pb.collection('embedding_test_runs').getList<PocketBaseTestRun>(1, 500)

        // Map PocketBase fields to expected format
        return result.items.map(run => ({
            ...run,
            created_at: run.created,
            updated_at: run.updated
        })) as EmbeddingTestRun[]
    } catch (error) {
        console.error('Error fetching test runs:', error)
        return []
    }
}

// Get single test run with metrics
export async function getTestRun(id: string): Promise<{
    run: EmbeddingTestRun | null
    metrics: TestMetrics | null
}> {
    try {
        const pb = await createPocketBaseAdmin()

        // Get run
        const run = await pb.collection('embedding_test_runs').getOne<PocketBaseTestRun>(id)

        if (!run) {
            return { run: null, metrics: null }
        }

        // Calculate metrics manually (PocketBase doesn't have RPC functions)
        const metrics = await calculateTestMetrics(pb, id)

        return {
            run: {
                ...run,
                created_at: run.created,
                updated_at: run.updated
            } as EmbeddingTestRun,
            metrics
        }
    } catch (error) {
        console.error('Error fetching test run:', error)
        return { run: null, metrics: null }
    }
}

// Helper: Calculate test metrics from results
// Helper: Calculate basic accuracy and MRR metrics
function calculateBasicMetrics(results: PocketBaseTestResult[]) {
    if (results.length === 0) {
        return {
            accuracy_at_1: 0, accuracy_at_5: 0, accuracy_at_10: 0,
            mean_reciprocal_rank: 0, average_rank: 0,
            total_queries: 0, successful_queries: 0
        }
    }

    const totalQueries = results.length
    const validResults = results.filter(r => r.correct_rank && r.correct_rank > 0)
    const successfulQueries = validResults.length

    if (successfulQueries === 0) {
        return {
            accuracy_at_1: 0, accuracy_at_5: 0, accuracy_at_10: 0,
            mean_reciprocal_rank: 0, average_rank: 0,
            total_queries: totalQueries, successful_queries: 0
        }
    }

    const accuracyAt1 = validResults.filter(r => r.correct_rank === 1).length / totalQueries
    const accuracyAt5 = validResults.filter(r => r.correct_rank! <= 5).length / totalQueries
    const accuracyAt10 = validResults.filter(r => r.correct_rank! <= 10).length / totalQueries

    const mrr = validResults.reduce((sum, r) => sum + (1 / r.correct_rank!), 0) / totalQueries
    const avgRank = validResults.reduce((sum, r) => sum + r.correct_rank!, 0) / successfulQueries

    return {
        accuracy_at_1: accuracyAt1,
        accuracy_at_5: accuracyAt5,
        accuracy_at_10: accuracyAt10,
        mean_reciprocal_rank: mrr,
        average_rank: avgRank,
        total_queries: totalQueries,
        successful_queries: successfulQueries
    }
}

// Helper: Calculate intent classification accuracy
async function calculateIntentMetrics(pb: any, runId: string) {
    try {
        const intentData = await pb.collection('intent_test_data').getFullList({
            filter: `test_result_id ~ "${runId}"`
        })

        if (!intentData || intentData.length === 0) return {}

        const total = intentData.length
        const vectorMatchRate = intentData.filter((d: any) => d.vector_match === true).length / total

        const getAccuracy = (type: string) => {
            const tests = intentData.filter((d: any) => d.expected_dominant_vector === type)
            return tests.length > 0
                ? tests.filter((d: any) => d.vector_match === true).length / tests.length
                : 0
        }

        return {
            vector_match_rate: vectorMatchRate,
            identity_accuracy: getAccuracy('identity'),
            physical_accuracy: getAccuracy('physical'),
            context_accuracy: getAccuracy('context'),
            total_intent_tests: total
        }
    } catch (error) {
        console.warn('Failed to calculate intent metrics:', error)
        return {}
    }
}

async function calculateTestMetrics(pb: any, runId: string): Promise<TestMetrics | null> {
    try {
        const results = await pb.collection('embedding_test_results').getFullList({
            filter: `run_id="${runId}"`
        }) as PocketBaseTestResult[]

        const basicMetrics = calculateBasicMetrics(results)
        const intentMetrics = await calculateIntentMetrics(pb, runId)

        return { ...basicMetrics, ...intentMetrics }
    } catch (error) {
        console.error('Error calculating metrics:', error)
        return null
    }
}

// Get test results for a run
export async function getTestResults(runId: string) {
    try {
        const pb = await createPocketBaseAdmin()
        const data = await pb.collection('embedding_test_results').getFullList<PocketBaseTestResult>({
            filter: `run_id="${runId}"`,
            sort: 'created'
        })

        return data
    } catch (error) {
        console.error('Error fetching test results:', error)
        return []
    }
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
    try {
        const pb = await createPocketBaseAdmin()

        // Extract non-db fields
        const { skip_auto_start, ...dbConfig } = config

        // Validate weights sum to 1.0 (only if not using dynamic weights)
        if (!config.use_dynamic_weights) {
            const weightSum = config.mvs_weight_identity + config.mvs_weight_physical + config.mvs_weight_context
            if (Math.abs(weightSum - 1.0) > 0.01) {
                return { success: false, error: 'MVS weights must sum to 1.0' }
            }
        }

        // Generate embedding key from enrichment + embedding model
        // For now, we use a simple format: enricher_embedder
        // In the future, if enrichment model is configurable, update this
        const generateEmbeddingKey = (embeddingModel: string): string => {
            // If input already contains underscore, it's a composite key - return as-is
            if (embeddingModel.includes('_')) {
                console.log(`🔑 [CREATE] Using existing composite key: ${embeddingModel}`)
                return embeddingModel
            }

            // Default enricher for now (can be made configurable later)
            const enricher = 'g25f' // gemini-2.5-flash

            // Map embedding models to short identifiers
            const embeddingMap: Record<string, string> = {
                'gemini-text-embedding-004': 'gem004',
                'text-embedding-3-large': 'oai3l',
                'text-embedding-3-small': 'oai3s',
                'mistral-embed': 'mste',
                'voyage-3.5-lite': 'voy35l',
                'voyage-3.5': 'voy35'
            }

            const embedKey = embeddingMap[embeddingModel] || embeddingModel.substring(0, 6)
            const result = `${enricher}_${embedKey}`
            console.log(`🔑 [CREATE] Generated new key: ${result}`)
            return result
        }

        const embeddingKey = generateEmbeddingKey(config.embedding_model)
        console.log(`🔑 [CREATE] Generated embedding key: ${embeddingKey}`)

        // Prepare data for PocketBase - only fields that exist in schema
        const pbData = {
            name: config.name,
            status: 'pending',
            embedding_model: config.embedding_model,
            embedding_key: embeddingKey,
            use_sample_groups: config.use_sample_groups || false,
            tester_model: config.tester_model,
            tester_temperature: config.tester_temperature,
            difficulty_mode: config.difficulty_mode,
            mvs_weight_identity: config.mvs_weight_identity,
            mvs_weight_physical: config.mvs_weight_physical,
            mvs_weight_context: config.mvs_weight_context,
            match_threshold: config.match_threshold,
            delay_between_queries_ms: config.delay_between_queries_ms,
            target_query_count: config.target_query_count,
            completed_query_count: 0,
            requires_reembedding: false,
            error_message: null,
            use_dynamic_weights: config.use_dynamic_weights || false,
            total_search_tokens: 0,
            total_tester_tokens: 0
        }

        const data = await pb.collection('embedding_test_runs').create(pbData)

        console.log('✅ [CREATE] Test run created with ID:', data.id)

        // Trigger test execution in background ONLY if not skipped
        if (!skip_auto_start) {
            console.log('🎬 [CREATE] Triggering background test execution...')
            runTestQueriesInBackground(data.id)
        } else {
            console.log('⏭️ [CREATE] Skipping auto-start (standalone task)')
        }

        return { success: true, runId: data.id }
    } catch (error: any) {
        console.error('Error creating test run:', error)
        return { success: false, error: error.message }
    }
}

// Update test run status
export async function updateTestRunStatus(
    runId: string,
    status: 'pending' | 'running' | 'completed' | 'aborted' | 'failed',
    errorMessage?: string
): Promise<{ success: boolean }> {
    try {
        const pb = await createPocketBaseAdmin()
        await pb.collection('embedding_test_runs').update(runId, {
            status,
            error_message: errorMessage
        })

        return { success: true }
    } catch (error) {
        console.error('Error updating test run status:', error)
        return { success: false }
    }
}



// Helper to process a single query iteration
async function processSingleTestQuery(
    pb: any,
    runId: string,
    run: any,
    targetGroup: any,
    embeddingKey: string
): Promise<{ success: boolean; searchTokens: number; testerTokens: number }> {
    try {
        console.log(`🤖 [TEST] Generating query with ${run.tester_model}...`)

        // a. Generate test query
        const { query: testQuery, tokensUsed: testerTokens, dominant_vector } = await generateTestQuery(
            targetGroup.name,
            run.tester_model,
            run.tester_temperature ?? 0.7,
            run.difficulty_mode ?? 'medium'
        )
        console.log(`✅ [TEST] Generated query: "${testQuery}"`)

        // b. Classify query intent using Intent Classifier
        let intentClassification: any = null
        try {
            const { intentClassifier } = await import('@/utils/intent-classifier')
            intentClassification = await intentClassifier.classify(testQuery)
        } catch (error) {
            console.warn(`⚠️ [TEST] Intent classification failed:`, error)
        }

        // c. Determine weights
        const queryIntent = classifyQueryIntent(testQuery)
        let appliedWeights = {
            identity: run.mvs_weight_identity,
            physical: run.mvs_weight_physical,
            context: run.mvs_weight_context
        }

        if (run.use_dynamic_weights) {
            appliedWeights = getWeightsForIntent(queryIntent)
        }

        // d. Perform search
        const { results: searchResults, tokensUsed: searchTokens } = await performTestSearch(
            testQuery,
            embeddingKey,
            appliedWeights
        )

        // e. Analytics
        const top1 = searchResults[0]
        const top2 = searchResults[1]
        const similarityMargin = top1 && top2 ? top1.similarity - top2.similarity : null

        const rank = searchResults.findIndex((r: any) => r.id === targetGroup.id) + 1

        // f. Save Result
        const testResult = await pb.collection('embedding_test_results').create({
            run_id: runId,
            generated_query: testQuery,
            source_group_id: targetGroup.id,
            source_group_name: targetGroup.name,
            correct_rank: rank > 0 ? rank : null,
            top_results: searchResults.slice(0, 5),
            search_tokens: searchTokens,
            tester_tokens: testerTokens,
            query_intent: queryIntent,
            similarity_margin: similarityMargin,
            applied_weights: appliedWeights
        })

        // g. Save intent classification data
        if (intentClassification) {
            try {
                const detected_dominant = intentClassification.identity > intentClassification.physical
                    ? 'identity'
                    : 'physical'

                await pb.collection('intent_test_data').create({
                    test_result_id: testResult.id,
                    expected_dominant_vector: dominant_vector,
                    detected_dominant_vector: detected_dominant,
                    intent_identity_weight: intentClassification.identity,
                    intent_physical_weight: intentClassification.physical,
                    vector_match: dominant_vector === detected_dominant,
                    classifier_source: intentClassification.source,
                    classifier_confidence: intentClassification.confidence || null,
                    classifier_latency_ms: intentClassification.latencyMs || null
                })
            } catch (error) {
                console.warn(`⚠️ [TEST] Failed to save intent data:`, error)
            }
        }

        return { success: true, searchTokens, testerTokens }
    } catch (queryError: any) {
        console.error(`❌ [TEST] Error processing query:`, queryError)
        return { success: false, searchTokens: 0, testerTokens: 0 }
    }
}

async function prepareTestContext(pb: any, runId: string) {
    console.log('📋 [TEST] Fetching configuration...')
    const run = await pb.collection('embedding_test_runs').getOne(runId) as PocketBaseTestRun
    if (!run) throw new Error('Failed to fetch run config')

    let wandbRun = null
    if (process.env.WANDB_API_KEY) {
        wandbRun = await initWandBRun(runId, {
            embedding_model: run.embedding_model,
            enrichment_model: (run as any).enrichment_variant || 'none',
            tester_model: run.tester_model,
            target_query_count: run.target_query_count,
            difficulty_mode: run.difficulty_mode,
            mvs_weight_identity: run.mvs_weight_identity,
            mvs_weight_physical: run.mvs_weight_physical,
            mvs_weight_context: run.mvs_weight_context,
            use_dynamic_weights: run.use_dynamic_weights
        })
    }

    await pb.collection('embedding_test_runs').update(runId, { status: 'running' })
    return { run, wandbRun }
}

async function resolveTestGroups(pb: any, run: PocketBaseTestRun) {
    const limit = run.use_sample_groups ? 200 : undefined
    const allGroups = await pb.collection('groups').getFullList({
        filter: 'embeddings != null',
        fields: 'id,name,embeddings',
        ...(limit && { limit })
    }) as PocketBaseGroup[]

    const embeddingKey = run.embedding_key || run.embedding_model
    const groups = allGroups
        .filter((g: any) => g.embeddings && g.embeddings[embeddingKey])
        .map((g: any) => ({ id: g.id, name: g.name }))

    if (groups.length === 0) throw new Error(`No groups found with embeddings for key: ${embeddingKey}`)
    return { groups: run.use_sample_groups ? groups.slice(0, 50) : groups, embeddingKey }
}

async function executeTestQueries(pb: any, runId: string, run: PocketBaseTestRun, groups: any[], embeddingKey: string, wandbRun: any) {
    let completed = 0, totalSearch = 0, totalTester = 0

    for (let i = 0; i < run.target_query_count; i++) {
        const targetGroup = groups[Math.floor(Math.random() * groups.length)]
        const result = await processSingleTestQuery(pb, runId, run, targetGroup, embeddingKey)

        if (result.success) {
            totalSearch += result.searchTokens
            totalTester += result.testerTokens
            completed++

            await pb.collection('embedding_test_runs').update(runId, {
                completed_query_count: completed,
                total_search_tokens: totalSearch,
                total_tester_tokens: totalTester
            })

            if (wandbRun && completed % 10 === 0) {
                const metrics = await calculateTestMetrics(pb, runId)
                if (metrics) await logWandBMetrics(completed, metrics)
            }
        }

        if (i < run.target_query_count - 1) {
            await new Promise(resolve => setTimeout(resolve, run.delay_between_queries_ms || 500))
        }
    }
    return { totalSearch, totalTester }
}

// Background test execution process
async function runTestQueriesInBackground(runId: string) {
    const pb = await createPocketBaseAdmin()
    let wandbContext: any = null

    try {
        const { run, wandbRun } = await prepareTestContext(pb, runId)
        wandbContext = wandbRun

        const { groups, embeddingKey } = await resolveTestGroups(pb, run)
        const { totalSearch, totalTester } = await executeTestQueries(pb, runId, run, groups, embeddingKey, wandbRun)

        await pb.collection('embedding_test_runs').update(runId, { status: 'completed' })

        if (wandbRun) {
            const finalMetrics = await calculateTestMetrics(pb, runId)
            if (finalMetrics) await logWandBSummary({ ...finalMetrics, total_search_tokens: totalSearch, total_tester_tokens: totalTester })
            await finishWandBRun()
        }
    } catch (error: any) {
        console.error('💥 [TEST] Test run failed:', error)
        if (wandbContext) await finishWandBRun()
        await pb.collection('embedding_test_runs').update(runId, { status: 'failed', error_message: error.message })
    }
}

async function generateGeminiQuery(userPrompt: string, temp: number, systemInstruction: string) {
    const { geminiFlash } = await import('@/utils/gemini')
    if (!geminiFlash) throw new Error('Gemini not available')

    const result = await geminiFlash.generateContent({
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: temp, maxOutputTokens: 20 }
    })

    const text = result.response.text().trim()
    const jsonMatch = text.match(/\{[^}]+\}/)

    if (!jsonMatch) {
        const query = text.replace(/^["']|["']$/g, '').split('\n')[0].substring(0, 100).trim()
        return { query, tokensUsed: Math.ceil((systemInstruction.length + userPrompt.length) / 4) + Math.min(20, Math.ceil(query.length / 4)), dominant_vector: 'physical' as const }
    }

    const parsed = JSON.parse(jsonMatch[0])
    return {
        query: parsed.query || text,
        dominant_vector: (parsed.dominant_vector || 'physical') as 'identity' | 'physical' | 'context',
        tokensUsed: Math.ceil((systemInstruction.length + userPrompt.length) / 4) + Math.min(50, Math.ceil(text.length / 4))
    }
}

async function requestLLMQuery(model: string, messages: any[], temp: number) {
    const isMistral = model.includes('mistral')
    const url = isMistral ? 'https://api.mistral.ai/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions'
    const apiKey = isMistral ? process.env.MISTRAL_API_KEY : process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error(`${isMistral ? 'MISTRAL' : 'OPENAI'}_API_KEY missing`)

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages, temperature: temp, max_tokens: 20 })
    })
    return await response.json()
}

async function generateExternalQuery(model: string, userPrompt: string, temp: number, systemInstruction: string) {
    const messages = [{ role: 'system' as const, content: systemInstruction }, { role: 'user' as const, content: userPrompt }]
    const data = await requestLLMQuery(model, messages, temp)
    const text = data.choices[0].message.content.trim()
    const jsonMatch = text.match(/\{[^}]+\}/)

    if (!jsonMatch) {
        return {
            query: text.replace(/^["']|["']$/g, '').split('\n')[0].substring(0, 100).trim(),
            tokensUsed: data.usage?.total_tokens || 40,
            dominant_vector: 'physical' as const
        }
    }

    const parsed = JSON.parse(jsonMatch[0])
    return {
        query: parsed.query || text,
        dominant_vector: (parsed.dominant_vector || 'physical') as 'identity' | 'physical' | 'context',
        tokensUsed: data.usage?.total_tokens || 40
    }
}

// Helper to generate query with LLM
async function generateTestQuery(
    groupName: string,
    model: string,
    temp: number,
    difficulty: string
): Promise<{ query: string; tokensUsed: number; dominant_vector: 'identity' | 'physical' | 'context' }> {
    const systemInstruction = `Jesteś testerem systemu wyszukiwania. Wygeneruj KRÓTKIE zapytanie (1-4 słowa) dla przedmiotu: "${groupName}".\n\nOkreśl który wektor powinien dominować:\n- "identity" - pytanie o właściciela/rolę/postać (np. "czyja to suknia")\n- "physical" - pytanie o wygląd/materiał/kolor (np. "czerwona suknia")\n- "context" - pytanie o użycie/funkcję/miejsce (np. "do czego służy")\n\nPoziomy trudności:\n- easy: synonim/nazwa\n- medium: opis funkcji\n- hard: kontekst/miejsce\n\nODPOWIEDZ JSON (bez markdown):\n{"query": "...", "dominant_vector": "identity|physical|context"}`

    const prompts = {
        easy: `Wygeneruj synonim dla: "${groupName}"`,
        medium: `Opisz funkcję: "${groupName}"`,
        hard: `Gdzie używany: "${groupName}"?`
    }
    const userPrompt = prompts[difficulty as keyof typeof prompts] || `Zapytanie dla: "${groupName}"`

    if (model.startsWith('gemini')) {
        return generateGeminiQuery(userPrompt, temp, systemInstruction)
    }

    return generateExternalQuery(model, userPrompt, temp, systemInstruction)
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

    const pb = await createPocketBaseAdmin()

    console.log(`🔍 [SEARCH] Using embeddings key: ${embeddingKey}`)

    // Search directly in groups table using JSON embeddings
    const groups = await pb.collection('groups').getFullList<PocketBaseGroup>({
        filter: 'embeddings != null',
        fields: 'id,name,embeddings'
    })

    if (!groups || groups.length === 0) {
        console.error(`❌ [SEARCH] No groups found`)
        return { results: [], tokensUsed: 0 }
    }

    console.log(`🔍 [SEARCH] Processing ${groups.length} groups for similarity`)

    // Calculate similarity scores for each group
    const results = groups.map((group: PocketBaseGroup) => {
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

    const nonZeroResults = results.filter((r: any) => r.similarity > 0)
    console.log(`✅ [SEARCH] Found ${nonZeroResults.length}/${results.length} groups with embeddings for key ${embeddingKey}`)
    console.log(`✅ [SEARCH] Top 3:`, nonZeroResults
        .sort((a: any, b: any) => b.similarity - a.similarity)
        .slice(0, 3)
        .map((r: any) => `${r.name}: ${r.similarity.toFixed(4)}`))

    // Calculate tokens used for embedding generation
    // Estimate: query embedding generation ~50 tokens
    const tokensUsed = Math.ceil(query.length / 4) + 50

    // Sort by similarity and return top 20
    const sortedResults = results
        .sort((a: any, b: any) => b.similarity - a.similarity)
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
    try {
        const pb = await createPocketBaseAdmin()
        await pb.collection('embedding_test_runs').delete(runId)
        return { success: true }
    } catch (error) {
        console.error('Error deleting test run:', error)
        return { success: false }
    }
}

// Get list of existing embedding keys from database
export async function getExistingEmbeddingKeys(): Promise<string[]> {
    try {
        const pb = await createPocketBaseAdmin()
        const data = await pb.collection('groups').getFullList<PocketBaseGroup>({
            filter: 'embeddings != null',
            fields: 'embeddings'
        })

        if (!data) return []

        // Extract all unique keys from embeddings JSON
        const keysSet = new Set<string>()
        data.forEach((group: PocketBaseGroup) => {
            if (group.embeddings && typeof group.embeddings === 'object') {
                Object.keys(group.embeddings).forEach(key => keysSet.add(key))
            }
        })

        return Array.from(keysSet).sort((a, b) => a.localeCompare(b, 'pl'))
    } catch (error) {
        console.error('Error fetching embeddings:', error)
        return []
    }
}

// Regenerate embeddings for all groups (simplified version)
export async function regenerateEmbeddings(config: {
    embedding_model: string
    enrichment_model: string
    use_sample: boolean
}): Promise<{ success: boolean; message?: string; error?: string }> {
    const pb = await createPocketBaseAdmin()

    console.log(`🔄 [REGEN] Starting regeneration with ${config.embedding_model} + ${config.enrichment_model}`)

    try {
        // Get groups
        const limit = config.use_sample ? 50 : undefined
        const groups = await pb.collection('groups').getFullList<PocketBaseGroup>({
            fields: 'id,name',
            ...(limit && { limit })
        })

        if (!groups || groups.length === 0) {
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
                'gpt-4.1-mini': 'gpt41m',
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
        const job = await pb.collection('embedding_regeneration_jobs').create({
            status: 'running',
            embedding_model: config.embedding_model,
            enrichment_model: config.enrichment_model,
            use_sample_groups: config.use_sample,
            total_groups: groups.length,
            processed_groups: 0,
            total_tokens: 0
        })

        if (!job) {
            console.error('Failed to create job record')
            return { success: false, error: 'Failed to create job record' }
        }

        console.log(`📝 [REGEN] Created job record: ${job.id}`)

        // Process groups in background
        processGroupsInBackground(groups, config.embedding_model, config.enrichment_model, embeddingKey, job.id)

        return {
            success: true,
            message: `Started regeneration for ${groups.length} groups with key: ${embeddingKey}`
        }
    } catch (error: any) {
        console.error('Error in regenerateEmbeddings:', error)
        return { success: false, error: error.message }
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
    const pb = await createPocketBaseAdmin()
    let totalTokens = 0

    for (let i = 0; i < groups.length; i++) {
        const group = groups[i]

        try {
            console.log(`[${i + 1}/${groups.length}] Processing: ${group.name}`)

            // Update job progress
            await pb.collection('embedding_regeneration_jobs').update(jobId, {
                current_group_id: group.id,
                current_group_name: group.name,
                processed_groups: i
            })

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
            const currentGroup = await pb.collection('groups').getOne<PocketBaseGroup>(group.id)
            const currentEmbeddings = currentGroup?.embeddings || {}

            // Update
            await pb.collection('groups').update(group.id, {
                embeddings: {
                    ...currentEmbeddings,
                    [embeddingKey]: {
                        identity: identityEmb,
                        physical: physicalEmb,
                        context: contextEmb
                    }
                }
            })

            console.log(`✅ [${i + 1}/${groups.length}] Completed`)

            // Estimate tokens (enrichment ~200 input + ~150 output, embeddings ~100 input each)
            totalTokens += 550

            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000))

        } catch (error) {
            console.error(`❌ Error processing group ${group.id}:`, error)

            // Update job with error
            await pb.collection('embedding_regeneration_jobs').update(jobId, {
                error_message: error instanceof Error ? error.message : 'Unknown error'
            })
        }
    }

    // Mark job as completed
    await pb.collection('embedding_regeneration_jobs').update(jobId, {
        status: 'completed',
        processed_groups: groups.length,
        total_tokens: totalTokens
    })

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
    const pb = await createPocketBaseAdmin()

    try {
        // Get state - handle missing record gracefully
        let state: QueueState | null = null
        try {
            const stateRecord = await pb.collection('embedding_queue_state').getFirstListItem('id="global"')
            state = stateRecord as unknown as QueueState
        } catch {
            // State doesn't exist yet, return null
        }

        // Get items
        const items = await pb.collection('embedding_test_queue').getFullList({
            sort: 'position'
        })

        return {
            state,
            items: items as unknown as QueueItem[]
        }
    } catch (error) {
        console.error('Error getting queue state:', error)
        return { state: null, items: [] }
    }
}

// Add test config to queue
export async function addToQueue(config: Record<string, unknown>): Promise<{ success: boolean; id?: string; error?: string }> {
    const pb = await createPocketBaseAdmin()

    try {
        // Get max position
        const items = await pb.collection('embedding_test_queue').getFullList({
            sort: '-position',
            limit: 1
        })
        const maxPosition = items.length > 0 ? (items[0] as any).position : -1
        const newPosition = maxPosition + 1

        // Create new queue item
        const data = await pb.collection('embedding_test_queue').create({
            position: newPosition,
            status: 'pending',
            config: config
        })

        return { success: true, id: data.id }
    } catch (error: any) {
        console.error('Error adding to queue:', error)
        return { success: false, error: error.message }
    }
}

// Remove item from queue
export async function removeFromQueue(id: string): Promise<{ success: boolean; error?: string }> {
    const pb = await createPocketBaseAdmin()

    try {
        await pb.collection('embedding_test_queue').delete(id)
        return { success: true }
    } catch (error: any) {
        console.error('Error removing from queue:', error)
        return { success: false, error: error.message }
    }
}

// Clear all items from queue except currently running
export async function clearQueue(): Promise<{ success: boolean; error?: string }> {
    const pb = await createPocketBaseAdmin()

    try {
        const items = await pb.collection('embedding_test_queue').getFullList({
            filter: 'status != "running"'
        })

        for (const item of items) {
            await pb.collection('embedding_test_queue').delete(item.id)
        }

        return { success: true }
    } catch (error: any) {
        console.error('Error clearing queue:', error)
        return { success: false, error: error.message }
    }
}

// Reorder queue items
export async function reorderQueue(orderedIds: string[]): Promise<{ success: boolean; error?: string }> {
    const pb = await createPocketBaseAdmin()

    try {
        // Update positions based on array order
        for (let i = 0; i < orderedIds.length; i++) {
            await pb.collection('embedding_test_queue').update(orderedIds[i], { position: i })
        }
        return { success: true }
    } catch (error: any) {
        console.error('Error reordering queue:', error)
        return { success: false, error: error.message }
    }
}

// Start queue execution
export async function startQueue(): Promise<{ success: boolean; error?: string }> {
    const pb = await createPocketBaseAdmin()

    try {
        // Try to update existing state
        try {
            await pb.collection('embedding_queue_state').update('global', {
                status: 'running'
            })
        } catch {
            // Create if doesn't exist
            await pb.collection('embedding_queue_state').create({
                id: 'global',
                status: 'running',
                current_queue_item_id: null
            })
        }

        return { success: true }
    } catch (error: any) {
        console.error('Error starting queue:', error)
        return { success: false, error: error.message }
    }
}

// Pause queue (finish current test, don't start next)
export async function pauseQueue(): Promise<{ success: boolean; error?: string }> {
    const pb = await createPocketBaseAdmin()

    try {
        await pb.collection('embedding_queue_state').update('global', {
            status: 'paused'
        })
        return { success: true }
    } catch (error: any) {
        console.error('Error pausing queue:', error)
        return { success: false, error: error.message }
    }
}

// Stop queue (mark current as cancelled)
export async function stopQueue(): Promise<{ success: boolean; error?: string }> {
    const pb = await createPocketBaseAdmin()

    try {
        // Get current item
        let currentQueueItemId: string | null = null
        try {
            const state = await pb.collection('embedding_queue_state').getOne('global')
            currentQueueItemId = (state as any).current_queue_item_id
        } catch {
            // State doesn't exist
        }

        // Set queue to idle
        await pb.collection('embedding_queue_state').update('global', {
            status: 'idle',
            current_queue_item_id: null
        })

        // Mark current item as cancelled if exists
        if (currentQueueItemId) {
            await pb.collection('embedding_test_queue').update(currentQueueItemId, {
                status: 'cancelled'
            })
        }

        return { success: true }
    } catch (error: any) {
        console.error('Error stopping queue:', error)
        return { success: false, error: error.message }
    }
}

// Process next queue item (called by frontend polling, NOT infinite loop)
export async function processNextQueueItem(): Promise<{
    success: boolean
    hasMore: boolean
    currentItemId?: string
    error?: string
}> {
    const pb = await createPocketBaseAdmin()

    try {
        // Check queue state
        let state: any = null
        try {
            state = await pb.collection('embedding_queue_state').getOne('global')
        } catch {
            // State doesn't exist
        }

        if (!state || state.status !== 'running') {
            return { success: true, hasMore: false }
        }

        // Get next pending item
        const pendingItems = await pb.collection('embedding_test_queue').getList(1, 1, {
            filter: 'status = "pending"',
            sort: 'position'
        })

        if (pendingItems.items.length === 0) {
            // No more items - set queue to idle
            await pb.collection('embedding_queue_state').update('global', {
                status: 'idle',
                current_queue_item_id: null
            })

            return { success: true, hasMore: false }
        }

        const nextItem = pendingItems.items[0] as any

        // Mark item as running
        await pb.collection('embedding_test_queue').update(nextItem.id, {
            status: 'running',
            started_at: new Date().toISOString()
        })

        await pb.collection('embedding_queue_state').update('global', {
            current_queue_item_id: nextItem.id
        })

        console.log(`[QUEUE] Starting test: ${nextItem.id}`)

        try {
            // Create the test run
            const result = await createTestRun(nextItem.config as any)

            if (result.success && result.runId) {
                // Link run to queue item
                await pb.collection('embedding_test_queue').update(nextItem.id, {
                    run_id: result.runId
                })

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
            await pb.collection('embedding_test_queue').update(nextItem.id, {
                status: 'failed',
                error_message: error instanceof Error ? error.message : 'Unknown error',
                completed_at: new Date().toISOString()
            })

            return {
                success: false,
                hasMore: true,
                error: error instanceof Error ? error.message : 'Unknown error'
            }
        }
    } catch (error: any) {
        console.error('Error in processNextQueueItem:', error)
        return { success: false, hasMore: false, error: error.message }
    }
}

// Mark queue item as completed (called when test finishes)
export async function markQueueItemCompleted(queueItemId: string): Promise<{ success: boolean }> {
    const pb = await createPocketBaseAdmin()

    try {
        await pb.collection('embedding_test_queue').update(queueItemId, {
            status: 'completed',
            completed_at: new Date().toISOString()
        })
        return { success: true }
    } catch (error) {
        console.error('Error marking queue item completed:', error)
        return { success: false }
    }
}
