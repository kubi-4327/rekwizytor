'use client'
// Force refresh

import { Database } from '@/types/supabase'
import { Folder, Edit2, Tag } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { GroupLabelButton } from './GroupLabelButton'

type Group = Pick<Database['public']['Tables']['groups']['Row'],
    'id' | 'name' | 'icon'> & {
        locations: { name: string } | null
    }

interface GroupCardProps {
    group: Group
    subgroupCount?: number
    onClick?: () => void
    onEdit?: (group: Group) => void
    showLocationAsPrimary?: boolean
}

export function GroupCard({ group, subgroupCount = 0, onClick, onEdit, showLocationAsPrimary = false, colorOverride }: GroupCardProps & { colorOverride?: string }) {
    // Resolve icon component
    const IconComponent = group.icon && group.icon in LucideIcons
        ? LucideIcons[group.icon as keyof typeof LucideIcons]
        : Folder

    const locationName = group.locations?.name || 'Nieprzypisane'

    // Primary and Secondary text logic
    const primaryText = showLocationAsPrimary ? locationName : group.name
    const secondaryText = showLocationAsPrimary ? group.name : null

    // Determine color to use - simplified logic
    // If colorOverride is provided, use it. Otherwise use neutral/amber depending on context like before but softer
    // Actually, per requirement, we want to remove the random yellow. 
    // So if showLocationAsPrimary is true, we ideally want to use the performance color if available.
    // We will use colorOverride if passed. 

    // Helper for styles
    const activeColor = colorOverride || '#A0232F' // Default to primary brand color if no override

    return (
        <div
            onClick={onClick}
            className="group relative flex items-center gap-3 p-3 bg-neutral-900/40 backdrop-blur-sm border border-neutral-800 rounded-lg hover:bg-neutral-900/60 transition-all duration-200 cursor-pointer h-full"
            style={{
                borderColor: colorOverride ? `${colorOverride}33` : undefined // 20% opacity
            }}
        >
            {/* Icon */}
            <div
                className={`flex-shrink-0 p-2 rounded-lg transition-colors`}
                style={{
                    backgroundColor: showLocationAsPrimary || colorOverride ? `${activeColor}1A` : undefined, // 10% opacity
                    color: showLocationAsPrimary || colorOverride ? activeColor : undefined
                }}
            >
                {/* @ts-ignore - Lucide icons type mismatch */}
                <IconComponent
                    className={`w-5 h-5 ${(!showLocationAsPrimary && !colorOverride) ? 'text-neutral-400 group-hover:text-white' : ''}`}
                />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h3
                    className={`font-medium truncate text-sm uppercase tracking-wide`}
                    style={{ color: showLocationAsPrimary ? activeColor : '#EDEDED' }}
                >
                    {primaryText}
                </h3>

                {secondaryText && (
                    <p className={`truncate font-semibold text-white`}>
                        {secondaryText}
                    </p>
                )}
            </div>

            {/* Subgroup count (if any) */}
            {subgroupCount > 0 && (
                <span className="flex-shrink-0 text-xs font-medium text-neutral-500 bg-neutral-900 px-2 py-1 rounded-full border border-neutral-800">
                    {subgroupCount}
                </span>
            )}

            {/* Hover actions */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-900/80 rounded-md p-1 backdrop-blur-md border border-neutral-800 shadow-xl z-10">
                <div onClick={(e) => e.stopPropagation()}>
                    <GroupLabelButton
                        groupId={group.id}
                        groupName={group.name}
                        locationName={group.locations?.name || undefined}
                    />
                </div>
            </div>
        </div>
    )
}

