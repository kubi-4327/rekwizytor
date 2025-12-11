'use client'

import React from 'react'
import { clsx } from 'clsx'
import { motion } from 'framer-motion'

interface FilterBarProps {
    className?: string
    children: React.ReactNode
}

export function FilterBar({ className, children }: FilterBarProps) {
    return (
        <div
            className={clsx(
                "sticky top-0 z-30 mb-8 rounded-xl border backdrop-blur-md shadow-sm transition-all duration-200",
                "bg-neutral-950/80 border-white/5",
                "p-3 md:p-4",
                className
            )}
        >
            <div className="flex flex-col xl:flex-row gap-4 justify-between xl:items-center">
                {children}
            </div>
        </div>
    )
}
