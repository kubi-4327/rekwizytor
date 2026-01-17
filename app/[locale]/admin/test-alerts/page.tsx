'use client'

import { PageHeader } from '@/components/ui/PageHeader'
import { TestTube, CheckCircle2, XCircle, Info, Loader2, Play, AlertTriangle, FileText, Save, Download, FileSpreadsheet, Share } from 'lucide-react'
import { notify } from '@/utils/notify'
import { Button } from '@/components/ui/Button'
import { useState } from 'react'

export default function TestAlertsPage() {
    const [isLoadingSequence, setIsLoadingSequence] = useState(false)

    const handleSuccess = () => notify.success('Operation completed successfully!')
    const handleError = () => notify.error('Something went wrong. Please try again.')
    const handleInfo = () => notify.info('This is an informational message.')

    const handlePromiseResolve = () => {
        const promise = new Promise((resolve) => setTimeout(resolve, 2000))
        notify.promise(promise, {
            loading: 'Processing request...',
            success: 'Request finished successfully!',
            error: 'Request failed.'
        })
    }

    const handlePromiseReject = () => {
        const promise = new Promise((_, reject) => setTimeout(() => reject(new Error('Simulated error')), 2000))
        notify.promise(promise, {
            loading: 'Processing critical data...',
            success: 'This should not appear.',
            error: 'Request failed as expected.'
        })
    }

    const handleLoadingSequence = async () => {
        if (isLoadingSequence) return
        setIsLoadingSequence(true)

        try {
            const toastId = notify.loading('Step 1: Initializing...')
            await new Promise(r => setTimeout(r, 1500))

            notify.loading('Step 2: Processing data...')
            await new Promise(r => setTimeout(r, 1500))

            notify.dismiss(toastId)
            notify.success('Complex sequence completed!')
        } finally {
            setIsLoadingSequence(false)
        }
    }

    const handleLongText = () => {
        notify.info('This is a very long text to test how the notification component handles multiple lines of text. usage of really long words like Pneumonoultramicroscopicsilicovolcanoconiosis might break layout if not handled correctly.')
    }

    const handlePDF = () => notify.pdf('Generating PDF Report...')
    const handleSaving = () => notify.saving('Saving changes to database...')
    const handleDownload = () => notify.download('Downloading file (25MB)...')
    const handleExcel = () => notify.excel('Exporting to Excel...')
    const handleExport = () => notify.export('Exporting data...')

    const handleProcessing = () => {
        const id = notify.processing('Processing large dataset...')
        setTimeout(() => {
            notify.dismiss(id)
            notify.success('Dataset processed!')
        }, 3000)
    }

    return (
        <div className="p-4 md:p-10 space-y-8 max-w-7xl mx-auto text-white">
            <PageHeader
                title="Alert System Test Lab"
                subtitle="Validate system notifications and toast behaviors"
                icon={<TestTube className="w-6 h-6 text-yellow-400" />}
                iconColor="text-yellow-400"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Standard Notifications */}
                <section className="bg-neutral-900 rounded-xl p-6 border border-neutral-800 space-y-6">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        Standard Notifications
                    </h3>
                    <div className="space-y-4">
                        <div className="flex flex-col gap-3">
                            <Button
                                onClick={handleSuccess}
                                className="w-full justify-start bg-emerald-900/20 hover:bg-emerald-900/40 text-emerald-400 border border-emerald-900/50"
                            >
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Trigger Success
                            </Button>
                            <Button
                                onClick={handleError}
                                className="w-full justify-start bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/50"
                            >
                                <XCircle className="w-4 h-4 mr-2" />
                                Trigger Error
                            </Button>
                            <Button
                                onClick={handleInfo}
                                className="w-full justify-start bg-blue-900/20 hover:bg-blue-900/40 text-blue-400 border border-blue-900/50"
                            >
                                <Info className="w-4 h-4 mr-2" />
                                Trigger Info
                            </Button>
                        </div>
                        <p className="text-xs text-neutral-500">
                            Standard alerts used for immediate feedback.
                        </p>
                    </div>
                </section>

                {/* Async Operations */}
                <section className="bg-neutral-900 rounded-xl p-6 border border-neutral-800 space-y-6">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Loader2 className="w-5 h-5 text-blue-400" />
                        Async Patterns
                    </h3>
                    <div className="space-y-4">
                        <div className="flex flex-col gap-3">
                            <Button
                                onClick={handlePromiseResolve}
                                variant="secondary"
                                className="w-full justify-start"
                            >
                                <Play className="w-4 h-4 mr-2" />
                                Promise (Resolve 2s)
                            </Button>
                            <Button
                                onClick={handlePromiseReject}
                                variant="secondary"
                                className="w-full justify-start"
                            >
                                <AlertTriangle className="w-4 h-4 mr-2" />
                                Promise (Reject 2s)
                            </Button>
                            <Button
                                onClick={handleLoadingSequence}
                                disabled={isLoadingSequence}
                                variant="secondary"
                                className="w-full justify-start"
                            >
                                <Loader2 className={`w-4 h-4 mr-2 ${isLoadingSequence ? 'animate-spin' : ''}`} />
                                Manual Loading Sequence
                            </Button>
                        </div>
                        <p className="text-xs text-neutral-500">
                            Tests for Promise-based toasts and manual loading states.
                        </p>
                    </div>
                </section>
                {/* Feature Specific Triggers */}
                <section className="bg-neutral-900 rounded-xl p-6 border border-neutral-800 space-y-6">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <FileText className="w-5 h-5 text-purple-400" />
                        Feature Triggers
                    </h3>
                    <div className="space-y-4">
                        <div className="flex flex-col gap-3">
                            <Button
                                onClick={handlePDF}
                                className="w-full justify-start bg-neutral-800 hover:bg-neutral-700 text-red-400 border border-neutral-700"
                            >
                                <FileText className="w-4 h-4 mr-2" />
                                Generate PDF
                            </Button>
                            <Button
                                onClick={handleSaving}
                                className="w-full justify-start bg-neutral-800 hover:bg-neutral-700 text-blue-400 border border-neutral-700"
                            >
                                <Save className="w-4 h-4 mr-2" />
                                Save Changes
                            </Button>
                            <Button
                                onClick={handleDownload}
                                className="w-full justify-start bg-neutral-800 hover:bg-neutral-700 text-emerald-400 border border-neutral-700"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Download File
                            </Button>
                            <Button
                                onClick={handleExcel}
                                className="w-full justify-start bg-neutral-800 hover:bg-neutral-700 text-green-500 border border-neutral-700"
                            >
                                <FileSpreadsheet className="w-4 h-4 mr-2" />
                                Export Excel
                            </Button>
                            <Button
                                onClick={handleExport}
                                className="w-full justify-start bg-neutral-800 hover:bg-neutral-700 text-cyan-400 border border-neutral-700"
                            >
                                <Share className="w-4 h-4 mr-2" />
                                General Export
                            </Button>
                            <Button
                                onClick={handleProcessing}
                                className="w-full justify-start bg-neutral-800 hover:bg-neutral-700 text-purple-400 border border-neutral-700"
                            >
                                {/* We reuse Loader2 locally for the button icon, but the toast will utilize the custom ping dot */}
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Show Processing State (3s)
                            </Button>
                        </div>
                        <p className="text-xs text-neutral-500">
                            Custom styled alerts for specific application features.
                        </p>
                    </div>
                </section>

                {/* Layout & Edge Cases */}
                <section className="bg-neutral-900 rounded-xl p-6 border border-neutral-800 space-y-6 md:col-span-2">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-orange-400" />
                        Edge Cases
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Button
                            onClick={handleLongText}
                            variant="secondary"
                            className="bg-neutral-800 hover:bg-neutral-700"
                        >
                            Test Long Content Overflow
                        </Button>
                        <Button
                            onClick={() => notify.dismissAll()}
                            variant="destructive"
                            className="bg-red-900/20 text-red-400 hover:bg-red-900/40 border border-red-900/50"
                        >
                            Dismiss All Toasts
                        </Button>
                    </div>
                </section>
            </div>
        </div>
    )
}
