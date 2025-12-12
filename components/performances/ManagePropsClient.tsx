'use client'

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import type { ManagePropsFormProps } from '@/components/performances/ManagePropsForm'

const ManagePropsForm = dynamic(
    () => import('@/components/performances/ManagePropsForm').then((mod) => mod.ManagePropsForm),
    {
        ssr: false,
        loading: () => (
            <div className="p-10 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-neutral-500" />
            </div>
        )
    }
)

export function ManagePropsClient(props: ManagePropsFormProps) {
    return <ManagePropsForm {...props} />
}
