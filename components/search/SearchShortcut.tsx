'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function SearchShortcut() {
    const router = useRouter()

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                router.push('/search')
            }
        }

        document.addEventListener('keydown', down)
        return () => document.removeEventListener('keydown', down)
    }, [router])

    return null
}
