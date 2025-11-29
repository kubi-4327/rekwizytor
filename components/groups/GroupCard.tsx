'use client'

import { Database } from '@/types/supabase'
import { Folder, ChevronRight, Edit2 } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { EditGroupDialog } from './EditGroupDialog'

type Group = Database['public']['Tables']['groups']['Row']

interface GroupCardProps {
    group: Group
    subgroupCount?: number
    href: string
}

export function GroupCard({ group, subgroupCount = 0, href }: GroupCardProps) {
    const [isEditOpen, setIsEditOpen] = useState(false)

    // Resolve icon component
    const IconComponent = group.icon && group.icon in LucideIcons
        ? LucideIcons[group.icon as keyof typeof LucideIcons]
        : Folder

    return (
        <>
            <Link
                href={href}
                className="group relative flex flex-col p-4 bg-neutral-900/50 border border-neutral-800 rounded-xl hover:bg-neutral-800/50 hover:border-neutral-700 transition-all duration-200"
            >
                <div className="flex items-start justify-between mb-2">
                    <div className="p-2 bg-neutral-800 rounded-lg text-neutral-400 group-hover:text-white group-hover:bg-neutral-700 transition-colors">
                        {/* @ts-ignore - Lucide icons type mismatch */}
                        <IconComponent className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-2">
                        {subgroupCount > 0 && (
                            <span className="text-xs font-medium text-neutral-500 bg-neutral-900 px-2 py-1 rounded-full border border-neutral-800">
                                {subgroupCount}
                            </span>
                        )}
                        <button
                            onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setIsEditOpen(true)
                            }}
                            className="p-1.5 text-neutral-500 hover:text-white hover:bg-neutral-700 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <h3 className="font-medium text-white text-lg mb-1 truncate">
                    {group.name}
                </h3>

                <div className="mt-auto pt-2 flex items-center text-sm text-neutral-500 group-hover:text-neutral-300 transition-colors">
                    <span>View Items</span>
                    <ChevronRight className="w-4 h-4 ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                </div>
            </Link>

            <EditGroupDialog
                group={group}
                isOpen={isEditOpen}
                onClose={() => setIsEditOpen(false)}
            />
        </>
    )
}
