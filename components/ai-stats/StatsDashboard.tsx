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
    storageStats: {
        category: string
        label: string
        size_bytes: number
    }[]
}

export function StatsDashboard({ logs, allStats, storageStats }: Props) {
    const [activeTab, setActiveTab] = useState<'ai' | 'storage'>('ai')
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

    // Storage Stats Grouping
    const storageByCat = storageStats.reduce((acc, curr) => {
        if (!acc[curr.category]) acc[curr.category] = []
        acc[curr.category].push(curr)
        return acc
    }, {} as Record<string, typeof storageStats>)

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    return (
        <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-white flex items-center font-boldonse">
                        <BarChart className="mr-3 h-6 w-6 text-ai-secondary" />
                        {t('title')}
                    </h1>
                    <p className="text-neutral-400 text-sm mt-1 font-courier">
                        {t('subtitle')}
                    </p>
                </div>

                <div className="flex items-center gap-2 bg-neutral-900 p-1 rounded-lg border border-neutral-800">
                    <button
                        onClick={() => setActiveTab('ai')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'ai' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'}`}
                    >
                        AI
                    </button>
                    <button
                        onClick={() => setActiveTab('storage')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'storage' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'}`}
                    >
                        Storage
                    </button>
                </div>

                {activeTab === 'ai' && (
                    <button
                        onClick={() => setCurrency(c => c === 'USD' ? 'PLN' : 'USD')}
                        className="flex items-center px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-sm font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
                    >
                        <ArrowRightLeft className="w-4 h-4 mr-2 text-ai-secondary" />
                        {currency}
                    </button>
                )}
            </div>

            {activeTab === 'ai' ? (
                <>
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

                    {/* Cost & Usage Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
                            <h3 className="text-base font-medium text-white mb-4 font-boldonse">Cost Breakdown</h3>
                            <div className="space-y-4">
                                {Object.entries(byType).map(([type]) => {
                                    const typeLogs = allStats.filter(s => s.operation_type === type)
                                    const typeInput = typeLogs.reduce((acc, curr) => acc + (curr.tokens_input || 0), 0)
                                    const typeOutput = typeLogs.reduce((acc, curr) => acc + (curr.tokens_output || 0), 0)
                                    const typeCostUSD = ((typeInput / 1_000_000) * 0.10) + ((typeOutput / 1_000_000) * 0.40)
                                    const typeCost = currency === 'USD' ? typeCostUSD : typeCostUSD * EXCHANGE_RATE

                                    const label = type === 'fast_add' ? t('operations.fastAdd') :
                                        type === 'smart_search' ? t('operations.smartSearch') :
                                            t('operations.generateDesc')

                                    return (
                                        <div key={type} className="flex justify-between items-center">
                                            <span className="text-neutral-400 text-sm font-courier">{label}</span>
                                            <span className="text-white font-courier text-sm">
                                                {currency === 'USD' ? '$' : 'PLN '}{typeCost.toFixed(4)}
                                            </span>
                                        </div>
                                    )
                                })}
                                <div className="pt-3 border-t border-neutral-800 flex justify-between items-center">
                                    <span className="text-neutral-300 text-sm font-bold font-courier">Total</span>
                                    <span className="text-green-400 font-courier text-sm font-bold">
                                        {currency === 'USD' ? '$' : 'PLN '}{totalCost.toFixed(4)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
                            <h3 className="text-base font-medium text-white mb-4 font-boldonse">Average Tokens / Op</h3>
                            <div className="space-y-4">
                                {Object.entries(byType).map(([type, count]) => {
                                    const typeLogs = allStats.filter(s => s.operation_type === type)
                                    const totalTokens = typeLogs.reduce((acc, curr) => acc + (curr.tokens_input || 0) + (curr.tokens_output || 0), 0)
                                    const avg = count > 0 ? Math.round(totalTokens / count) : 0

                                    const label = type === 'fast_add' ? t('operations.fastAdd') :
                                        type === 'smart_search' ? t('operations.smartSearch') :
                                            t('operations.generateDesc')

                                    return (
                                        <div key={type} className="flex justify-between items-center">
                                            <span className="text-neutral-400 text-sm font-courier">{label}</span>
                                            <span className="text-white font-courier text-sm">{avg} tokens</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Token Usage Chart */}
                    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
                        <h3 className="text-base font-medium text-white mb-6 font-boldonse">Token Usage Over Time</h3>
                        <div className="h-64 flex items-end gap-2">
                            {(() => {
                                // Group logs by date (last 14 days)
                                const days = 14
                                const now = new Date()
                                const data = Array.from({ length: days }).map((_, i) => {
                                    const d = new Date()
                                    d.setDate(now.getDate() - (days - 1 - i))
                                    const dateStr = d.toISOString().split('T')[0]
                                    const dayLogs = logs.filter(l => l.created_at?.startsWith(dateStr))
                                    const total = dayLogs.reduce((acc, curr) => acc + (curr.total_tokens || 0), 0)
                                    return { date: dateStr, total, label: d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' }) }
                                })

                                const max = Math.max(...data.map(d => d.total), 100) // Min max 100 to avoid div by zero

                                return data.map((d) => (
                                    <div key={d.date} className="flex-1 flex flex-col items-center gap-2 group">
                                        <div className="w-full relative flex items-end justify-center h-full">
                                            <div
                                                className="w-full bg-neutral-800 rounded-t-sm hover:bg-ai-secondary transition-colors relative group-hover:opacity-100"
                                                style={{ height: `${(d.total / max) * 100}%` }}
                                            >
                                                <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10 border border-neutral-700 font-courier">
                                                    {d.total.toLocaleString()} tokens
                                                </div>
                                            </div>
                                        </div>
                                        <span className="text-[10px] text-neutral-500 font-courier rotate-45 origin-left translate-y-2">{d.label}</span>
                                    </div>
                                ))
                            })()}
                        </div>
                    </div>

                    {/* Recent Logs Table */}
                    <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-neutral-800">
                            <h3 className="text-lg font-medium text-white">{t('recentOperations')}</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-neutral-400 uppercase bg-neutral-950/50 font-courier">
                                    <tr>
                                        <th className="px-6 py-3">{t('table.time')}</th>
                                        <th className="px-6 py-3">{t('table.operation')}</th>
                                        <th className="px-6 py-3">{t('table.model')}</th>
                                        <th className="px-6 py-3 text-right">{t('table.inputTokens')}</th>
                                        <th className="px-6 py-3 text-right">{t('table.outputTokens')}</th>
                                        <th className="px-6 py-3 text-right">{t('table.total')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-800 font-courier">
                                    {logs?.map((log) => (
                                        <tr key={log.id} className="hover:bg-neutral-800/50 transition-colors">
                                            <td className="px-6 py-4 text-neutral-300">
                                                {new Date(log.created_at || '').toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium font-sans ${log.operation_type === 'fast_add'
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
                                            <td className="px-6 py-4 text-neutral-400 text-xs">
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
                </>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {Object.entries(storageByCat).map(([category, items]) => (
                        <div key={category} className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
                            <div className="px-4 py-3 border-b border-neutral-800 bg-neutral-950/50">
                                <h3 className="text-md font-bold text-white font-boldonse">{category}</h3>
                            </div>
                            <div className="p-4 space-y-4">
                                {items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center">
                                        <span className="text-neutral-400 text-sm font-courier">{item.label}</span>
                                        <span className="text-white font-mono text-sm">{formatBytes(item.size_bytes)}</span>
                                    </div>
                                ))}
                                <div className="pt-3 border-t border-neutral-800 flex justify-between items-center">
                                    <span className="text-neutral-300 text-sm font-bold font-courier">Total</span>
                                    <span className="text-ai-secondary font-mono text-sm font-bold">
                                        {formatBytes(items.reduce((acc, curr) => acc + curr.size_bytes, 0))}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
