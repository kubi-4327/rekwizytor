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
}

export function GroupCard({ group, subgroupCount = 0, onClick, onEdit }: GroupCardProps) {
    // Resolve icon component
    const IconComponent = group.icon && group.icon in LucideIcons
        ? LucideIcons[group.icon as keyof typeof LucideIcons]
        : Folder

    return (
        <div
            onClick={onClick}
            className="group relative flex items-center gap-3 p-3 bg-neutral-900/40 backdrop-blur-sm border border-neutral-800 rounded-lg hover:bg-neutral-900/60 hover:border-neutral-700 transition-all duration-200 cursor-pointer"
        >
            {/* Icon */}
            <div className="flex-shrink-0 p-2 bg-neutral-800 rounded-lg text-neutral-400 group-hover:text-white group-hover:bg-neutral-700 transition-colors">
                {/* @ts-ignore - Lucide icons type mismatch */}
                <IconComponent className="w-5 h-5" />
            </div>

            {/* Name */}
            <h3 className="flex-1 font-medium text-white text-base truncate group-hover:text-white/90">
                {group.name}
            </h3>

            {/* Subgroup count (if any) */}
            {subgroupCount > 0 && (
                <span className="flex-shrink-0 text-xs font-medium text-neutral-500 bg-neutral-900 px-2 py-1 rounded-full border border-neutral-800">
                    {subgroupCount}
                </span>
            )}

            {/* Hover actions */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-900/80 rounded-md p-1">
                <div onClick={(e) => e.stopPropagation()}>
                    <GroupLabelButton
                        groupId={group.id}
                        groupName={group.name}
                        locationName={group.locations?.name || undefined}
                    />
                </div>
                <button
                    onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        onEdit?.(group)
                    }}
                    className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-700 rounded-md transition-colors"
                    title="Edytuj grupę"
                >
                    <Edit2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    )
}

