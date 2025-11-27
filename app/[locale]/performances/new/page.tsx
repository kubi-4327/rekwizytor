import { CreatePerformanceForm } from '@/components/performances/CreatePerformanceForm'
import { getTranslations } from 'next-intl/server'

export default async function NewPerformancePage() {
    const t = await getTranslations('NewPerformance')
    return (
        <div className="p-6 md:p-10 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
                <p className="text-neutral-400 text-sm mt-1">
                    {t('subtitle')}
                </p>
            </div>

            <CreatePerformanceForm />
        </div>
    )
}
