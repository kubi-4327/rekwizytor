'use client'

import { Database } from '@/types/supabase'
import { GroupCard } from './GroupCard'
import { usePathname, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, MapPin, FileText } from 'lucide-react'
import { FilterBar } from '@/components/ui/FilterBar'
import { MorphingSearchBar } from '@/components/search/MorphingSearchBar'
import { Button } from '@/components/ui/Button'
import { rasterizeIcon } from '@/utils/icon-rasterizer'

type Group = Database['public']['Tables']['groups']['Row'] & {
    locations: { name: string } | null
}

interface GroupsListProps {
    groups: Group[]
    currentParentId: string | null
}

export function GroupsList({ groups, currentParentId }: GroupsListProps) {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const highlightId = searchParams.get('highlight')
    const [expandedLocations, setExpandedLocations] = useState<Record<string, boolean>>({})

    // Handle highlight logic
    useEffect(() => {
        if (highlightId && groups.length > 0) {
            const targetGroup = groups.find(g => g.id === highlightId)
            if (targetGroup) {
                // 1. Expand location
                const locationName = targetGroup.locations?.name || 'Unassigned'
                setExpandedLocations(prev => ({ ...prev, [locationName]: true }))

                // 2. Scroll to element after a brief delay to allow expansion
                setTimeout(() => {
                    const element = document.getElementById(`group-${highlightId}`)
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
                        // Optional: Add a temporary flash effect class
                        element.classList.add('ring-2', 'ring-white', 'ring-offset-2', 'ring-offset-black')
                        setTimeout(() => {
                            element.classList.remove('ring-2', 'ring-white', 'ring-offset-2', 'ring-offset-black')
                        }, 2000)
                    }
                }, 100)
            }
        }
    }, [highlightId, groups])

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

            const allGroups = await Promise.all(groups.map(async (g) => ({
                id: g.id,
                name: g.name,
                locationName: g.locations?.name,
                iconImage: await rasterizeIcon(g.icon || 'Folder')
            })))

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
            <FilterBar>
                <div className="flex-1 w-full xl:w-auto min-w-[300px]">
                    <MorphingSearchBar mode="trigger" context="group" className="w-full" />
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        onClick={handleGenerateAllLabels}
                        disabled={isGenerating}
                        variant="secondary"
                        isLoading={isGenerating}
                        leftIcon={<FileText className="w-4 h-4" />}
                    >
                        Generate All Labels
                    </Button>
                </div>
            </FilterBar>
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
                                    <div key={group.id} id={`group-${group.id}`} className="transition-all duration-300">
                                        <GroupCard
                                            group={group}
                                            subgroupCount={childrenCount}
                                            href={`/items?groupId=${group.id}`}
                                        />
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}
