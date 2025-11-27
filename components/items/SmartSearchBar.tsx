'use client'

import { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { smartSearch } from '@/app/actions/smart-search'
import Link from 'next/link'

type SearchResult = {
    id: string
    name: string
    explanation: string
    matchType: 'exact' | 'close' | 'alternative'
    image_url?: string
}

export function SmartSearchBar() {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<SearchResult[]>([])
    const [suggestion, setSuggestion] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [searched, setSearched] = useState(false)

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!query.trim()) return

        setLoading(true)
        setSearched(true)
        setResults([])
        setSuggestion(null)

        try {
            const response = await smartSearch(query)
            if (response.results) {
                setResults(response.results)
            }
            if (response.suggestion) {
                setSuggestion(response.suggestion)
            }
        } catch (error) {
            console.error('Search failed:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="w-full max-w-2xl mx-auto mb-8">
            <form onSubmit={handleSearch} className="relative">
                <div className="relative">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Describe what you're looking for (e.g., 'vintage suitcase for 90s play')..."
                        className="w-full h-12 pl-12 pr-4 rounded-xl bg-neutral-900/50 border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-ai-primary/50 focus:border-ai-primary/50 transition-all"
                    />
                    <div className="absolute left-4 top-3.5">
                        {loading ? (
                            <Loader2 className="w-5 h-5 text-ai-secondary animate-spin" />
                        ) : (
                            <Sparkles className="w-5 h-5 text-ai-secondary" />
                        )}
                    </div>
                    <button
                        type="submit"
                        disabled={loading || !query.trim()}
                        className="absolute right-2 top-2 px-4 py-1.5 btn-burgundy text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Search
                    </button>
                </div>
            </form>

            {/* AI Results */}
            {searched && !loading && (
                <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    {results.length > 0 ? (
                        <>
                            <div className="flex items-center justify-between px-1">
                                <h3 className="text-sm font-medium text-ai-secondary flex items-center">
                                    <Sparkles className="w-3 h-3 mr-2" />
                                    AI Suggestions
                                </h3>
                                <button
                                    onClick={() => { setSearched(false); setQuery(''); setSuggestion(null); }}
                                    className="text-xs text-neutral-500 hover:text-neutral-300"
                                >
                                    Clear
                                </button>
                            </div>
                            <div className="grid gap-3">
                                {results.map((item) => (
                                    <Link
                                        key={item.id}
                                        href={`/items/${item.id}`}
                                        className="block group"
                                    >
                                        <div className="bg-neutral-900/80 border border-neutral-800 rounded-lg p-4 hover:border-ai-primary/30 hover:bg-neutral-900 transition-all">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className="font-medium text-white group-hover:text-ai-secondary transition-colors">
                                                        {item.name}
                                                    </h4>
                                                    <p className="text-sm text-neutral-400 mt-1">
                                                        {item.explanation}
                                                    </p>
                                                </div>
                                                {item.matchType === 'exact' && (
                                                    <span className="px-2 py-0.5 rounded-full bg-green-900/30 text-green-400 text-xs border border-green-900/50">
                                                        Best Match
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                            {suggestion && (
                                <div className="mt-4 p-3 bg-ai-secondary/10 border border-ai-secondary/20 rounded-lg text-sm text-ai-secondary flex items-start">
                                    <Sparkles className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                                    <p>{suggestion}</p>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-8 text-neutral-500 bg-neutral-900/30 rounded-lg border border-neutral-800 border-dashed px-4">
                            <p className="mb-2">No exact matches found.</p>
                            {suggestion && (
                                <div className="mt-2 text-ai-secondary bg-ai-secondary/5 p-3 rounded-lg text-sm">
                                    <p className="font-medium mb-1">AI Suggestion:</p>
                                    <p>{suggestion}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
