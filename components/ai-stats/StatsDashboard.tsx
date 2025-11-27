'use client'

import { useState } from 'react'
import { BarChart, Zap, Search, Database as DatabaseIcon, DollarSign, Sparkles, ArrowRightLeft } from 'lucide-react'
import { Database } from '@/types/supabase'
import { useTranslations } from 'next-intl'

type Log = Database['public']['Tables']['ai_usage_logs']['Row']

type Props = {
    logs: Log[]
    allStats: {
        tokens_input: number | null
        tokens_output: number | null
        operation_type: string
    }[]
}

export function StatsDashboard({ logs, allStats }: Props) {
    const [currency, setCurrency] = useState<'USD' | 'PLN'>('USD')
    const EXCHANGE_RATE = 4.15 // Hardcoded for now, could be fetched
    const t = useTranslations('AIStats')

    // Calculate totals
    const totalInput = allStats.reduce((acc, curr) => acc + (curr.tokens_input || 0), 0)
    const totalOutput = allStats.reduce((acc, curr) => acc + (curr.tokens_output || 0), 0)
    const totalTokens = totalInput + totalOutput

    // Calculate cost (Gemini 2.0 Flash pricing)
    // Input: $0.10 / 1M tokens
    // Output: $0.40 / 1M tokens
    const costInputUSD = (totalInput / 1_000_000) * 0.10
    const costOutputUSD = (totalOutput / 1_000_000) * 0.40
    const totalCostUSD = costInputUSD + costOutputUSD

    const totalCost = currency === 'USD' ? totalCostUSD : totalCostUSD * EXCHANGE_RATE

    // Group by operation
    const byType = allStats.reduce((acc, curr) => {
        acc[curr.operation_type] = (acc[curr.operation_type] || 0) + 1
        return acc
    }, {} as Record<string, number>) || {}

    return (
        <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center">
                        <BarChart className="mr-3 h-6 w-6 text-ai-secondary" />
                        {t('title')}
                    </h1>
                    <p className="text-neutral-400 text-sm mt-1">
                        {t('subtitle')}
                    </p>
                </div>

                <button
                    onClick={() => setCurrency(c => c === 'USD' ? 'PLN' : 'USD')}
                    className="flex items-center px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-sm font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
                >
                    <ArrowRightLeft className="w-4 h-4 mr-2 text-ai-secondary" />
                    {currency}
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-neutral-400 text-sm">{t('totalTokens')}</span>
                        <DatabaseIcon className="h-4 w-4 text-ai-secondary" />
                    </div>
                    <div className="text-2xl font-bold text-white">{totalTokens.toLocaleString()}</div>
                    <div className="text-xs text-neutral-500 mt-1">
                        {t('inOut', { input: totalInput.toLocaleString(), output: totalOutput.toLocaleString() })}
                    </div>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-neutral-400 text-sm">{t('estimatedCost')}</span>
                        <DollarSign className="h-4 w-4 text-green-400" />
                    </div>
                    <div className="text-2xl font-bold text-white">
                        {currency === 'USD' ? '$' : 'PLN '}{totalCost.toFixed(4)}
                    </div>
                    <div className="text-xs text-neutral-500 mt-1">
                        {t('pricingNote')} {currency === 'PLN' && `(~${EXCHANGE_RATE} PLN/USD)`}
                    </div>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-neutral-400 text-sm">{t('fastAdds')}</span>
                        <Zap className="h-4 w-4 text-yellow-400" />
                    </div>
                    <div className="text-2xl font-bold text-white">{byType['fast_add'] || 0}</div>
                    <div className="text-xs text-neutral-500 mt-1">
                        {t('itemsProcessed')}
                    </div>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-neutral-400 text-sm">{t('smartSearches')}</span>
                        <Search className="h-4 w-4 text-blue-400" />
                    </div>
                    <div className="text-2xl font-bold text-white">{byType['smart_search'] || 0}</div>
                    <div className="text-xs text-neutral-500 mt-1">
                        {t('queriesAnalyzed')}
                    </div>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-neutral-400 text-sm">{t('generations')}</span>
                        <Sparkles className="h-4 w-4 text-pink-400" />
                    </div>
                    <div className="text-2xl font-bold text-white">{byType['generate_description'] || 0}</div>
                    <div className="text-xs text-neutral-500 mt-1">
                        {t('descriptionsGenerated')}
                    </div>
                </div>
            </div>

            {/* Recent Logs Table */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-neutral-800">
                    <h3 className="text-lg font-medium text-white">{t('recentOperations')}</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-neutral-400 uppercase bg-neutral-950/50">
                            <tr>
                                <th className="px-6 py-3">{t('table.time')}</th>
                                <th className="px-6 py-3">{t('table.operation')}</th>
                                <th className="px-6 py-3">{t('table.model')}</th>
                                <th className="px-6 py-3 text-right">{t('table.inputTokens')}</th>
                                <th className="px-6 py-3 text-right">{t('table.outputTokens')}</th>
                                <th className="px-6 py-3 text-right">{t('table.total')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-800">
                            {logs?.map((log) => (
                                <tr key={log.id} className="hover:bg-neutral-800/50 transition-colors">
                                    <td className="px-6 py-4 text-neutral-300">
                                        {new Date(log.created_at || '').toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${log.operation_type === 'fast_add'
                                            ? 'bg-yellow-400/10 text-yellow-400 ring-1 ring-inset ring-yellow-400/20'
                                            : log.operation_type === 'smart_search'
                                                ? 'bg-blue-400/10 text-blue-400 ring-1 ring-inset ring-blue-400/20'
                                                : 'bg-pink-400/10 text-pink-400 ring-1 ring-inset ring-pink-400/20'
                                            }`}>
                                            {log.operation_type === 'fast_add' ? t('operations.fastAdd') :
                                                log.operation_type === 'smart_search' ? t('operations.smartSearch') :
                                                    t('operations.generateDesc')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-neutral-400 font-mono text-xs">
                                        {log.model_name}
                                    </td>
                                    <td className="px-6 py-4 text-right text-neutral-300">
                                        {log.tokens_input}
                                    </td>
                                    <td className="px-6 py-4 text-right text-neutral-300">
                                        {log.tokens_output}
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-white">
                                        {log.total_tokens}
                                    </td>
                                </tr>
                            ))}
                            {(!logs || logs.length === 0) && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-neutral-500">
                                        {t('noLogs')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
