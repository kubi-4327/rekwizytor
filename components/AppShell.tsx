'use client'

import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { usePathname } from 'next/navigation'

export function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    // Check for /login, /auth, or localized versions like /pl/login, /en/auth
    const isAuthPage = /^\/(?:[a-z]{2}\/)?(?:login|auth)/.test(pathname)

    if (isAuthPage) {
        return <>{children}</>
    }

    return (
        <div className="flex min-h-screen bg-background">
            <Sidebar />
            <div className="flex flex-1 flex-col md:pl-64">
                <main className="flex-1 pb-24 md:pb-0">
                    {children}
                </main>
                <BottomNav />
            </div>
        </div>
    )
}
