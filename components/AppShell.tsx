'use client'

import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { usePathname } from 'next/navigation'

import { GlobalSearchProvider } from './search/GlobalSearchProvider'

export function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    // Check for /login, /auth, /waiting, /rejected, /forgot-password, /update-password or localized versions
    const isAuthPage = /^\/(?:[a-z]{2}\/)?(?:login|auth|waiting|rejected|forgot-password|update-password)/.test(pathname)

    if (isAuthPage) {
        return <>{children}</>
    }

    return (
        <GlobalSearchProvider>
            <div className="flex min-h-screen bg-background">
                <Sidebar />
                <div className="flex flex-1 flex-col md:pl-64 min-w-0">
                    <main className="flex-1 pb-24 md:pb-0">
                        {children}
                    </main>
                    <BottomNav />
                </div>
            </div>
        </GlobalSearchProvider>
    )
}
