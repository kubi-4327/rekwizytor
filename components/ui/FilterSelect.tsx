'use client'

import { forwardRef } from 'react'

interface FilterSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    icon?: React.ReactNode
}

export const FilterSelect = forwardRef<HTMLSelectElement, FilterSelectProps>(
    ({ className, icon, children, ...props }, ref) => {
        return (
            <div className="relative">
                {icon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        {icon}
                    </div>
                )}
                <select
                    ref={ref}
                    className={`appearance-none rounded-md border border-neutral-800 bg-neutral-950 py-2 text-sm text-white focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500
                        ${icon ? 'pl-9 pr-8' : 'pl-3 pr-8'} ${className}`}
                    {...props}
                >
                    {children}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="h-4 w-4 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>
        )
    }
)

FilterSelect.displayName = 'FilterSelect'
