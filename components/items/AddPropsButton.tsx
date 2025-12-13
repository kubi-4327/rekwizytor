'use client'

import { Plus, Sparkles, PenLine } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { DropdownAction } from '@/components/ui/DropdownAction'

export function AddPropsButton() {
    const t = useTranslations('AddPropsButton')

    return (
        <DropdownAction
            label={t('addItem')}
            variant="primary"
            icon={<Plus className="h-4 w-4" />}
            className="sm:min-w-[140px]"
            items={[
                {
                    label: t('fastAdd'),
                    icon: <Sparkles className="h-4 w-4 text-ai-primary" />,
                    href: '/items/fast-add',
                },
                {
                    label: t('manualAdd'),
                    icon: <PenLine className="h-4 w-4 text-neutral-400" />,
                    href: '/items/new',
                }
            ]}
        />
    )
}
