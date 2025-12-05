'use client'

import { useTranslations } from 'next-intl'
import { Package, Wrench, FolderX, Box } from 'lucide-react'

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
            icon: Box,
            color: 'text-blue-400',
            bg: 'bg-blue-400/10',
            border: 'border-blue-400/20'
        },
        {
            label: t('inMaintenance'),
            value: inMaintenance,
            icon: Wrench,
            color: 'text-yellow-400',
            bg: 'bg-yellow-400/10',
            border: 'border-yellow-400/20'
        },
        {
            label: t('unassigned'),
            value: unassigned,
            icon: FolderX,
            color: 'text-red-400',
            bg: 'bg-red-400/10',
            border: 'border-red-400/20'
        }
    ]

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
                <Package className="h-5 w-5 text-action-primary" />
                {t('inventoryStats')}
            </h3>
            <div className="grid grid-cols-1 gap-3">
                {stats.map((stat) => {
                    const Icon = stat.icon
                    return (
                        <div
                            key={stat.label}
                            className={`flex items-center justify-between p-4 rounded-xl border ${stat.border} ${stat.bg} backdrop-blur-sm transition-all hover:scale-[1.02]`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg bg-black/20 ${stat.color}`}>
                                    <Icon className="h-5 w-5" />
                                </div>
                                <span className="text-sm font-medium text-neutral-200">{stat.label}</span>
                            </div>
                            <span className="text-xl font-bold text-white">{stat.value}</span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
