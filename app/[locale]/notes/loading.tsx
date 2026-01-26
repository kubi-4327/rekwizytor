import { Skeleton } from "@/components/ui/Skeleton"

export default function Loading() {
    return (
        <div className="p-4 md:p-10 space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-10 w-full md:w-[140px]" />
            </div>

            {/* Search */}
            <Skeleton className="h-12 w-full rounded-xl" />

            {/* Groups List */}
            <div className="space-y-4 pt-4">
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 py-3 border-b border-white/5 last:border-0">
                        <Skeleton className="h-8 w-8 rounded-md" /> {/* Chevron box */}
                        <Skeleton className="h-4 w-1 rounded-full" /> {/* Color indicator */}
                        <Skeleton className="h-4 w-48" /> {/* Title */}
                        <Skeleton className="h-5 w-8 rounded-full ml-auto" /> {/* Badge */}
                    </div>
                ))}
            </div>
        </div>
    )
}
