import { Skeleton } from "@/components/ui/Skeleton"

export default function Loading() {
    return (
        <div className="p-4 md:p-10 space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <Skeleton className="h-8 w-32 mb-2" />
                    <Skeleton className="h-4 w-48" />
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-10 w-32" />
                </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="aspect-square rounded-lg bg-neutral-900 border border-neutral-800 p-4 space-y-3">
                        <Skeleton className="h-full w-full rounded-md" />
                    </div>
                ))}
            </div>
        </div>
    )
}
