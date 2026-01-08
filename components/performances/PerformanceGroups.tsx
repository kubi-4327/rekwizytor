'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { GroupCard } from '@/components/groups/GroupCard'
import { Button } from '@/components/ui/Button'
import { Plus } from 'lucide-react'
import { notify } from '@/utils/notify'
import { GroupDetailsDialog } from '@/components/groups/GroupDetailsDialog'
import { Database } from '@/types/supabase'

type Group = Database['public']['Tables']['groups']['Row'] & {
    locations: { name: string } | null
}

interface Props {
    performanceId: string
    performanceTitle: string
    groups: Group[]
    performanceColor?: string | null
}

export function PerformanceGroups({ performanceId, performanceTitle, groups, performanceColor }: Props) {
    const router = useRouter()
    const supabase = createClient()
    const [isLoading, setIsLoading] = useState(false)
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
    const [isDetailsOpen, setIsDetailsOpen] = useState(false)

    const handleAddGroup = async () => {
        setIsLoading(true)
        try {
            // Calculate next number
            const regex = new RegExp(`^${performanceTitle} #(\\d+)$`)
            let maxNum = 0
            let hasBaseGroup = false

            // Check existing groups
            groups.forEach(g => {
                if (g.name === performanceTitle) {
                    hasBaseGroup = true
                }

                const match = g.name.match(regex)
                if (match) {
                    const num = parseInt(match[1])
                    if (num > maxNum) maxNum = num
                }
            })

            // Logic:
            // 1. If "Performance" doesn't exist -> create "Performance"
            // 2. If "Performance" exists -> create "Performance #2"
            // 3. If "Performance #2" exists -> create "Performance #3"

            let newName = performanceTitle

            if (hasBaseGroup) {
                const nextNum = maxNum < 2 ? 2 : maxNum + 1
                newName = `${performanceTitle} #${nextNum}`
            }

            const { data, error } = await supabase
                .from('groups')
                .insert({
                    name: newName,
                    performance_id: performanceId,
                    icon: 'Box'
                })
                .select('id')
                .single()

            if (error) throw error

            // Generate embedding in background
            if (data) {
                import('@/app/actions/generate-group-embeddings').then(({ generateGroupEmbedding }) => {
                    generateGroupEmbedding(data.id).catch(err =>
                        console.error('Failed to generate embedding:', err)
                    )
                })
            }

            notify.success(`Utworzono grupę: ${newName}`)
            router.refresh()
        } catch (error) {
            console.error(error)
            notify.error('Nie udało się utworzyć grupy')
        } finally {
            setIsLoading(false)
        }
    }

    const openGroupDetails = (group: Group) => {
        setSelectedGroup(group)
        setIsDetailsOpen(true)
    }

    return (
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/80">
                <h3 className="font-bold text-neutral-200 flex items-center gap-2 font-sans text-base">
                    {/* <Box className="w-4 h-4 text-neutral-400" /> */}
                    Grupy
                </h3>
                <Button
                    onClick={handleAddGroup}
                    isLoading={isLoading}
                    variant="secondary"
                    className="h-7 text-xs px-2.5 bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 hover:text-white"
                    leftIcon={<Plus className="w-3 h-3" />}
                >
                    Dodaj grupę
                </Button>
            </div>

            <div className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {groups.map(group => (
                        <GroupCard
                            key={group.id}
                            group={group}
                            showLocationAsPrimary={true}
                            onClick={() => openGroupDetails(group)}
                            colorOverride={performanceColor || undefined}
                        />
                    ))}

                    {groups.length === 0 && (
                        <div className="col-span-full py-8 text-center border border-dashed border-neutral-800 rounded-lg text-neutral-500 text-sm">
                            Brak grup przypisanych do tego spektaklu.
                        </div>
                    )}
                </div>
            </div>

            <GroupDetailsDialog
                group={selectedGroup}
                open={isDetailsOpen}
                onOpenChange={setIsDetailsOpen}
                onEdit={() => { }}
                onDelete={() => { }}
            />
        </div>
    )
}
