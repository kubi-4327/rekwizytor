'use client'

import { useTranslations } from 'next-intl'
import { Package, Wrench, FolderX } from 'lucide-react'

interface InventoryStatsProps {
    totalItems: number
    inMaintenance: number
    unassigned: number
}

export function InventoryStats({ totalItems, inMaintenance, unassigned }: InventoryStatsProps) {
    const t = useTranslations('Dashboard')

    const stats = [
        {
            label: t('totalItems'),
            value: totalItems,
            icon: Package,
            color: 'text-blue-400'
        },
        {
            label: t('inMaintenance'),
            value: inMaintenance,
            icon: Wrench,
            color: 'text-yellow-400'
        },
        {
            label: t('unassigned'),
            value: unassigned,
            icon: FolderX,
            color: 'text-neutral-400'
        }
    ]

    return (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 backdrop-blur-sm p-6">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                <Package className="h-5 w-5 text-action-primary" />
                {t('inventoryStats')}
            </h3>
            <div className="space-y-4">
                {stats.map((stat) => {
                    const Icon = stat.icon
                    return (
                        <div key={stat.label} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Icon className={`h-4 w-4 ${stat.color}`} />
                                <span className="text-sm text-neutral-400">{stat.label}</span>
                            </div>
                            <span className="text-lg font-semibold text-white">{stat.value}</span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
