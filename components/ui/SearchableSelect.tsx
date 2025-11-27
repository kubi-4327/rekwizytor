'use client'

import { useState, useRef, useEffect } from 'react'
import { Check, ChevronsUpDown, Search } from 'lucide-react'

type Option = {
    id: string
    name: string
}

type Props = {
    options: Option[]
    value: string
    onChange: (value: string) => void
    placeholder?: string
    label: string
}

export function SearchableSelect({ options, value, onChange, placeholder, label }: Props) {
    const [isOpen, setIsOpen] = useState(false)
    const [search, setSearch] = useState('')
    const containerRef = useRef<HTMLDivElement>(null)

    const filteredOptions = options.filter((option) =>
        option.name.toLowerCase().includes(search.toLowerCase())
    )

    const selectedOption = options.find((option) => option.id === value)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <div className="relative" ref={containerRef}>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
                {label}
            </label>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="relative w-full cursor-default rounded-md border border-neutral-800 bg-neutral-950 py-2 pl-3 pr-10 text-left text-white shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 sm:text-sm"
            >
                <span className="block truncate">
                    {selectedOption ? selectedOption.name : placeholder || 'Select...'}
                </span>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronsUpDown className="h-4 w-4 text-neutral-400" aria-hidden="true" />
                </span>
            </button>

            {isOpen && (
                <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-neutral-900 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm border border-neutral-800">
                    <div className="sticky top-0 z-10 bg-neutral-900 px-2 py-1.5 border-b border-neutral-800">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-neutral-500" />
                            <input
                                type="text"
                                className="w-full rounded-md border border-neutral-800 bg-neutral-950 py-1.5 pl-8 pr-3 text-xs text-white placeholder-neutral-500 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
                                placeholder="Search..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>
                    {filteredOptions.length === 0 ? (
                        <div className="relative cursor-default select-none py-2 px-4 text-neutral-500">
                            Nothing found.
                        </div>
                    ) : (
                        filteredOptions.map((option) => (
                            <div
                                key={option.id}
                                className={`relative cursor-default select-none py-2 pl-3 pr-9 hover:bg-neutral-800 ${value === option.id ? 'text-white bg-neutral-800' : 'text-neutral-300'
                                    }`}
                                onClick={() => {
                                    onChange(option.id)
                                    setIsOpen(false)
                                    setSearch('')
                                }}
                            >
                                <span className={`block truncate ${value === option.id ? 'font-semibold' : 'font-normal'}`}>
                                    {option.name}
                                </span>
                                {value === option.id && (
                                    <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-white">
                                        <Check className="h-4 w-4" aria-hidden="true" />
                                    </span>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    )
}
