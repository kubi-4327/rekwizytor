'use client'

import * as React from 'react'
import { runSearchDiagnostics, type DiagnosticResult } from '@/app/actions/search-diagnostics'

export default function DiagnosticsPage() {
    const [loading, setLoading] = React.useState(false)
    const [result, setResult] = React.useState<DiagnosticResult | null>(null)
    const [error, setError] = React.useState<string | null>(null)

    const runDiagnostics = async () => {
        setLoading(true)
        setError(null)
        try {
            const diagnostics = await runSearchDiagnostics()
            setResult(diagnostics)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unknown error running diagnostics')
        } finally {
            setLoading(false)
        }
    }

    const getStatusColor = (success: boolean) => success ? 'text-green-400' : 'text-red-400'
    const getStatusIcon = (success: boolean) => success ? '✅' : '❌'

    return (
        <div className="min-h-screen bg-neutral-950 text-white p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-bold mb-2">🔍 Search Diagnostics</h1>
                    <p className="text-neutral-400">
                        Debug tool to identify issues with search functionality.
                        Tests Supabase connection, authentication, RLS, and RPC functions.
                    </p>
                </div>

                <button
                    onClick={runDiagnostics}
                    disabled={loading}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg font-medium transition-colors"
                >
                    {loading ? 'Running diagnostics...' : 'Run Diagnostics'}
                </button>

                {error && (
                    <div className="bg-red-900/30 border border-red-500 rounded-lg p-4">
                        <h3 className="text-red-400 font-bold">Error</h3>
                        <p className="text-red-300">{error}</p>
                    </div>
                )}

                {result && (
                    <div className="space-y-6">
                        {/* Environment Info */}
                        <section className="bg-neutral-900 rounded-lg p-6">
                            <h2 className="text-xl font-bold mb-4">🌍 Environment</h2>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div><span className="text-neutral-400">Timestamp:</span> <span className="font-mono">{result.timestamp}</span></div>
                                <div><span className="text-neutral-400">Environment:</span> <span className="font-mono">{result.environment}</span></div>
                                <div><span className="text-neutral-400">Supabase URL:</span> <span className="font-mono">{result.supabaseUrl}...</span></div>
                                <div><span className="text-neutral-400">Anon Key Prefix:</span> <span className="font-mono">{result.supabaseKeyPrefix}...</span></div>
                            </div>
                        </section>

                        {/* Auth Status */}
                        <section className="bg-neutral-900 rounded-lg p-6">
                            <h2 className="text-xl font-bold mb-4">
                                {getStatusIcon(result.authStatus.hasSession)} Authentication
                            </h2>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div><span className="text-neutral-400">Has Session:</span> <span className={getStatusColor(result.authStatus.hasSession)}>{result.authStatus.hasSession ? 'Yes' : 'No'}</span></div>
                                <div><span className="text-neutral-400">User ID:</span> <span className="font-mono">{result.authStatus.userId || 'N/A'}</span></div>
                                <div><span className="text-neutral-400">Email:</span> <span>{result.authStatus.userEmail || 'N/A'}</span></div>
                                <div><span className="text-neutral-400">Role:</span> <span>{result.authStatus.userRole || 'N/A'}</span></div>
                                {result.authStatus.error && (
                                    <div className="col-span-2 text-red-400">Error: {result.authStatus.error}</div>
                                )}
                            </div>
                        </section>

                        {/* Profile Status */}
                        <section className="bg-neutral-900 rounded-lg p-6">
                            <h2 className="text-xl font-bold mb-4">
                                {getStatusIcon(result.profileStatus.exists && result.profileStatus.status === 'approved')} Profile Status
                            </h2>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div><span className="text-neutral-400">Profile Exists:</span> <span className={getStatusColor(result.profileStatus.exists)}>{result.profileStatus.exists ? 'Yes' : 'No'}</span></div>
                                <div><span className="text-neutral-400">Status:</span> <span className={result.profileStatus.status === 'approved' ? 'text-green-400' : 'text-yellow-400'}>{result.profileStatus.status || 'N/A'}</span></div>
                                <div><span className="text-neutral-400">Role:</span> <span>{result.profileStatus.role || 'N/A'}</span></div>
                                {result.profileStatus.error && (
                                    <div className="col-span-2 text-red-400">Error: {result.profileStatus.error}</div>
                                )}
                            </div>
                        </section>

                        {/* RPC Tests */}
                        <section className="bg-neutral-900 rounded-lg p-6">
                            <h2 className="text-xl font-bold mb-4">🔧 RPC Function Tests</h2>

                            <div className="space-y-4">
                                <div className="border border-neutral-800 rounded-lg p-4">
                                    <h3 className="font-bold mb-2">
                                        {getStatusIcon(result.rpcTest.search_global.success)} search_global
                                    </h3>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div><span className="text-neutral-400">Success:</span> <span className={getStatusColor(result.rpcTest.search_global.success)}>{result.rpcTest.search_global.success ? 'Yes' : 'No'}</span></div>
                                        <div><span className="text-neutral-400">Results:</span> <span>{result.rpcTest.search_global.resultCount}</span></div>
                                        {result.rpcTest.search_global.error && (
                                            <>
                                                <div className="col-span-2 text-red-400">Error: {result.rpcTest.search_global.error}</div>
                                                {result.rpcTest.search_global.errorCode && (
                                                    <div className="col-span-2 text-orange-400">Code: {result.rpcTest.search_global.errorCode}</div>
                                                )}
                                                {result.rpcTest.search_global.errorHint && (
                                                    <div className="col-span-2 text-yellow-400">Hint: {result.rpcTest.search_global.errorHint}</div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="border border-neutral-800 rounded-lg p-4">
                                    <h3 className="font-bold mb-2">
                                        {getStatusIcon(result.rpcTest.search_global_hybrid.success)} search_global_hybrid
                                    </h3>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div><span className="text-neutral-400">Success:</span> <span className={getStatusColor(result.rpcTest.search_global_hybrid.success)}>{result.rpcTest.search_global_hybrid.success ? 'Yes' : 'No'}</span></div>
                                        <div><span className="text-neutral-400">Results:</span> <span>{result.rpcTest.search_global_hybrid.resultCount}</span></div>
                                        {result.rpcTest.search_global_hybrid.error && (
                                            <>
                                                <div className="col-span-2 text-red-400">Error: {result.rpcTest.search_global_hybrid.error}</div>
                                                {result.rpcTest.search_global_hybrid.errorCode && (
                                                    <div className="col-span-2 text-orange-400">Code: {result.rpcTest.search_global_hybrid.errorCode}</div>
                                                )}
                                                {result.rpcTest.search_global_hybrid.errorHint && (
                                                    <div className="col-span-2 text-yellow-400">Hint: {result.rpcTest.search_global_hybrid.errorHint}</div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Materialized View Test */}
                        <section className="bg-neutral-900 rounded-lg p-6">
                            <h2 className="text-xl font-bold mb-4">
                                {getStatusIcon(result.materializedViewTest.canAccess)} Materialized View Access
                            </h2>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div><span className="text-neutral-400">Can Access:</span> <span className={getStatusColor(result.materializedViewTest.canAccess)}>{result.materializedViewTest.canAccess ? 'Yes' : 'No'}</span></div>
                                <div><span className="text-neutral-400">Row Count:</span> <span>{result.materializedViewTest.rowCount ?? 'N/A'}</span></div>
                                {result.materializedViewTest.error && (
                                    <div className="col-span-2 text-red-400">Error: {result.materializedViewTest.error}</div>
                                )}
                            </div>
                        </section>

                        {/* Raw JSON */}
                        <section className="bg-neutral-900 rounded-lg p-6">
                            <h2 className="text-xl font-bold mb-4">📋 Raw JSON (copy for debugging)</h2>
                            <pre className="bg-black p-4 rounded-lg overflow-x-auto text-xs font-mono text-neutral-300">
                                {JSON.stringify(result, null, 2)}
                            </pre>
                        </section>
                    </div>
                )}
            </div>
        </div>
    )
}
