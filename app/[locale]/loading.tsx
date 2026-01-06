import { Skeleton } from "@/components/ui/Skeleton"

// TODO: Dostosować skeleton do aktualnego layoutu dashboardu
// Wizualia będą dostosowane później przez osobny zespół

export default function Loading() {
    return (
        <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
            {/* Greeting skeleton */}
            <div className="space-y-2">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-5 w-48" />
            </div>

            <div className="grid gap-6 lg:grid-cols-12">
                {/* Main Column */}
                <div className="lg:col-span-8 space-y-6">
                    {/* NearestPerformanceCard skeleton */}
                    <Skeleton className="h-48 w-full rounded-xl" />

                    {/* Two cards grid */}
                    <div className="grid gap-6 md:grid-cols-2">
                        <Skeleton className="h-40 w-full rounded-xl" />
                        <Skeleton className="h-40 w-full rounded-xl" />
                    </div>

                    {/* QuickNav skeleton */}
                    <div className="space-y-4">
                        <Skeleton className="h-6 w-32" />
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} className="h-24 rounded-lg" />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Sidebar Column */}
                <div className="lg:col-span-4 space-y-6">
                    {/* InventoryStats skeleton */}
                    <Skeleton className="h-32 w-full rounded-xl" />

                    {/* UserMentionsList skeleton */}
                    <div className="space-y-3">
                        <Skeleton className="h-6 w-40" />
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-16 w-full rounded-lg" />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
