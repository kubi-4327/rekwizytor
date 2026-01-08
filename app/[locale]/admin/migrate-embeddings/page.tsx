'use client'

import { useState, useRef, useCallback } from 'react'
import { getGroupsForMigration, processSingleGroupEmbedding, migrateAllEmbeddings } from '@/app/actions/migrate-embeddings'
import { refreshSearchIndex } from '@/app/actions/unified-search'

type GroupProgress = {
    id: string
    name: string
    status: 'pending' | 'enriching' | 'embedding' | 'saving' | 'done' | 'error' | 'cancelled'
    enrichedText?: string
    error?: string
}

export default function MigrateEmbeddingsPage() {
    const [status, setStatus] = useState<string>('Ready to migrate')
    const [isRunning, setIsRunning] = useState(false)
    const [isCancelled, setIsCancelled] = useState(false)
    const [result, setResult] = useState<any>(null)
    const [groups, setGroups] = useState<GroupProgress[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [mode, setMode] = useState<'groups' | 'all'>('groups')

    const cancelledRef = useRef(false)

    const handleCancel = useCallback(() => {
        cancelledRef.current = true
        setIsCancelled(true)
        setStatus('⚠️ Cancelling after current group...')
    }, [])

    const runGroupsMigration = async () => {
        setIsRunning(true)
        setIsCancelled(false)
        cancelledRef.current = false
        setStatus('Fetching groups...')
        setResult(null)
        setGroups([])
        setCurrentIndex(0)

        try {
            // Fetch groups
            const groupsList = await getGroupsForMigration()

            if (groupsList.length === 0) {
                setStatus('No groups found')
                setIsRunning(false)
                return
            }

            // Initialize progress
            const initialProgress: GroupProgress[] = groupsList.map(g => ({
                id: g.id,
                name: g.name,
                status: 'pending'
            }))
            setGroups(initialProgress)
            setStatus(`Found ${groupsList.length} groups. Starting migration...`)

            let processed = 0
            let failed = 0
            const errors: string[] = []

            // Process each group
            for (let i = 0; i < groupsList.length; i++) {
                // Check for cancellation
                if (cancelledRef.current) {
                    setStatus(`🛑 Cancelled! Processed ${processed} of ${groupsList.length} groups.`)
                    // Mark remaining as cancelled
                    setGroups(prev => prev.map((g, idx) =>
                        idx >= i ? { ...g, status: 'cancelled' } : g
                    ))
                    break
                }

                const group = groupsList[i]
                setCurrentIndex(i)
                setStatus(`[${i + 1}/${groupsList.length}] Processing "${group.name}"...`)

                // Update status to enriching
                setGroups(prev => prev.map((g, idx) =>
                    idx === i ? { ...g, status: 'enriching' } : g
                ))

                // Process the group
                const result = await processSingleGroupEmbedding(group.id, group.name)

                // Update status based on result
                setGroups(prev => prev.map((g, idx) =>
                    idx === i ? {
                        ...g,
                        status: result.success ? 'done' : 'error',
                        enrichedText: result.enrichedText,
                        error: result.error
                    } : g
                ))

                if (result.success) {
                    processed++
                } else {
                    failed++
                    errors.push(`${group.name}: ${result.error}`)
                }

                // Wait before next group (rate limiting)
                if (i < groupsList.length - 1 && !cancelledRef.current) {
                    setStatus(`[${i + 1}/${groupsList.length}] Waiting 7s before next group...`)
                    await new Promise(resolve => setTimeout(resolve, 7000))
                }
            }

            // Refresh search index if not cancelled
            if (!cancelledRef.current) {
                setStatus('Refreshing search index...')
                try {
                    await refreshSearchIndex()
                } catch (e) {
                    console.error('Failed to refresh index:', e)
                }
            }

            setResult({
                success: failed === 0,
                totals: { groups: processed },
                errors,
                cancelled: cancelledRef.current
            })

            if (!cancelledRef.current) {
                setStatus(`✅ Migration complete! ${processed} processed, ${failed} failed.`)
            }

        } catch (error: any) {
            setStatus(`Error: ${error.message}`)
            console.error(error)
        } finally {
            setIsRunning(false)
        }
    }

    const runFullMigration = async () => {
        setIsRunning(true)
        setStatus('Starting full migration...')
        setResult(null)

        try {
            const migrationResult = await migrateAllEmbeddings()
            setResult(migrationResult)
            setStatus('Migration complete!')
        } catch (error: any) {
            setStatus(`Error: ${error.message}`)
            console.error(error)
        } finally {
            setIsRunning(false)
        }
    }

    const progressPercentage = groups.length > 0 ? ((currentIndex + 1) / groups.length) * 100 : 0
    const completedCount = groups.filter(g => g.status === 'done').length
    const failedCount = groups.filter(g => g.status === 'error').length

    return (
        <div className="min-h-screen bg-neutral-950 p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Embedding Migration Tool
                    </h1>
                    <p className="text-neutral-400">
                        Generate AI-enriched embeddings for better semantic search
                    </p>
                </div>

                {/* Mode Selection */}
                <div className="bg-neutral-900 rounded-lg p-6 border border-neutral-800">
                    <h2 className="text-xl font-semibold text-white mb-4">Migration Mode</h2>
                    <div className="flex gap-4">
                        <button
                            onClick={() => setMode('groups')}
                            disabled={isRunning}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${mode === 'groups'
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                                }`}
                        >
                            📦 Groups Only (Recommended)
                        </button>
                        <button
                            onClick={() => setMode('all')}
                            disabled={isRunning}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${mode === 'all'
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                                }`}
                        >
                            🔄 All Entities
                        </button>
                    </div>
                </div>

                {/* Control Panel */}
                <div className="bg-neutral-900 rounded-lg p-6 border border-neutral-800">
                    <h2 className="text-xl font-semibold text-white mb-4">Migration Status</h2>
                    <p className="text-neutral-300 mb-4">{status}</p>

                    {/* Progress Bar */}
                    {isRunning && groups.length > 0 && (
                        <div className="mb-4">
                            <div className="flex justify-between text-sm text-neutral-400 mb-2">
                                <span>Progress: {currentIndex + 1} / {groups.length}</span>
                                <span>✅ {completedCount} | ❌ {failedCount}</span>
                                <span>{Math.round(progressPercentage)}%</span>
                            </div>
                            <div className="w-full bg-neutral-800 rounded-full h-3 overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-500 ease-out ${isCancelled ? 'bg-yellow-600' : 'bg-purple-600'
                                        }`}
                                    style={{ width: `${progressPercentage}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-4">
                        <button
                            onClick={mode === 'groups' ? runGroupsMigration : runFullMigration}
                            disabled={isRunning}
                            className={`px-6 py-3 rounded-lg font-medium transition-colors ${isRunning
                                    ? 'bg-neutral-700 text-neutral-400 cursor-not-allowed'
                                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                                }`}
                        >
                            {isRunning ? 'Running...' : 'Start Migration'}
                        </button>

                        {isRunning && !isCancelled && (
                            <button
                                onClick={handleCancel}
                                className="px-6 py-3 rounded-lg font-medium bg-red-600 hover:bg-red-700 text-white transition-colors"
                            >
                                🛑 Cancel Migration
                            </button>
                        )}

                        {isCancelled && (
                            <span className="px-6 py-3 text-yellow-400 font-medium">
                                ⏳ Cancelling...
                            </span>
                        )}
                    </div>
                </div>

                {/* Groups Progress List */}
                {groups.length > 0 && (
                    <div className="bg-neutral-900 rounded-lg p-6 border border-neutral-800">
                        <h2 className="text-xl font-semibold text-white mb-4">
                            Groups Progress ({completedCount}/{groups.length})
                        </h2>
                        <div className="max-h-96 overflow-y-auto space-y-2">
                            {groups.map((group, idx) => (
                                <div
                                    key={group.id}
                                    className={`p-3 rounded-lg border ${group.status === 'done' ? 'bg-green-900/20 border-green-800' :
                                            group.status === 'error' ? 'bg-red-900/20 border-red-800' :
                                                group.status === 'cancelled' ? 'bg-neutral-800 border-neutral-700' :
                                                    idx === currentIndex ? 'bg-purple-900/20 border-purple-800' :
                                                        'bg-neutral-800 border-neutral-700'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">
                                                {group.status === 'done' ? '✅' :
                                                    group.status === 'error' ? '❌' :
                                                        group.status === 'cancelled' ? '⏸️' :
                                                            group.status === 'pending' ? '⏳' :
                                                                '🔄'}
                                            </span>
                                            <span className="text-white font-medium">{group.name}</span>
                                        </div>
                                        <span className="text-xs text-neutral-400">
                                            {group.status === 'enriching' ? 'Enriching...' :
                                                group.status === 'embedding' ? 'Generating embedding...' :
                                                    group.status === 'saving' ? 'Saving...' :
                                                        group.status}
                                        </span>
                                    </div>
                                    {group.enrichedText && (
                                        <p className="text-xs text-green-400 mt-1 truncate">
                                            → {group.enrichedText}
                                        </p>
                                    )}
                                    {group.error && (
                                        <p className="text-xs text-red-400 mt-1">
                                            Error: {group.error}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Results */}
                {result && (
                    <div className="bg-neutral-900 rounded-lg p-6 border border-neutral-800">
                        <h2 className="text-xl font-semibold text-white mb-4">Results</h2>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-neutral-800 rounded p-4">
                                    <p className="text-sm text-neutral-400">Groups</p>
                                    <p className="text-2xl font-bold text-white">{result.totals.groups}</p>
                                </div>
                                {result.totals.locations !== undefined && (
                                    <>
                                        <div className="bg-neutral-800 rounded p-4">
                                            <p className="text-sm text-neutral-400">Locations</p>
                                            <p className="text-2xl font-bold text-white">{result.totals.locations}</p>
                                        </div>
                                        <div className="bg-neutral-800 rounded p-4">
                                            <p className="text-sm text-neutral-400">Notes</p>
                                            <p className="text-2xl font-bold text-white">{result.totals.notes}</p>
                                        </div>
                                        <div className="bg-neutral-800 rounded p-4">
                                            <p className="text-sm text-neutral-400">Performances</p>
                                            <p className="text-2xl font-bold text-white">{result.totals.performances}</p>
                                        </div>
                                    </>
                                )}
                            </div>

                            {result.errors.length > 0 && (
                                <div className="bg-red-900/20 border border-red-800 rounded p-4">
                                    <h3 className="text-red-400 font-semibold mb-2">Errors ({result.errors.length})</h3>
                                    <ul className="text-sm text-red-300 space-y-1 max-h-40 overflow-y-auto">
                                        {result.errors.map((error: string, i: number) => (
                                            <li key={i}>• {error}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className={`rounded p-4 ${result.cancelled ? 'bg-yellow-900/20 border border-yellow-800' :
                                    result.success ? 'bg-green-900/20 border border-green-800' :
                                        'bg-yellow-900/20 border border-yellow-800'
                                }`}>
                                <p className={`font-semibold ${result.cancelled ? 'text-yellow-400' :
                                        result.success ? 'text-green-400' : 'text-yellow-400'
                                    }`}>
                                    {result.cancelled ? '⚠️ Migration was cancelled' :
                                        result.success ? '✅ Migration completed successfully!' :
                                            '⚠️ Migration completed with errors'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Info */}
                <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-6">
                    <h3 className="text-blue-400 font-semibold mb-2">ℹ️ How it works</h3>
                    <ul className="text-sm text-blue-300 space-y-2">
                        <li>• <strong>Step 1 (Enriching)</strong>: AI generates keywords for better semantic matching</li>
                        <li>• <strong>Step 2 (Embedding)</strong>: Creates 768-dimension vector from enriched text</li>
                        <li>• <strong>Step 3 (Saving)</strong>: Stores embedding in Supabase database</li>
                        <li>• Rate limit: 7 seconds between each group to avoid API limits</li>
                        <li>• Check terminal logs for detailed step-by-step progress</li>
                    </ul>
                </div>
            </div>
        </div>
    )
}
