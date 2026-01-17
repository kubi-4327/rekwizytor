'use client'

import { Search, Sparkles, Loader2, Clock, History } from 'lucide-react'
import { forwardRef, useState, useEffect, useRef } from 'react'

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    isSmart?: boolean
    isSearching?: boolean
    onSmartToggle?: () => void
    onSearch?: (value: string) => void
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
    ({ className, isSmart, isSearching, onSmartToggle, onSearch, value, onChange, ...props }, ref) => {
        const [history, setHistory] = useState<string[]>(() => {
            if (typeof window === 'undefined') return []
            try {
                const saved = localStorage.getItem('search_history')
                return saved ? JSON.parse(saved).slice(0, 5) : []
            } catch (e) {
                console.error('Failed to parse search history', e)
                return []
            }
        })
        const [showHistory, setShowHistory] = useState(false)
        const containerRef = useRef<HTMLDivElement>(null)
        const inputRef = useRef<HTMLInputElement>(null)

        // Combine forwarded ref and local ref
        useEffect(() => {
            if (typeof ref === 'function') {
                ref(inputRef.current)
            } else if (ref) {
                ref.current = inputRef.current
            }
        }, [ref])

        useEffect(() => {
            const handleClickOutside = (event: MouseEvent) => {
                if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                    setShowHistory(false)
                }
            }
            document.addEventListener('mousedown', handleClickOutside)
            return () => document.removeEventListener('mousedown', handleClickOutside)
        }, [])

        const addToHistory = (term: string) => {
            if (!term.trim()) return
            const newHistory = [term, ...history.filter(h => h !== term)].slice(0, 5)
            setHistory(newHistory)
            localStorage.setItem('search_history', JSON.stringify(newHistory))
        }

        const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
                addToHistory(e.currentTarget.value)
                setShowHistory(false)
                if (onSearch) onSearch(e.currentTarget.value)
            }
            props.onKeyDown?.(e)
        }

        const handleHistoryClick = (term: string) => {
            // Trigger change event manually since we're updating value directly
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
            if (nativeInputValueSetter && inputRef.current) {
                nativeInputValueSetter.call(inputRef.current, term);
                const event = new Event('input', { bubbles: true });
                inputRef.current.dispatchEvent(event);
            }

            addToHistory(term)
            setShowHistory(false)
            if (onSearch) onSearch(term)
        }

        const clearHistory = (e: React.MouseEvent) => {
            e.stopPropagation()
            setHistory([])
            localStorage.removeItem('search_history')
        }

        return (
            <div className="relative w-full" ref={containerRef}>
                {isSmart ? (
                    <Sparkles className="absolute left-3 top-2.5 h-4 w-4 text-ai-primary" />
                ) : (
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
                )}
                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={onChange}
                    onFocus={() => setShowHistory(true)}
                    onKeyDown={handleKeyDown}
                    className={`w-full rounded-xl border bg-neutral-900/80 py-2 pl-9 pr-24 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 transition-colors
                        ${isSmart
                            ? 'border-ai-primary/30 focus:border-ai-primary focus:ring-ai-primary'
                            : 'border-neutral-800 focus:border-neutral-500 focus:ring-neutral-500'
                        } ${className}`}
                    {...props}
                />
                {onSmartToggle && (
                    <div className="absolute right-2 top-1.5 flex items-center gap-2">
                        {isSmart && isSearching && (
                            <Loader2 className="h-4 w-4 animate-spin text-ai-primary" />
                        )}
                        <button
                            type="button"
                            onClick={onSmartToggle}
                            className={`text-xs px-2 py-1 rounded border transition-colors ${isSmart
                                ? 'bg-ai-bg border-ai-primary/50 text-ai-secondary hover:bg-ai-primary/20'
                                : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:bg-neutral-700'
                                }`}
                        >
                            {isSmart ? 'Smart AI' : 'Classic'}
                        </button>
                    </div>
                )}

                {/* History Dropdown */}
                {showHistory && history.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-neutral-900 border border-neutral-800 rounded-md shadow-lg z-50 overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800 bg-neutral-950/50">
                            <span className="text-xs font-medium text-neutral-500 flex items-center">
                                <History className="w-3 h-3 mr-1.5" />
                                Recent Searches
                            </span>
                            <button
                                onClick={clearHistory}
                                className="text-xs text-neutral-500 hover:text-red-400 transition-colors"
                            >
                                Clear
                            </button>
                        </div>
                        <ul>
                            {history.map((term, index) => (
                                <li key={index}>
                                    <button
                                        onClick={() => handleHistoryClick(term)}
                                        className="w-full text-left px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white flex items-center transition-colors"
                                    >
                                        <Clock className="w-3 h-3 mr-2 text-neutral-600" />
                                        {term}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        )
    }
)

SearchInput.displayName = 'SearchInput'
