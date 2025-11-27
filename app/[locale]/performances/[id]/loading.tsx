import { Skeleton } from "@/components/ui/Skeleton"

export default function Loading() {
    return (
        <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
            <div>
                <Skeleton className="h-4 w-24 mb-4" />
                <div className="flex flex-col md:flex-row gap-6 items-start">
                    <Skeleton className="h-48 w-32 shrink-0 rounded-lg" />
                    <div className="flex-1 min-w-0 space-y-4">
                        <Skeleton className="h-10 w-3/4" />
                        <div className="flex gap-3">
                            <Skeleton className="h-6 w-20 rounded-full" />
                            <Skeleton className="h-6 w-32" />
                        </div>
                        <Skeleton className="h-20 w-full" />
                    </div>
                </div>
            </div>
            <div className="grid gap-8 lg:grid-cols-3">
                <div className="lg:col-span-1 space-y-6">
                    <Skeleton className="h-8 w-40" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                </div>
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex justify-between">
                        <Skeleton className="h-8 w-32" />
                        <Skeleton className="h-8 w-24" />
                    </div>
                    <Skeleton className="h-96 w-full rounded-lg" />
                </div>
            </div>
        </div>
    )
}
