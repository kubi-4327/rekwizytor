'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Check, X, Trash2, User, Clock } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface Profile {
    id: string
    full_name: string | null
    role: 'admin' | 'user' | 'manager'
    status: 'pending' | 'approved' | 'rejected'
    created_at?: string
    email?: string | null
}

interface UsersListProps {
    initialProfiles: Profile[]
}

export function UsersList({ initialProfiles }: UsersListProps) {
    const t = useTranslations('AdminUsers')
    const [profiles, setProfiles] = useState<Profile[]>(initialProfiles)
    const [loading, setLoading] = useState<string | null>(null)
    const supabase = createClient()
    const router = useRouter()

    const handleStatusChange = async (id: string, newStatus: 'approved' | 'rejected') => {
        setLoading(id)
        const { error } = await supabase
            .from('profiles')
            .update({ status: newStatus })
            .eq('id', id)

        if (!error) {
            setProfiles(profiles.map(p => p.id === id ? { ...p, status: newStatus } : p))

            router.refresh()
        }
        setLoading(null)
    }

    const handleDelete = async (id: string) => {
        if (!confirm(t('deleteConfirm'))) return

        setLoading(id)

        try {
            const response = await fetch('/api/admin/delete-user', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId: id }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to delete user')
            }

            setProfiles(profiles.filter(p => p.id !== id))
            router.refresh()
        } catch (error) {
            console.error('Delete error:', error)
            alert(t('deleteError'))
        } finally {
            setLoading(null)
        }
    }

    const handleRoleChange = async (id: string, newRole: 'admin' | 'user' | 'manager') => {
        setLoading(id)
        const { error } = await supabase
            .from('profiles')
            .update({ role: newRole })
            .eq('id', id)

        if (!error) {
            setProfiles(profiles.map(p => p.id === id ? { ...p, role: newRole } : p))
            router.refresh()
        }
        setLoading(null)
    }

    return (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-neutral-400">
                    <thead className="bg-neutral-950 text-neutral-200 uppercase">
                        <tr>
                            <th className="px-6 py-3">{t('user')}</th>
                            <th className="px-6 py-3">{t('role')}</th>
                            <th className="px-6 py-3">{t('status')}</th>
                            <th className="px-6 py-3 text-right">{t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                        {profiles.map((profile) => (
                            <tr key={profile.id} className="hover:bg-neutral-800/50 transition-colors">
                                <td className="px-6 py-4 font-medium text-white">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400">
                                            <User className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <div className="font-medium">{profile.full_name || 'Unknown'}</div>
                                            <div className="text-xs text-neutral-500 font-mono">{profile.id.slice(0, 8)}...</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <select
                                        value={profile.role}
                                        onChange={(e) => handleRoleChange(profile.id, e.target.value as 'admin' | 'user' | 'manager')}
                                        disabled={loading === profile.id}
                                        className="bg-transparent border-none text-sm focus:ring-0 cursor-pointer hover:text-white"
                                    >
                                        <option value="user">User</option>
                                        <option value="manager">Manager</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium ${profile.status === 'approved'
                                        ? 'bg-green-900/20 text-green-400'
                                        : profile.status === 'pending'
                                            ? 'bg-yellow-900/20 text-yellow-400'
                                            : 'bg-red-900/20 text-red-400'
                                        }`}>
                                        {profile.status === 'approved' && <Check className="h-3 w-3" />}
                                        {profile.status === 'pending' && <Clock className="h-3 w-3" />}
                                        {profile.status === 'rejected' && <X className="h-3 w-3" />}
                                        {t(`statuses.${profile.status}`)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        {profile.status === 'pending' && (
                                            <>
                                                <button
                                                    onClick={() => handleStatusChange(profile.id, 'approved')}
                                                    disabled={loading === profile.id}
                                                    className="p-2 rounded-lg bg-green-900/20 text-green-400 hover:bg-green-900/40 transition-colors cursor-pointer"
                                                    title={t('approve')}
                                                >
                                                    <Check className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleStatusChange(profile.id, 'rejected')}
                                                    disabled={loading === profile.id}
                                                    className="p-2 rounded-lg bg-red-900/20 text-red-400 hover:bg-red-900/40 transition-colors cursor-pointer"
                                                    title={t('reject')}
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </>
                                        )}
                                        <button
                                            onClick={() => handleDelete(profile.id)}
                                            disabled={loading === profile.id}
                                            className="p-2 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-red-400 transition-colors cursor-pointer"
                                            title={t('delete')}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
