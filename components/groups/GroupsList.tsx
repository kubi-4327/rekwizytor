'use client'

import { Database } from '@/types/supabase'
import { GroupCard } from './GroupCard'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { ChevronDown, ChevronRight, MapPin, FileText } from 'lucide-react'

type Group = Database['public']['Tables']['groups']['Row'] & {
    locations: { name: string } | null
}

interface GroupsListProps {
    groups: Group[]
    currentParentId: string | null
}

export function GroupsList({ groups, currentParentId }: GroupsListProps) {
    const pathname = usePathname()
    const [expandedLocations, setExpandedLocations] = useState<Record<string, boolean>>({})

    // Filter groups to show only children of current parent
    const currentLevelGroups = groups.filter(g => g.parent_id === currentParentId)

    if (currentLevelGroups.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-neutral-500">No subgroups found in this category.</p>
            </div>
        )
    }

    // Group by location
    const groupedByLocation = currentLevelGroups.reduce((acc, group) => {
        const locationName = group.locations?.name || 'Unassigned'
        if (!acc[locationName]) {
            acc[locationName] = []
        }
        acc[locationName].push(group)
        return acc
    }, {} as Record<string, Group[]>)

    // Initialize expanded state for all locations on first render if empty
    if (Object.keys(expandedLocations).length === 0 && Object.keys(groupedByLocation).length > 0) {
        const initialExpanded: Record<string, boolean> = {}
        Object.keys(groupedByLocation).forEach(loc => {
            initialExpanded[loc] = true
        })
        setExpandedLocations(initialExpanded)
    }

    const toggleLocation = (location: string) => {
        setExpandedLocations(prev => ({ ...prev, [location]: !prev[location] }))
    }

    const sortedLocations = Object.keys(groupedByLocation).sort((a, b) => {
        if (a === 'Unassigned') return 1
        if (b === 'Unassigned') return -1
        return a.localeCompare(b)
    })

    const [isGenerating, setIsGenerating] = useState(false)

    const handleGenerateAllLabels = async () => {
        try {
            setIsGenerating(true)

            const allGroups = groups.map(g => ({
                id: g.id,
                name: g.name,
                locationName: g.locations?.name
            }))

            // Call backend API (use absolute URL to bypass locale routing)
            const apiUrl = `${window.location.origin}/api/generate-labels`
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ groups: allGroups })
            })

            if (!response.ok) {
                throw new Error('Failed to generate PDF')
            }

            // Download PDF
            const blob = await response.blob()
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `labels_${new Date().toISOString().split('T')[0]}.pdf`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
        } catch (error) {
            console.error('Error generating labels:', error)
            alert('Failed to generate labels. Please try again.')
        } finally {
            setIsGenerating(false)
        }
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-end">
                <button
                    onClick={handleGenerateAllLabels}
                    disabled={isGenerating}
                    className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-md transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <FileText className="w-4 h-4" />
                    {isGenerating ? 'Generating...' : 'Generate All Labels'}
                </button>
            </div>
            {sortedLocations.map(location => (
                <div key={location} className="space-y-4">
                    <button
                        onClick={() => toggleLocation(location)}
                        className="flex items-center gap-2 text-sm font-semibold text-neutral-500 uppercase tracking-wider hover:text-white transition-colors w-full text-left group"
                    >
                        {expandedLocations[location] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        <div className="flex items-center gap-2">
                            {location !== 'Unassigned' && <MapPin className="w-4 h-4" />}
                            {location}
                        </div>
                        <span className="text-xs bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-full group-hover:bg-neutral-700 group-hover:text-white transition-colors">
                            {groupedByLocation[location].length}
                        </span>
                    </button>

                    {expandedLocations[location] && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pl-2 border-l border-neutral-800 ml-2">
                            {groupedByLocation[location].map(group => {
                                const childrenCount = groups.filter(g => g.parent_id === group.id).length
                                return (
                                    <GroupCard
                                        key={group.id}
                                        group={group}
                                        subgroupCount={childrenCount}
                                        href={`/items?groupId=${group.id}`}
                                    />
                                )
                            })}
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}
