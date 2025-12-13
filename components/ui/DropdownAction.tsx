'use client'

import { useState, useRef, useEffect, ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { Button, ButtonProps } from '@/components/ui/Button'
import { cn } from '@/utils/cn'

export interface DropdownItem {
    label: string
    icon?: ReactNode
    onClick?: () => void
    href?: string
    disabled?: boolean
    isLoading?: boolean
    danger?: boolean
}

interface DropdownActionProps extends Omit<ButtonProps, 'onClick' | 'children'> {
    label?: string
    icon?: ReactNode
    items?: DropdownItem[] // Make items optional
    children?: ReactNode | ((props: { close: () => void }) => ReactNode) // Support custom content or render prop
    showChevron?: boolean
    menuWidth?: string
    align?: 'left' | 'right'
}

export function DropdownAction({
    label,
    icon,
    items,
    children,
    variant = 'secondary',
    showChevron = true,
    menuWidth = 'w-56',
    align = 'right',
    className,
    ...props
}: DropdownActionProps) {
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleMouseEnter = () => {
        // Only hover on desktop
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        setIsOpen(true)
    }

    const handleMouseLeave = () => {
        // Delay closing to allow moving mouse to the dropdown
        timeoutRef.current = setTimeout(() => {
            setIsOpen(false)
        }, 150) // Reduced to 150ms to prevent overlap with neighbors
    }

    const toggleOpen = () => setIsOpen(!isOpen)
    const close = () => setIsOpen(false)

    return (
        <div
            ref={containerRef}
            className={cn("relative inline-block", isOpen ? "z-50" : "z-auto")} // High z-index when open
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <Button
                variant={variant}
                onClick={toggleOpen} // Click always toggles (important for mobile)
                className={cn('h-10 transition-all', className)}
                {...props}
            >
                {icon && <span className={cn(label ? 'mr-2' : '')}>{icon}</span>}
                {label && <span className="hidden sm:inline">{label}</span>}
                {showChevron && (
                    <ChevronDown
                        className={cn(
                            'h-4 w-4 transition-transform duration-200 ml-2',
                            isOpen ? 'rotate-180' : '',
                            !label ? 'hidden sm:block' : '' // Hide chevron on mobile if no label (icon only mode)
                        )}
                    />
                )}
            </Button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div
                    className={cn(
                        'absolute z-50 pt-2', // pt-2 acts as a bridge/safe-area
                        menuWidth,
                        align === 'right' ? 'right-0' : 'left-0'
                    )}
                >
                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl overflow-hidden ring-1 ring-white/5 p-1 animate-in fade-in zoom-in-95 duration-100">
                        {children
                            ? (typeof children === 'function' ? children({ close }) : children)
                            : items?.map((item, index) => {
                                if (item.href) {
                                    return (
                                        <a
                                            key={index}
                                            href={item.href}
                                            onClick={() => setIsOpen(false)}
                                            className={cn(
                                                'group flex w-full items-center px-3 py-2.5 text-sm rounded-lg transition-colors',
                                                'hover:bg-neutral-800',
                                                item.danger
                                                    ? 'text-red-400 hover:text-red-300 hover:bg-red-400/10'
                                                    : 'text-neutral-300 hover:text-white'
                                            )}
                                        >
                                            {item.icon && (
                                                <span className={cn('mr-3 h-4 w-4', item.danger ? 'text-red-400' : 'text-neutral-400 group-hover:text-white')}>
                                                    {item.icon}
                                                </span>
                                            )}
                                            <div className="flex flex-col items-start text-left">
                                                <span className="font-medium leading-none">{item.label}</span>
                                            </div>
                                        </a>
                                    )
                                }

                                return (
                                    <button
                                        key={index}
                                        onClick={(e) => {
                                            e.stopPropagation() // Prevent bubbling
                                            if (item.onClick) item.onClick()
                                            setIsOpen(false)
                                        }}
                                        disabled={item.disabled || item.isLoading}
                                        className={cn(
                                            'group flex w-full items-center px-3 py-2.5 text-sm rounded-lg transition-colors',
                                            'hover:bg-neutral-800',
                                            item.danger
                                                ? 'text-red-400 hover:text-red-300 hover:bg-red-400/10'
                                                : 'text-neutral-300 hover:text-white',
                                            (item.disabled || item.isLoading) && 'opacity-50 cursor-not-allowed'
                                        )}
                                    >
                                        {item.isLoading ? (
                                            <div className="mr-3 h-4 w-4 animate-spin rounded-full border-2 border-neutral-600 border-t-white" />
                                        ) : item.icon ? (
                                            <span className={cn('mr-3 h-4 w-4', item.danger ? 'text-red-400' : 'text-neutral-400 group-hover:text-white')}>
                                                {item.icon}
                                            </span>
                                        ) : null}
                                        <span className="font-medium leading-none">{item.label}</span>
                                    </button>
                                )
                            })}
                    </div>
                </div>
            )}
        </div>
    )
}
