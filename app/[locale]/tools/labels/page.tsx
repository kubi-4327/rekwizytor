import { LabelGeneratorForm } from '@/components/tools/LabelGeneratorForm'
import { getTranslations } from 'next-intl/server'

export const metadata = {
    title: 'Label Generator | Rekwizytor',
    description: 'Create standalone labels for props and sets',
}

export default async function LabelGeneratorPage() {
    return (
        <div className="min-h-screen bg-background py-10 px-4 md:px-8 flex flex-col items-center justify-center">
            <LabelGeneratorForm />
        </div>
    )
}
