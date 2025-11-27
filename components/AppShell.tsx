'use client'

import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { usePathname } from 'next/navigation'

export function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/auth')

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
