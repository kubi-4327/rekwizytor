import { CreatePerformanceForm } from '@/components/performances/CreatePerformanceForm'
import { getTranslations } from 'next-intl/server'

export default async function NewPerformancePage() {
    const t = await getTranslations('NewPerformance')
    return (
        <div className="p-6 md:p-10 mx-auto w-full">
            <CreatePerformanceForm />
        </div>
    )
}
