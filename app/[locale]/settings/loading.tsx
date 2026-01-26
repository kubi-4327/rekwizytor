import { Skeleton } from "@/components/ui/Skeleton"

export default function Loading() {
    return (
        <div className="p-4 md:p-10 space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="space-y-2 mb-8">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-4 w-64" />
            </div>

            {/* Content Grid */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Account Section - typically taller */}
                <div className="space-y-4 p-6 rounded-xl border border-neutral-800 bg-neutral-900/50">
                    <Skeleton className="h-6 w-32 mb-6" />
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-10 w-full rounded-lg" />
                        </div>
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-10 w-full rounded-lg" />
                        </div>
                    </div>
                </div>

                {/* Appearance Section */}
                <div className="space-y-4 p-6 rounded-xl border border-neutral-800 bg-neutral-900/50">
                    <Skeleton className="h-6 w-32 mb-6" />
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-10 w-32 rounded-lg" />
                        </div>
                        <div className="flex justify-between items-center">
                            <div className="space-y-1">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-3 w-40" />
                            </div>
                            <Skeleton className="h-6 w-10 rounded-full" />
                        </div>
                    </div>
                </div>

                {/* Management Section */}
                <div className="space-y-4 p-6 rounded-xl border border-neutral-800 bg-neutral-900/50">
                    <Skeleton className="h-6 w-32 mb-6" />
                    <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="flex justify-between items-center p-3 rounded-lg border border-white/5">
                                <div className="space-y-1">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-3 w-48" />
                                </div>
                                <Skeleton className="h-8 w-24 rounded-lg" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Security Section */}
                <div className="space-y-4 p-6 rounded-xl border border-neutral-800 bg-neutral-900/50">
                    <Skeleton className="h-6 w-40 mb-6" />
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <div className="space-y-1">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-48" />
                            </div>
                            <Skeleton className="h-9 w-32 rounded-lg" />
                        </div>
                        <div className="flex justify-between items-center pt-4 border-t border-white/5">
                            <div className="space-y-1">
                                <Skeleton className="h-4 w-16" />
                                <Skeleton className="h-3 w-32" />
                            </div>
                            <Skeleton className="h-9 w-24 rounded-lg" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
