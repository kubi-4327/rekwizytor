'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Check, X, User, Clock, AlertCircle, Mail, Calendar } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { approveUser } from '@/app/actions/admin/approve-user'
import { format } from 'date-fns'

interface Profile {
    id: string
    full_name: string | null
    role: 'admin' | 'user' | 'manager'
    status: 'pending' | 'approved' | 'rejected'
    created_at?: string
    email?: string | null
}

export function UserApprovalList() {
    const t = useTranslations('Settings.UserApproval')
    const [pendingUsers, setPendingUsers] = useState<Profile[]>([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [confirmAction, setConfirmAction] = useState<{ id: string, type: 'approve' | 'reject', user: Profile } | null>(null)
    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        fetchPendingUsers()
    }, [])

    const fetchPendingUsers = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('status', 'pending')
                .order('created_at', { ascending: false })

            if (error) throw error

            const typedData: Profile[] = (data || []).map(p => ({
                ...p,
                role: (p.role as 'admin' | 'user' | 'manager') || 'user',
                status: (p.status as 'pending' | 'approved' | 'rejected') || 'pending',
                created_at: p.created_at ?? undefined
            }))

            setPendingUsers(typedData)
        } catch (error) {
            console.error('Error fetching pending users:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleStatusChange = async () => {
        if (!confirmAction) return

        const { id, type } = confirmAction
        setActionLoading(id)
        setConfirmAction(null)

        const result = await approveUser(id, type === 'approve' ? 'approved' : 'rejected')

        if (result.success) {
            setPendingUsers(pendingUsers.filter(p => p.id !== id))
            router.refresh()
        } else {
            console.error('Failed to update status:', result.error)
            alert(t('errorUpdating'))
        }
        setActionLoading(null)
    }

    if (loading) {
        return <div className="animate-pulse h-20 bg-neutral-900/50 rounded-lg"></div>
    }

    if (pendingUsers.length === 0) {
        return null
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 text-yellow-500">
                <AlertCircle className="h-5 w-5" />
                <div className="text-lg font-medium text-white font-sans!">{t('title')}</div>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden">
                <div className="divide-y divide-neutral-800">
                    {pendingUsers.map((user) => (
                        <div key={user.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-neutral-800/50 transition-colors">
                            <div className="flex items-start gap-3">
                                <div className="h-10 w-10 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 shrink-0">
                                    <User className="h-5 w-5" />
                                </div>
                                <div className="space-y-1">
                                    <div className="font-medium text-white">{user.full_name || t('unknownUser')}</div>
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-neutral-500">
                                        <div className="flex items-center gap-1.5">
                                            <Mail className="w-3 h-3" />
                                            <span className="font-mono">{user.email || user.id.slice(0, 8)}</span>
                                        </div>
                                        {user.created_at && (
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="w-3 h-3" />
                                                <span>{format(new Date(user.created_at), 'PPP p')}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2 self-end sm:self-center">
                                <button
                                    onClick={() => setConfirmAction({ id: user.id, type: 'approve', user })}
                                    disabled={!!actionLoading}
                                    className="p-2 rounded-lg bg-green-900/20 text-green-400 hover:bg-green-900/40 transition-colors disabled:opacity-50"
                                    title={t('approve')}
                                >
                                    <Check className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => setConfirmAction({ id: user.id, type: 'reject', user })}
                                    disabled={!!actionLoading}
                                    className="p-2 rounded-lg bg-red-900/20 text-red-400 hover:bg-red-900/40 transition-colors disabled:opacity-50"
                                    title={t('reject')}
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Confirmation Modal */}
            {confirmAction && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-8 max-w-lg w-full space-y-6 shadow-2xl relative overflow-hidden">
                        {/* Red glow for approval to signify risk */}
                        {confirmAction.type === 'approve' && (
                            <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-red-500 via-orange-500 to-red-500" />
                        )}

                        <div>
                            <h3 className="text-2xl font-bold text-white mb-2">
                                {confirmAction.type === 'approve' ? t('confirmApproveTitle') : t('confirmRejectTitle')}
                            </h3>
                            <p className="text-neutral-400 leading-relaxed">
                                {confirmAction.type === 'approve'
                                    ? t('confirmApproveDesc', { name: confirmAction.user.full_name || confirmAction.user.email || 'User' })
                                    : t('confirmRejectDesc', { name: confirmAction.user.full_name || confirmAction.user.email || 'User' })
                                }
                            </p>
                        </div>

                        {confirmAction.type === 'approve' && (
                            <div className="space-y-4">
                                <div className="bg-red-950/30 border border-red-900/50 p-4 rounded-xl">
                                    <div className="flex gap-3">
                                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                        <div className="space-y-1">
                                            <p className="font-bold text-red-400 text-sm uppercase tracking-wide">{t('securityWarningTitle')}</p>
                                            <p className="text-red-300/80 text-sm leading-relaxed">
                                                {t('securityWarningDesc')}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-neutral-900/50 p-4 rounded-xl border border-neutral-800">
                                    <p className="font-medium text-white mb-2 text-sm">{t('accessGrant')}:</p>
                                    <ul className="space-y-2">
                                        <li className="flex items-center gap-2 text-sm text-neutral-400">
                                            <div className="w-1.5 h-1.5 rounded-full bg-neutral-600" />
                                            {t('accessInventory')}
                                        </li>
                                        <li className="flex items-center gap-2 text-sm text-neutral-400">
                                            <div className="w-1.5 h-1.5 rounded-full bg-neutral-600" />
                                            {t('accessPerformances')}
                                        </li>
                                        <li className="flex items-center gap-2 text-sm text-neutral-400">
                                            <div className="w-1.5 h-1.5 rounded-full bg-neutral-600" />
                                            {t('accessChecklists')}
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        )}

                        {confirmAction.type === 'reject' && (
                            <div className="bg-red-900/20 border border-red-900/50 p-4 rounded-xl text-sm text-red-300 flex gap-3 items-start">
                                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                <p className="leading-relaxed">{t('rejectWarning')}</p>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                onClick={() => setConfirmAction(null)}
                                className="px-5 py-2.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors font-medium"
                            >
                                {t('cancel')}
                            </button>
                            <button
                                onClick={handleStatusChange}
                                className={`px-5 py-2.5 rounded-lg font-bold text-white transition-all shadow-lg ${confirmAction.type === 'approve'
                                    ? 'bg-red-600 hover:bg-red-500 shadow-red-900/20'
                                    : 'bg-neutral-700 hover:bg-neutral-600'
                                    }`}
                            >
                                {t('confirm')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
