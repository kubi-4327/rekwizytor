'use client'

import { useState } from 'react'
import { migrateAllEmbeddings } from '@/app/actions/migrate-embeddings'

export default function MigrateEmbeddingsPage() {
    const [status, setStatus] = useState<string>('Ready to migrate')
    const [isRunning, setIsRunning] = useState(false)
    const [result, setResult] = useState<any>(null)
    const [progress, setProgress] = useState({ current: 0, total: 0, entity: '' })

    const runMigration = async () => {
        setIsRunning(true)
        setStatus('Starting migration...')
        setResult(null)
        setProgress({ current: 0, total: 0, entity: '' })

        try {
            // Simulate progress updates (we'll enhance this later with real streaming)
            const entities = ['groups', 'locations', 'notes', 'performances']
            let currentEntity = 0

            const updateProgress = () => {
                if (currentEntity < entities.length) {
                    setProgress({
                        current: currentEntity + 1,
                        total: entities.length,
                        entity: entities[currentEntity]
                    })
                    setStatus(`Processing ${entities[currentEntity]}...`)
                    currentEntity++
                }
            }

            // Update every 2 seconds
            const interval = setInterval(updateProgress, 2000)

            const migrationResult = await migrateAllEmbeddings()

            clearInterval(interval)
            setResult(migrationResult)
            setStatus('Migration complete!')
            setProgress({ current: entities.length, total: entities.length, entity: 'complete' })
        } catch (error: any) {
            setStatus(`Error: ${error.message}`)
            console.error(error)
        } finally {
            setIsRunning(false)
        }
    }

    const progressPercentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0

    return (
        <div className="min-h-screen bg-neutral-950 p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Embedding Migration Tool
                    </h1>
                    <p className="text-neutral-400">
                        Generate AI-enriched embeddings for all existing groups, locations, notes, and performances
                    </p>
                </div>

                <div className="bg-neutral-900 rounded-lg p-6 border border-neutral-800">
                    <h2 className="text-xl font-semibold text-white mb-4">Migration Status</h2>
                    <p className="text-neutral-300 mb-4">{status}</p>

                    {/* Progress Bar */}
                    {isRunning && progress.total > 0 && (
                        <div className="mb-4">
                            <div className="flex justify-between text-sm text-neutral-400 mb-2">
                                <span>Progress: {progress.current} / {progress.total}</span>
                                <span>{Math.round(progressPercentage)}%</span>
                            </div>
                            <div className="w-full bg-neutral-800 rounded-full h-3 overflow-hidden">
                                <div
                                    className="bg-purple-600 h-full transition-all duration-500 ease-out"
                                    style={{ width: `${progressPercentage}%` }}
                                />
                            </div>
                            {progress.entity && (
                                <p className="text-xs text-neutral-500 mt-2">
                                    Currently processing: <span className="text-purple-400">{progress.entity}</span>
                                </p>
                            )}
                        </div>
                    )}

                    <button
                        onClick={runMigration}
                        disabled={isRunning}
                        className={`px-6 py-3 rounded-lg font-medium transition-colors ${isRunning
                            ? 'bg-neutral-700 text-neutral-400 cursor-not-allowed'
                            : 'bg-purple-600 hover:bg-purple-700 text-white'
                            }`}
                    >
                        {isRunning ? 'Running Migration...' : 'Start Migration'}
                    </button>
                </div>

                {result && (
                    <div className="bg-neutral-900 rounded-lg p-6 border border-neutral-800">
                        <h2 className="text-xl font-semibold text-white mb-4">Results</h2>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-neutral-800 rounded p-4">
                                    <p className="text-sm text-neutral-400">Groups</p>
                                    <p className="text-2xl font-bold text-white">{result.totals.groups}</p>
                                </div>
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
                                <div className="bg-neutral-800 rounded p-4 col-span-2">
                                    <p className="text-sm text-neutral-400">Total</p>
                                    <p className="text-2xl font-bold text-green-400">
                                        {(result.totals.groups || 0) + (result.totals.locations || 0) + (result.totals.notes || 0) + (result.totals.performances || 0)}
                                    </p>
                                </div>
                            </div>

                            {result.errors.length > 0 && (
                                <div className="bg-red-900/20 border border-red-800 rounded p-4">
                                    <h3 className="text-red-400 font-semibold mb-2">Errors ({result.errors.length})</h3>
                                    <ul className="text-sm text-red-300 space-y-1 max-h-60 overflow-y-auto">
                                        {result.errors.map((error: string, i: number) => (
                                            <li key={i}>• {error}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className={`rounded p-4 ${result.success ? 'bg-green-900/20 border border-green-800' : 'bg-yellow-900/20 border border-yellow-800'}`}>
                                <p className={`font-semibold ${result.success ? 'text-green-400' : 'text-yellow-400'}`}>
                                    {result.success ? '✅ Migration completed successfully!' : '⚠️ Migration completed with errors'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-6">
                    <h3 className="text-blue-400 font-semibold mb-2">⚠️ Important Notes</h3>
                    <ul className="text-sm text-blue-300 space-y-2">
                        <li>• This migration uses AI to generate rich keyword context for better search</li>
                        <li>• Groups linked to performances will use performance context automatically</li>
                        <li>• The process takes ~6-8 minutes due to API rate limits (7s per group)</li>
                        <li>• Embeddings are generated using Gemini API (costs apply)</li>
                        <li>• You can safely close this page - check console for detailed logs</li>
                    </ul>
                </div>
            </div>
        </div>
    )
}
