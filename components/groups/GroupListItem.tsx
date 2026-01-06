'use client'

import { Database } from '@/types/supabase'
import { Folder, ChevronRight, Edit2 } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { GroupLabelButton } from './GroupLabelButton'

type Group = Pick<Database['public']['Tables']['groups']['Row'],
    'id' | 'name' | 'icon'> & {
        locations: { name: string } | null
    }

interface GroupListItemProps {
    group: Group
    subgroupCount?: number
    onClick?: () => void
    onEdit?: (group: Group) => void
}

export function GroupListItem({ group, subgroupCount = 0, onClick, onEdit }: GroupListItemProps) {
    // Resolve icon component
    const IconComponent = group.icon && group.icon in LucideIcons
        ? LucideIcons[group.icon as keyof typeof LucideIcons]
        : Folder

    return (
        <>
            <div
                onClick={onClick}
                className="group relative flex items-center gap-4 px-4 py-3 bg-neutral-900/20 hover:bg-neutral-800/50 border-b border-neutral-800 last:border-b-0 transition-colors cursor-pointer"
            >
                {/* Icon */}
                <div className="flex-shrink-0 p-2 bg-neutral-800 rounded-lg text-neutral-400 group-hover:text-white group-hover:bg-neutral-700 transition-colors">
                    {/* @ts-ignore - Lucide icons type mismatch */}
                    <IconComponent className="w-5 h-5" />
                </div>

                {/* Name */}
                <div className="flex-grow min-w-0">
                    <h3 className="font-medium text-neutral-200 group-hover:text-white truncate transition-colors">
                        {group.name}
                    </h3>
                    {group.locations?.name && (
                        <p className="text-xs text-neutral-500 mt-0.5 truncate">
                            {group.locations.name}
                        </p>
                    )}
                </div>

                {/* Subgroups Badge */}
                {subgroupCount > 0 && (
                    <span className="flex-shrink-0 text-xs font-medium text-neutral-500 bg-neutral-900 px-2 py-1 rounded-full border border-neutral-800">
                        {subgroupCount} {subgroupCount === 1 ? 'podgrupa' : 'podgrup'}
                    </span>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0">
                    <div onClick={(e) => e.stopPropagation()}>
                        <GroupLabelButton
                            groupId={group.id}
                            groupName={group.name}
                            locationName={group.locations?.name || undefined}
                        />
                    </div>

                    <ChevronRight className="w-4 h-4 text-neutral-600 group-hover:text-neutral-400" />
                </div>
            </div>
        </>
    )
}
