import { Skeleton } from "@/components/ui/Skeleton"

export default function Loading() {
    return (
        <div className="p-4 md:p-10 space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-9 w-24 rounded-lg" />
                    <Skeleton className="h-9 w-24 rounded-lg" />
                </div>
            </div>

            {/* Search + Action Bar */}
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row gap-3">
                    <Skeleton className="h-12 w-full rounded-xl" />
                    <Skeleton className="h-12 w-[100px] rounded-xl shrink-0" />
                </div>

                {/* Filter Chips */}
                <div className="flex gap-2 overflow-hidden pb-2">
                    {[...Array(8)].map((_, i) => (
                        <Skeleton key={i} className="h-8 w-32 rounded-full shrink-0" />
                    ))}
                </div>
            </div>

            {/* Content Group (Location) */}
            <div className="space-y-4">
                {/* Location Header */}
                <div className="flex items-center gap-2 mt-4 px-1">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-5 w-8 rounded-full ml-auto md:ml-2" />
                </div>

                {/* Groups Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-[72px] rounded-xl bg-neutral-900/40 border border-neutral-800 p-4 flex items-center gap-4">
                            <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                            <div className="space-y-2 w-full">
                                <Skeleton className="h-4 w-3/4" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Another Group (Location) */}
            <div className="space-y-4 mt-8">
                {/* Location Header */}
                <div className="flex items-center gap-2 mt-4 px-1">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-5 w-8 rounded-full ml-auto md:ml-2" />
                </div>

                {/* Groups Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="h-[72px] rounded-xl bg-neutral-900/40 border border-neutral-800 p-4 flex items-center gap-4">
                            <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                            <div className="space-y-2 w-full">
                                <Skeleton className="h-4 w-3/4" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
