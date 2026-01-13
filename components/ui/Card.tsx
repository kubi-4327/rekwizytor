import React from 'react'
import { cn } from '@/lib/utils'

interface CardProps {
    children: React.ReactNode
    className?: string
}

interface CardHeaderProps {
    children: React.ReactNode
    className?: string
}

interface CardTitleProps {
    children: React.ReactNode
    className?: string
}

interface CardDescriptionProps {
    children: React.ReactNode
    className?: string
}

interface CardContentProps {
    children: React.ReactNode
    className?: string
}

export function Card({ children, className }: CardProps) {
    return (
        <div className={cn("bg-gray-900 border border-gray-800 rounded-lg shadow-lg", className)}>
            {children}
        </div>
    )
}

export function CardHeader({ children, className }: CardHeaderProps) {
    return (
        <div className={cn("p-6 border-b border-gray-800", className)}>
            {children}
        </div>
    )
}

export function CardTitle({ children, className }: CardTitleProps) {
    return (
        <h3 className={cn("text-xl font-semibold text-white", className)}>
            {children}
        </h3>
    )
}

export function CardDescription({ children, className }: CardDescriptionProps) {
    return (
        <p className={cn("text-sm text-gray-400 mt-1", className)}>
            {children}
        </p>
    )
}

export function CardContent({ children, className }: CardContentProps) {
    return (
        <div className={cn("p-6", className)}>
            {children}
        </div>
    )
}
