'use client'

import { useRouter } from 'next/navigation'
import { Database, Sparkles } from 'lucide-react'

export function EmbeddingMigrationButton() {
    const router = useRouter()

    return (
        <div className="bg-neutral-900 rounded-lg p-6 border border-neutral-800 h-full flex flex-col">
            <div className="flex items-start gap-4 flex-1">
                <div className="p-3 bg-purple-500/10 rounded-lg shrink-0">
                    <Sparkles className="h-6 w-6 text-purple-400" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-white mb-1">
                        Embedding Migration
                    </h3>
                    <p className="text-sm text-neutral-400 mb-4 leading-relaxed">
                        Generate AI embeddings for all entities (groups, locations, notes, items, performances) to enable semantic search.
                    </p>
                </div>
            </div>
            <button
                onClick={() => router.push('/admin/migrate-embeddings')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 mt-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium"
            >
                <Database className="h-4 w-4" />
                Open Migration Tool
            </button>
        </div>
    )
}
