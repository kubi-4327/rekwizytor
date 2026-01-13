'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import {
    RefreshCw,
    Loader2,
    CheckCircle,
    XCircle,
    AlertCircle,
    Trash2,
    Play,
    Sparkles
} from 'lucide-react'
import {
    getRegenerationJobs,
    getRegenerationJob,
    createRegenerationJob,
    abortRegenerationJob,
    deleteRegenerationJob,
    type RegenerationJob
} from '@/app/actions/embedding-regeneration'
import { notify } from '@/utils/notify'

export default function EmbeddingRegenerationPage() {
    const [jobs, setJobs] = useState<RegenerationJob[]>([])
    const [currentJob, setCurrentJob] = useState<RegenerationJob | null>(null)
    const [loading, setLoading] = useState(false)

    // Configuration state
    const [config, setConfig] = useState({
        embedding_model: 'gemini-text-embedding-004',
        enrichment_model: 'gemini-2.0-flash-exp',
        use_sample_groups: false
    })

    // Load jobs on mount
    useEffect(() => {
        loadJobs()
    }, [])

    // Auto-refresh current job if running
    useEffect(() => {
        if (!currentJob || currentJob.status !== 'running') return

        const interval = setInterval(async () => {
            const updated = await getRegenerationJob(currentJob.id)
            if (updated) {
                setCurrentJob(updated)

                // Update in jobs list too
                setJobs(prev => prev.map(j => j.id === updated.id ? updated : j))

                // Stop polling if completed
                if (updated.status !== 'running') {
                    clearInterval(interval)
                }
            }
        }, 2000)

        return () => clearInterval(interval)
    }, [currentJob])

    const loadJobs = async () => {
        const fetchedJobs = await getRegenerationJobs()
        setJobs(fetchedJobs)

        // Auto-select first running job
        const runningJob = fetchedJobs.find(j => j.status === 'running')
        if (runningJob && !currentJob) {
            setCurrentJob(runningJob)
        }
    }

    const handleStartRegeneration = async () => {
        setLoading(true)
        try {
            const result = await createRegenerationJob(config)

            if (result.success && result.jobId) {
                notify.success('Regeneracja uruchomiona')
                await loadJobs()

                // Load and set as current job
                const job = await getRegenerationJob(result.jobId)
                setCurrentJob(job)
            } else {
                notify.error(result.error || 'Błąd podczas uruchamiania regeneracji')
            }
        } catch (error) {
            notify.error('Nieoczekiwany błąd')
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleAbortJob = async (jobId: string) => {
        if (!confirm('Czy na pewno chcesz przerwać regenerację?')) return

        setLoading(true)
        try {
            const result = await abortRegenerationJob(jobId)

            if (result.success) {
                notify.success('Regeneracja przerwana')
                await loadJobs()
                if (currentJob?.id === jobId) {
                    const updated = await getRegenerationJob(jobId)
                    setCurrentJob(updated)
                }
            } else {
                notify.error(result.error || 'Błąd podczas przerywania')
            }
        } catch (error) {
            notify.error('Nieoczekiwany błąd')
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteJob = async (jobId: string) => {
        if (!confirm('Czy na pewno chcesz usunąć to zadanie?')) return

        setLoading(true)
        try {
            const result = await deleteRegenerationJob(jobId)

            if (result.success) {
                notify.success('Zadanie usunięte')
                await loadJobs()
                if (currentJob?.id === jobId) {
                    setCurrentJob(null)
                }
            } else {
                notify.error('Błąd podczas usuwania')
            }
        } catch (error) {
            notify.error('Nieoczekiwany błąd')
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const getStatusColor = (status: RegenerationJob['status']) => {
        switch (status) {
            case 'completed':
                return 'default'
            case 'running':
                return 'secondary'
            case 'failed':
                return 'destructive'
            case 'aborted':
                return 'outline'
            default:
                return 'outline'
        }
    }

    const getStatusIcon = (status: RegenerationJob['status']) => {
        switch (status) {
            case 'completed':
                return <CheckCircle className="w-4 h-4" />
            case 'running':
                return <Loader2 className="w-4 h-4 animate-spin" />
            case 'failed':
                return <XCircle className="w-4 h-4" />
            case 'aborted':
                return <AlertCircle className="w-4 h-4" />
            default:
                return <AlertCircle className="w-4 h-4" />
        }
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Regeneracja Embeddingów</h1>
                    <p className="text-gray-400 mt-1">
                        Wygeneruj ponownie embeddingi dla grup używając wybranych modeli
                    </p>
                </div>
            </div>

            {/* Configuration */}
            <Card>
                <CardHeader>
                    <CardTitle>Nowa Regeneracja</CardTitle>
                    <CardDescription>
                        Skonfiguruj modele i uruchom proces regeneracji embeddingów
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Model Embeddingowy</Label>
                            <Select
                                value={config.embedding_model}
                                onValueChange={(value) => setConfig({ ...config, embedding_model: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="gemini-text-embedding-004">
                                        Google Text Embedding 004
                                    </SelectItem>
                                    <SelectItem value="mistral-embed">
                                        Mistral Embed
                                    </SelectItem>
                                    <SelectItem value="text-embedding-3-large">
                                        OpenAI Text Embedding 3 Large
                                    </SelectItem>
                                    <SelectItem value="text-embedding-3-small">
                                        OpenAI Text Embedding 3 Small
                                    </SelectItem>
                                    <SelectItem value="voyage-3.5-lite">
                                        Voyage AI 3.5 Lite
                                    </SelectItem>
                                    <SelectItem value="voyage-3.5">
                                        Voyage AI 3.5
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Model Wzbogacania (Enrichment)</Label>
                            <Select
                                value={config.enrichment_model}
                                onValueChange={(value) => setConfig({ ...config, enrichment_model: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="gemini-2.0-flash-exp">
                                        Gemini 2.0 Flash (Experimental)
                                    </SelectItem>
                                    <SelectItem value="gemini-1.5-flash">
                                        Gemini 1.5 Flash
                                    </SelectItem>
                                    <SelectItem value="gpt-4o">
                                        GPT-4o
                                    </SelectItem>
                                    <SelectItem value="gpt-4o-mini">
                                        GPT-4o Mini
                                    </SelectItem>
                                    <SelectItem value="mistral-large-latest">
                                        Mistral Large
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="sample"
                            checked={config.use_sample_groups}
                            onChange={(e) => setConfig({ ...config, use_sample_groups: e.target.checked })}
                            className="rounded"
                        />
                        <Label htmlFor="sample">Użyj próbki 50 grup (szybsze testowanie)</Label>
                    </div>

                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Ta operacja nadpisze istniejące embeddingi. Użyj tylko gdy chcesz przetestować inny model embeddingowy.
                        </AlertDescription>
                    </Alert>

                    <Button
                        onClick={handleStartRegeneration}
                        disabled={loading}
                        className="w-full"
                        size="lg"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Uruchamianie...
                            </>
                        ) : (
                            <>
                                <Play className="w-4 h-4 mr-2" />
                                Rozpocznij Regenerację
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* Live Monitor */}
            {currentJob && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    Live Monitor
                                    {currentJob.status === 'running' && (
                                        <span className="text-blue-400 text-xs">🔄 Odświeżanie co 2s</span>
                                    )}
                                </CardTitle>
                                <CardDescription>
                                    {config.embedding_model} + {config.enrichment_model}
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={async () => {
                                        const updated = await getRegenerationJob(currentJob.id)
                                        setCurrentJob(updated)
                                    }}
                                >
                                    <RefreshCw className="w-4 h-4" />
                                </Button>
                                {currentJob.status === 'running' && (
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleAbortJob(currentJob.id)}
                                        disabled={loading}
                                    >
                                        <XCircle className="w-4 h-4 mr-1" />
                                        Przerwij
                                    </Button>
                                )}
                                <Badge variant={getStatusColor(currentJob.status)}>
                                    {getStatusIcon(currentJob.status)}
                                    <span className="ml-1">{currentJob.status}</span>
                                </Badge>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Progress */}
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span>Postęp</span>
                                <span>{currentJob.processed_groups} / {currentJob.total_groups} ({((currentJob.processed_groups / currentJob.total_groups) * 100).toFixed(1)}%)</span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2">
                                <div
                                    className="bg-blue-500 h-2 rounded-full transition-all"
                                    style={{
                                        width: `${(currentJob.processed_groups / currentJob.total_groups) * 100}%`
                                    }}
                                />
                            </div>
                        </div>

                        {/* Current Group & Enrichment */}
                        {currentJob.current_group_name && currentJob.current_enrichment && (
                            <Card className="bg-gray-800/50 border-blue-500/30">
                                <CardContent className="pt-4">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-lg font-semibold">
                                            <Sparkles className="w-5 h-5 text-blue-400" />
                                            <span>Aktualnie: "{currentJob.current_group_name}"</span>
                                        </div>
                                        <div className="pl-7 space-y-2 text-sm">
                                            <div>
                                                <span className="text-gray-400">├─ Identity:</span>
                                                <span className="ml-2 text-blue-300">{currentJob.current_enrichment.identity}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-400">├─ Physical:</span>
                                                <span className="ml-2 text-green-300">{currentJob.current_enrichment.physical}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-400">└─ Context:</span>
                                                <span className="ml-2 text-purple-300">{currentJob.current_enrichment.context}</span>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-4 border-t pt-4">
                            <div>
                                <p className="text-sm text-gray-400">Tokeny</p>
                                <p className="text-xl font-bold">
                                    {currentJob.total_tokens.toLocaleString()}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-400">Błędy</p>
                                <p className="text-xl font-bold text-red-400">
                                    {currentJob.failed_groups.length}
                                </p>
                            </div>
                        </div>

                        {/* Failed Groups */}
                        {currentJob.failed_groups.length > 0 && (
                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    <div className="font-semibold mb-2">Błędy regeneracji ({currentJob.failed_groups.length}):</div>
                                    <ul className="text-xs space-y-1 max-h-32 overflow-y-auto">
                                        {currentJob.failed_groups.map((failed, idx) => (
                                            <li key={idx}>
                                                • {failed.group_name}: {failed.error}
                                            </li>
                                        ))}
                                    </ul>
                                </AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Jobs History */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Historia Regeneracji</CardTitle>
                            <CardDescription>
                                Wszystkie zadania regeneracji embeddingów
                            </CardDescription>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={loadJobs}
                        >
                            <RefreshCw className="w-4 h-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {jobs.length === 0 ? (
                        <div className="py-12 text-center text-gray-400">
                            <RefreshCw className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>Brak zadań regeneracji. Utwórz pierwsze zadanie powyżej.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {jobs.map((job) => (
                                <div
                                    key={job.id}
                                    className={`flex items-center justify-between p-4 border rounded-lg hover:bg-gray-800/50 transition-colors cursor-pointer ${currentJob?.id === job.id ? 'border-blue-500 bg-gray-800/30' : ''
                                        }`}
                                    onClick={() => setCurrentJob(job)}
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge variant={getStatusColor(job.status)}>
                                                {getStatusIcon(job.status)}
                                                <span className="ml-1">{job.status}</span>
                                            </Badge>
                                            <span className="text-sm text-gray-400">
                                                {job.embedding_model} + {job.enrichment_model}
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {new Date(job.created_at).toLocaleString('pl-PL')} •
                                            {job.processed_groups}/{job.total_groups} grup •
                                            {job.total_tokens.toLocaleString()} tokenów
                                            {job.failed_groups.length > 0 && (
                                                <span className="text-red-400 ml-2">
                                                    • {job.failed_groups.length} błędów
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleDeleteJob(job.id)
                                        }}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
