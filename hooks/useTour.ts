import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEYS = {
    COMPLETED_TOURS: 'rekwizytor_completed_tours',
    TOURS_ENABLED: 'rekwizytor_tours_enabled'
}

export function useTour() {
    const [completedTours, setCompletedTours] = useState<string[]>([])
    const [areToursEnabled, setAreToursEnabled] = useState(true)
    const [isInitialized, setIsInitialized] = useState(false)

    // Load initial state
    useEffect(() => {
        try {
            const storedTours = localStorage.getItem(STORAGE_KEYS.COMPLETED_TOURS)
            const storedEnabled = localStorage.getItem(STORAGE_KEYS.TOURS_ENABLED)

            if (storedTours) {
                setCompletedTours(JSON.parse(storedTours))
            }

            if (storedEnabled !== null) {
                setAreToursEnabled(JSON.parse(storedEnabled))
            }
        } catch (e) {
            console.warn('Failed to load tour settings from localStorage', e)
        } finally {
            setIsInitialized(true)
        }
    }, [])

    const completeTour = useCallback((tourId: string) => {
        setCompletedTours(prev => {
            if (prev.includes(tourId)) return prev
            const newCompleted = [...prev, tourId]
            localStorage.setItem(STORAGE_KEYS.COMPLETED_TOURS, JSON.stringify(newCompleted))
            return newCompleted
        })
    }, [])

    const resetTour = useCallback((tourId: string) => {
        setCompletedTours(prev => {
            const newCompleted = prev.filter(id => id !== tourId)
            localStorage.setItem(STORAGE_KEYS.COMPLETED_TOURS, JSON.stringify(newCompleted))
            return newCompleted
        })
    }, [])

    const resetAllTours = useCallback(() => {
        setCompletedTours([])
        localStorage.removeItem(STORAGE_KEYS.COMPLETED_TOURS)
    }, [])

    const setToursEnabled = useCallback((enabled: boolean) => {
        setAreToursEnabled(enabled)
        localStorage.setItem(STORAGE_KEYS.TOURS_ENABLED, JSON.stringify(enabled))
    }, [])

    const isTourCompleted = useCallback((tourId: string) => {
        return completedTours.includes(tourId)
    }, [completedTours])

    const shouldShowTour = useCallback((tourId: string) => {
        if (!isInitialized) return false
        if (!areToursEnabled) return false
        return !completedTours.includes(tourId)
    }, [isInitialized, areToursEnabled, completedTours])

    return {
        completedTours,
        areToursEnabled,
        isInitialized,
        completeTour,
        resetTour,
        resetAllTours,
        setToursEnabled,
        isTourCompleted,
        shouldShowTour
    }
}
