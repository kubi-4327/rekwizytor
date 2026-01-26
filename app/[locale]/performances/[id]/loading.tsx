import { Skeleton } from "@/components/ui/Skeleton"

export default function Loading() {
    return (
        <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
            {/* Header Container */}
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 md:p-6 shadow-xl">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                    {/* Poster */}
                    <Skeleton className="h-48 w-32 shrink-0 rounded-lg" />

                    {/* Info */}
                    <div className="flex-1 min-w-0 w-full space-y-4">
                        <div className="flex flex-col lg:flex-row justify-between gap-4">
                            <div className="space-y-3">
                                <Skeleton className="h-10 w-3/4 max-w-md" />
                                <div className="flex gap-3">
                                    <Skeleton className="h-6 w-24 rounded-full" />
                                    <Skeleton className="h-6 w-32 rounded-md" />
                                    <Skeleton className="h-6 w-24 rounded-md" />
                                </div>
                            </div>
                            <div className="flex gap-3 w-full md:w-auto">
                                <Skeleton className="h-10 w-full md:w-32 rounded-lg" />
                                <Skeleton className="h-10 w-full md:w-24 rounded-lg" />
                            </div>
                        </div>
                        <Skeleton className="h-16 w-full max-w-2xl" />
                    </div>
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid gap-6 lg:grid-cols-3 items-start">

                {/* Left Column */}
                <div className="lg:col-span-1 space-y-8">
                    {/* Scheduled Shows */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <Skeleton className="h-6 w-32" />
                            <Skeleton className="h-8 w-8 rounded-lg" />
                        </div>
                        <div className="space-y-3">
                            <Skeleton className="h-24 w-full rounded-xl" />
                            <Skeleton className="h-24 w-full rounded-xl" />
                            <Skeleton className="h-24 w-full rounded-xl" />
                        </div>
                    </div>

                    {/* Notes Preview */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <Skeleton className="h-6 w-24" />
                            <Skeleton className="h-4 w-16" />
                        </div>
                        <Skeleton className="h-32 w-full rounded-xl" />
                    </div>
                </div>

                {/* Right Column */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Scene Breakdown */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <Skeleton className="h-6 w-40" />
                            <Skeleton className="h-4 w-4" />
                        </div>
                        <Skeleton className="h-64 w-full rounded-xl" />
                    </div>

                    {/* All Items */}
                    <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl overflow-hidden p-6 space-y-6">
                        <Skeleton className="h-6 w-48" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Skeleton className="h-32 w-full rounded-xl border border-dashed border-neutral-800" />
                            <Skeleton className="h-32 w-full rounded-xl border border-dashed border-neutral-800" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
