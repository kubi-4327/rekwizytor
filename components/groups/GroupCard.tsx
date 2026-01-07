'use client'
// Force refresh

import { Database } from '@/types/supabase'
import { Folder, Edit2, Tag } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { GroupLabelButton } from './GroupLabelButton'

type Group = Pick<Database['public']['Tables']['groups']['Row'],
    'id' | 'name' | 'icon' | 'performance_id'> & {
        locations: { name: string } | null
    }

interface GroupCardProps {
    group: Group
    subgroupCount?: number
    onClick?: () => void
    onEdit?: (group: Group) => void
    showLocationAsPrimary?: boolean
}

export function GroupCard({ group, subgroupCount = 0, onClick, onEdit, showLocationAsPrimary = false }: GroupCardProps) {
    // Resolve icon component
    const IconComponent = group.icon && group.icon in LucideIcons
        ? LucideIcons[group.icon as keyof typeof LucideIcons]
        : Folder

    const locationName = group.locations?.name || 'Nieprzypisane'

    // Primary and Secondary text logic
    // If showLocationAsPrimary is true (Performance View):
    // - Primary: Location Name (e.g. "Garderoba") - prioritized
    // - Secondary: Group Name (e.g. "Spektakl #1") - less important as it's redundant context
    //
    // If showLocationAsPrimary is false (Groups View):
    // - Primary: Group Name - prioritized
    // - Secondary: NULL (Location is redundant as columns represent locations)

    const primaryText = showLocationAsPrimary ? locationName : group.name
    const secondaryText = showLocationAsPrimary ? group.name : null

    return (
        <div
            onClick={onClick}
            className="group relative flex items-center gap-3 p-3 bg-neutral-900/40 backdrop-blur-sm border border-neutral-800 rounded-lg hover:bg-neutral-900/60 hover:border-neutral-700 transition-all duration-200 cursor-pointer h-full"
        >
            {/* Icon */}
            <div className={`flex-shrink-0 p-2 rounded-lg transition-colors ${showLocationAsPrimary
                ? 'bg-amber-500/10 text-amber-500 group-hover:bg-amber-500/20'
                : 'bg-neutral-800 text-neutral-400 group-hover:text-white group-hover:bg-neutral-700'
                }`}>
                {/* @ts-ignore - Lucide icons type mismatch */}
                <IconComponent className="w-5 h-5" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h3 className={`font-medium truncate ${showLocationAsPrimary ? 'text-amber-400/90 text-sm uppercase tracking-wide' : 'text-white text-base'}`}>
                    {primaryText}
                </h3>

                {secondaryText && (
                    <p className={`truncate ${showLocationAsPrimary ? 'text-white text-base font-semibold' : 'text-neutral-500 text-xs mt-0.5'}`}>
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

