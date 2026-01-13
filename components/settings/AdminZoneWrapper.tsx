'use client'

import dynamic from 'next/dynamic'

// We use dynamic import with ssr: false to load the AdminZone
// The catch() ensures that if the folder/file is missing (e.g., in production/git), it won't crash
const AdminZoneContent = dynamic(
    () => import('@/components/admin/AdminZone').then(mod => mod.AdminZone).catch(() => () => null),
    { ssr: false }
)

interface AdminZoneWrapperProps {
    role: string
}

export function AdminZoneWrapper({ role }: AdminZoneWrapperProps) {
    return <AdminZoneContent role={role} />
}
