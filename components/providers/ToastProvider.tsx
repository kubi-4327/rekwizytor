'use client'

import { Toaster, ToasterProps } from 'react-hot-toast'
import { useEffect, useState } from 'react'

export function ToastProvider() {
    // Default to top-center (mobile friendly, avoids bottom nav)
    const [position, setPosition] = useState<ToasterProps['position']>('top-center')

    useEffect(() => {
        const handleResize = () => {
            // Check if desktop (md breakpoint usually 768px)
            if (window.innerWidth >= 768) {
                setPosition('bottom-right')
            } else {
                setPosition('top-center')
            }
        }

        // Initial check
        handleResize()

        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    return <Toaster position={position} />
}
