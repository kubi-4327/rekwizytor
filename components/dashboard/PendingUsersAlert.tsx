'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { AlertCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

export function PendingUsersAlert() {
    const [pendingCount, setPendingCount] = useState(0)
    const [loading, setLoading] = useState(true)
    const supabase = createClient()
    const t = useTranslations('Dashboard.PendingAlert')

    useEffect(() => {
        checkPendingUsers()
    }, [])

    const checkPendingUsers = async () => {
        try {
            const { count, error } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending')

            if (error) throw error
            setPendingCount(count || 0)
        } catch (error) {
            console.error('Error checking pending users:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading || pendingCount === 0) return null

    return (
        <div className="mb-8">
            <Link
                href="/settings"
                className="block group relative overflow-hidden rounded-xl border border-yellow-500/50 bg-yellow-500/10 p-4 hover:bg-yellow-500/20 transition-all shadow-[0_0_15px_rgba(234,179,8,0.1)] hover:shadow-[0_0_25px_rgba(234,179,8,0.2)]"
            >
                <div className="absolute inset-0 bg-yellow-500/5 animate-pulse" />
                <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="rounded-full bg-yellow-500/20 p-2 text-yellow-500 animate-[pulse_2s_ease-in-out_infinite]">
                            <AlertCircle className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="font-medium text-yellow-500 text-lg">
                                {t('title')}
                            </h3>
                            <p className="text-yellow-200/70 text-sm">
                                {t('message', { count: pendingCount })}
                            </p>
                        </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-yellow-500/50 group-hover:text-yellow-500 transition-colors" />
                </div>
            </Link>
        </div>
    )
}
