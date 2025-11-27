import { Skeleton } from "@/components/ui/Skeleton"

export default function Loading() {
    return (
        <div className="p-4 md:p-10 space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <Skeleton className="h-8 w-48 mb-2" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-10 w-32" />
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden flex flex-col h-full">
                        <div className="relative h-48 w-full bg-neutral-800">
                            <Skeleton className="h-full w-full" />
                        </div>
                        <div className="p-5 flex flex-col flex-1 space-y-4">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Skeleton className="h-5 w-16 rounded-full" />
                                    <Skeleton className="h-4 w-24" />
                                </div>
                                <Skeleton className="h-7 w-3/4 mb-2" />
                                <Skeleton className="h-4 w-full" />
                            </div>
                            <div className="mt-auto pt-4 border-t border-neutral-800 flex gap-2">
                                <Skeleton className="h-9 flex-1 rounded-md" />
                                <Skeleton className="h-9 flex-1 rounded-md" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
