'use client'

import { useState, useEffect } from 'react'

export function useTimeFormat() {
    const [is24Hour, setIs24Hour] = useState(true)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        const stored = localStorage.getItem('timeFormat')
        if (stored) {
            // We can safely set this here as it runs only once on mount
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setIs24Hour(stored === '24')
        }
        setMounted(true)
    }, [])

    const toggleFormat = () => {
        const newValue = !is24Hour
        setIs24Hour(newValue)
        localStorage.setItem('timeFormat', newValue ? '24' : '12')
    }

    const formatTime = (date: Date | string) => {
        if (!mounted) return '' // Avoid hydration mismatch
        const d = typeof date === 'string' ? new Date(date) : date
        return d.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            hour12: !is24Hour
        })
    }

    return { is24Hour, toggleFormat, formatTime, mounted }
}
