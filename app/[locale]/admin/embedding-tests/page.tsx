'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Badge } from '@/components/ui/Badge'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import {
    Play,
    Square,
    RefreshCw,
    Download,
    Trash2,
    AlertCircle,
    CheckCircle,
    Loader2,
    Settings,
    BarChart3,
    XCircle,
    Pause,
    ListPlus,
    List
} from 'lucide-react'
import {
    getTestRuns,
    getTestRun,
    getTestResults,
    createTestRun,
    updateTestRunStatus,
    deleteTestRun,
    getExistingEmbeddingKeys,
    regenerateEmbeddings,
    getQueueState,
    addToQueue,
    removeFromQueue,
    clearQueue,
    startQueue,
    pauseQueue,
    stopQueue,
    processNextQueueItem,
    markQueueItemCompleted,
    type EmbeddingTestRun,
    type TestMetrics,
    type QueueItem,
    type QueueState
} from '@/app/actions/embedding-tests'
import { notify } from '@/utils/notify'

export default function EmbeddingTestsPage() {
    const [activeTab, setActiveTab] = useState('configure')
    const [testRuns, setTestRuns] = useState<EmbeddingTestRun[]>([])
    const [currentRun, setCurrentRun] = useState<EmbeddingTestRun | null>(null)
    const [currentMetrics, setCurrentMetrics] = useState<TestMetrics | null>(null)
    const [loading, setLoading] = useState(false)
    const [autoName, setAutoName] = useState(true)
    const [existingEmbeddings, setExistingEmbeddings] = useState<string[]>([])

    const PRESET_COMBINATIONS = [
        { enrichment: 'gemini-2.5-flash-lite', embedding: 'gemini-text-embedding-004', label: 'Gemini 2.5 Flash Lite + Gemini 004' },
        { enrichment: 'gemini-2.5-flash', embedding: 'gemini-text-embedding-004', label: 'Gemini 2.5 Flash + Gemini 004' },
        { enrichment: 'gpt-5-nano', embedding: 'gemini-text-embedding-004', label: 'GPT-5 Nano + Gemini 004' },
        { enrichment: 'gpt-5-mini', embedding: 'gemini-text-embedding-004', label: 'GPT-5 Mini + Gemini 004' },
        { enrichment: 'gpt-5-nano', embedding: 'text-embedding-3-small', label: 'GPT-5 Nano + OpenAI 3 Small' },
        { enrichment: 'gpt-4o-mini', embedding: 'text-embedding-3-small', label: 'GPT-4o Mini + OpenAI 3 Small' },
        { enrichment: 'gpt-4o', embedding: 'text-embedding-3-large', label: 'GPT-4o + OpenAI 3 Large' },
    ]

    const [embeddingConfig, setEmbeddingConfig] = useState({
        embedding_model: 'gemini-text-embedding-004',
        enrichment_model: 'gemini-2.5-flash-lite'
    })

    // Configuration state
    const [config, setConfig] = useState({
        name: '',
        embedding_model: 'gemini-text-embedding-004',
        enrichment_variant: '', // The selected key (e.g., g25f_gem004)
        tester_model: 'gemini-1.5-flash',
        tester_temperature: 0.7,
        difficulty_mode: 'medium' as 'easy' | 'medium' | 'hard' | 'mixed',
        mvs_weight_identity: 0.4,
        mvs_weight_physical: 0.3,
        mvs_weight_context: 0.3,
        match_threshold: 0.7,
        delay_between_queries_ms: 500,
        target_query_count: 10,
        use_dynamic_weights: false,
        use_sample_groups: true
    })

    // Queue state
    const [queueItems, setQueueItems] = useState<QueueItem[]>([])
    const [queueState, setQueueState] = useState<QueueState | null>(null)

    // Load test runs on mount
    useEffect(() => {
        loadTestRuns()
        loadExistingEmbeddings()
        loadQueueState()
    }, [])

    // Poll queue state when running
    useEffect(() => {
        if (queueState?.status !== 'running') return

        const interval = setInterval(() => {
            loadQueueState()
        }, 2000)

        return () => clearInterval(interval)
    }, [queueState?.status])

    // Auto-load running queue test into monitor
    useEffect(() => {
        const runningItem = queueItems.find(item => item.status === 'running' && item.run_id)
        if (runningItem?.run_id && activeTab === 'monitor') {
            // Only load if it's not already the current run
            if (!currentRun || currentRun.id !== runningItem.run_id) {
                getTestRun(runningItem.run_id).then(({ run, metrics }) => {
                    if (run) {
                        setCurrentRun(run)
                        setCurrentMetrics(metrics)
                    }
                })
            }
        }
    }, [queueItems, activeTab])

    // Process queue items when running
    useEffect(() => {
        if (queueState?.status !== 'running') return

        let processing = false

        const processQueue = async () => {
            if (processing) return
            processing = true

            try {
                // Check if current item is still running
                const runningItem = queueItems.find(item => item.status === 'running')

                if (runningItem?.run_id) {
                    // Check if test is complete
                    const { run } = await getTestRun(runningItem.run_id)
                    if (run && (run.status === 'completed' || run.status === 'failed' || run.status === 'aborted')) {
                        // Mark as completed and process next
                        await markQueueItemCompleted(runningItem.id)
                        await loadQueueState()
                        // Process next item
                        const result = await processNextQueueItem()
                        if (result.hasMore) {
                            await loadQueueState()
                        }
                    }
                } else {
                    // No running item, start next one
                    const result = await processNextQueueItem()
                    if (result.hasMore) {
                        await loadQueueState()
                    }
                }
            } catch (error) {
                console.error('[QUEUE] Processing error:', error)
            } finally {
                processing = false
            }
        }

        // Process immediately
        processQueue()

        // Then poll every 5 seconds
        const interval = setInterval(processQueue, 5000)

        return () => clearInterval(interval)
    }, [queueState?.status, queueItems])

    // Auto-refresh when monitoring an active test
    useEffect(() => {
        if (activeTab !== 'monitor' || !currentRun) return

        // Poll every 2 seconds if test is running or pending
        if (currentRun.status === 'running' || currentRun.status === 'pending') {
            const interval = setInterval(async () => {
                const { run, metrics } = await getTestRun(currentRun.id)
                if (run) {
                    setCurrentRun(run)
                    setCurrentMetrics(metrics)

                    // Stop polling if test is completed/failed
                    if (run.status === 'completed' || run.status === 'failed' || run.status === 'aborted') {
                        clearInterval(interval)
                    }
                }
            }, 2000)

            return () => clearInterval(interval)
        }
    }, [activeTab, currentRun])

    const generateTestName = (updateState: boolean = true) => {
        const getShortName = (modelName: string) => {
            if (!modelName) return 'unknown'
            if (modelName.includes('gemini-text-embedding-004')) return 'gemini_embed_004'
            if (modelName.includes('text-embedding-3-large')) return 'openai_3_large'
            if (modelName.includes('text-embedding-3-small')) return 'openai_3_small'
            if (modelName.includes('mistral-embed')) return 'mistral_embed'
            if (modelName.includes('voyage')) return modelName.replace('voyage-', 'voyage_')

            if (modelName.includes('gemini-2.0-flash')) return 'gemini_flash'
            if (modelName.includes('gpt-4o')) return 'gpt4o'
            if (modelName.includes('mistral-large')) return 'mistral_large'
            if (modelName.includes('mistral-small')) return 'mistral_small'

            return modelName.replace(/[^a-zA-Z0-9]/g, '_')
        }

        // Use enrichment_variant (embedding key) if selected, otherwise fall back to embedding_model
        const embedName = config.enrichment_variant || getShortName(config.embedding_model)
        const testerName = getShortName(config.tester_model)
        const weightsType = config.use_dynamic_weights ? 'mwS' : 'mwM'

        const baseName = `${embedName}_${testerName}_${weightsType}`

        // Count existing runs with this base name
        const similarRuns = testRuns.filter(r => r.name.startsWith(baseName))
        const number = similarRuns.length + 1
        const newName = `${baseName}_#${number}`

        if (updateState) {
            setConfig(prev => ({ ...prev, name: newName }))
            notify.success('Wygenerowano nazwę testu')
        }
        return newName
    }

    const loadTestRuns = async () => {
        const runs = await getTestRuns()
        setTestRuns(runs)
    }

    const loadQueueState = async () => {
        const { state, items } = await getQueueState()
        setQueueState(state)
        setQueueItems(items)
    }

    const handleAddToQueue = async () => {
        let finalConfig = { ...config }

        if (config.enrichment_variant) {
            finalConfig.embedding_model = config.enrichment_variant
        }

        if (autoName) {
            const generatedName = generateTestName(false)
            finalConfig.name = generatedName
        }

        const { enrichment_variant, ...configForBackend } = finalConfig
        const result = await addToQueue(configForBackend)

        if (result.success) {
            notify.success('Dodano do kolejki')
            await loadQueueState()
        } else {
            notify.error(result.error || 'Błąd dodawania do kolejki')
        }
    }

    const handleStartQueue = async () => {
        const result = await startQueue()
        if (result.success) {
            notify.success('Kolejka uruchomiona')
            await loadQueueState()
            setActiveTab('monitor')
        }
    }

    const handlePauseQueue = async () => {
        const result = await pauseQueue()
        if (result.success) {
            notify.info('Kolejka zatrzymana - obecny test zostanie ukończony')
            await loadQueueState()
        }
    }

    const handleStopQueue = async () => {
        const result = await stopQueue()
        if (result.success) {
            notify.error('Kolejka zatrzymana')
            await loadQueueState()
        }
    }

    const handleClearQueue = async () => {
        const result = await clearQueue()
        if (result.success) {
            notify.success('Kolejka wyczyszczona')
            await loadQueueState()
        }
    }

    const handleRemoveFromQueue = async (id: string) => {
        const result = await removeFromQueue(id)
        if (result.success) {
            await loadQueueState()
        }
    }

    const handleCreateTest = async () => {
        setLoading(true)
        try {
            let finalConfig = { ...config }

            // Use enrichment_variant as the embedding_model for the test
            // (enrichment_variant contains the full key like g25f_gem004)
            if (config.enrichment_variant) {
                finalConfig.embedding_model = config.enrichment_variant
            }

            if (autoName) {
                const generatedName = generateTestName(false)
                finalConfig.name = generatedName
                setConfig(prev => ({ ...prev, name: generatedName }))
            }

            // Remove UI-only field before sending to backend
            const { enrichment_variant, ...configForBackend } = finalConfig
            const result = await createTestRun(configForBackend)

            if (result.success && result.runId) {
                notify.success('Test utworzony pomyślnie')
                await loadTestRuns()
                setActiveTab('monitor')

                // Load the new run
                const { run, metrics } = await getTestRun(result.runId)
                setCurrentRun(run)
                setCurrentMetrics(metrics)
            } else {
                notify.error(result.error || 'Błąd podczas tworzenia testu')
            }
        } catch (error) {
            notify.error('Nieoczekiwany błąd')
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteTest = async (runId: string) => {
        if (!confirm('Czy na pewno chcesz usunąć ten test?')) return

        setLoading(true)
        try {
            const result = await deleteTestRun(runId)

            if (result.success) {
                notify.success('Test usunięty')
                await loadTestRuns()
                if (currentRun?.id === runId) {
                    setCurrentRun(null)
                    setCurrentMetrics(null)
                }
            } else {
                notify.error('Błąd podczas usuwania testu')
            }
        } catch (error) {
            notify.error('Nieoczekiwany błąd')
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const loadExistingEmbeddings = async () => {
        const keys = await getExistingEmbeddingKeys()
        setExistingEmbeddings(keys)
    }

    const handleRegenerateEmbeddings = async (useSample: boolean) => {
        setLoading(true)
        try {
            const result = await regenerateEmbeddings({
                ...embeddingConfig,
                use_sample: useSample
            })

            if (result.success) {
                notify.success(result.message || 'Regeneracja rozpoczęta')
                // Reload embeddings list after a delay
                setTimeout(() => loadExistingEmbeddings(), 2000)
            } else {
                notify.error(result.error || 'Błąd podczas regeneracji')
            }
        } catch (error) {
            notify.error('Nieoczekiwany błąd')
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const generateEmbeddingKey = (enrichmentModel: string, embeddingModel: string): string => {
        const enrichmentMap: Record<string, string> = {
            'gemini-2.5-flash-lite': 'g25fl',
            'gemini-2.5-flash': 'g25f',
            'gemini-2.0-flash-exp': 'g20f',
            'gemini-1.5-flash': 'g15f',
            'gpt-5-nano': 'gpt5n',
            'gpt-5-mini': 'gpt5m',
            'gpt-4.1-nano': 'gpt41n',
            'gpt-4o-mini': 'gpt4om',
            'gpt-4o': 'gpt4o',
            'mistral-large-latest': 'mstl'
        }

        const embeddingMap: Record<string, string> = {
            'gemini-text-embedding-004': 'gem004',
            'text-embedding-3-large': 'oai3l',
            'text-embedding-3-small': 'oai3s',
            'mistral-embed': 'mste',
            'voyage-3.5-lite': 'voy35l',
            'voyage-3.5': 'voy35'
        }

        const enrichKey = enrichmentMap[enrichmentModel] || enrichmentModel.substring(0, 6)
        const embedKey = embeddingMap[embeddingModel] || embeddingModel.substring(0, 6)

        return `${enrichKey}_${embedKey}`
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Testy Embeddingów</h1>
                    <p className="text-gray-400 mt-1">
                        Testowanie i optymalizacja wyszukiwania semantycznego
                    </p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="configure">
                        <Settings className="w-4 h-4 mr-2" />
                        Konfiguracja
                    </TabsTrigger>
                    <TabsTrigger value="monitor">
                        <Play className="w-4 h-4 mr-2" />
                        Monitor
                    </TabsTrigger>
                    <TabsTrigger value="results">
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Wyniki
                    </TabsTrigger>
                </TabsList>

                {/* CONFIGURE TAB */}
                <TabsContent value="configure" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Nowy Test</CardTitle>
                            <CardDescription>
                                Skonfiguruj parametry testu wyszukiwania
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Basic Config */}
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <Label>Nazwa testu</Label>
                                        <div className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                id="auto-name"
                                                className="h-3 w-3 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                                                checked={autoName}
                                                onChange={(e) => setAutoName(e.target.checked)}
                                            />
                                            <Label htmlFor="auto-name" className="text-xs text-muted-foreground cursor-pointer">Auto</Label>
                                        </div>
                                    </div>
                                    <Input
                                        value={config.name}
                                        onChange={(e) => setConfig({ ...config, name: e.target.value })}
                                        placeholder="Test Gemini vs OpenAI"
                                        disabled={autoName}
                                        className={autoName ? "opacity-60" : ""}
                                    />
                                </div>

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
                                                {/* Keeping Gemini 2 Lite reference if user insists, but mapping to 004 internally or distinct if API supports */}

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
                                        <Label>Model AI-Testera</Label>
                                        <Select
                                            value={config.tester_model}
                                            onValueChange={(value) => setConfig({ ...config, tester_model: value })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="gemini-2.0-flash-exp">
                                                    Gemini 2.0 Flash
                                                </SelectItem>
                                                <SelectItem value="gpt-4o-mini">
                                                    GPT-4o Mini
                                                </SelectItem>
                                                <SelectItem value="mistral-large-latest">
                                                    Mistral Large
                                                </SelectItem>
                                                <SelectItem value="mistral-small-latest">
                                                    Mistral Small
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Temperatura AI-Testera: {config.tester_temperature}</Label>
                                        <Slider
                                            value={[config.tester_temperature]}
                                            onValueChange={([value]) => setConfig({ ...config, tester_temperature: value })}
                                            min={0.1}
                                            max={1.0}
                                            step={0.1}
                                            className="mt-2"
                                        />
                                    </div>

                                    <div>
                                        <Label>Tryb trudności</Label>
                                        <Select
                                            value={config.difficulty_mode}
                                            onValueChange={(value: any) => setConfig({ ...config, difficulty_mode: value })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="easy">Łatwy (synonimy)</SelectItem>
                                                <SelectItem value="medium">Średni (opisy)</SelectItem>
                                                <SelectItem value="hard">Trudny (abstrakcje)</SelectItem>
                                                <SelectItem value="mixed">Mieszany</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Wariant Wzbogacenia</Label>
                                        <Select
                                            value={config.enrichment_variant || ''}
                                            onValueChange={(value) => setConfig({ ...config, enrichment_variant: value })}
                                            disabled={!config.embedding_model}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={config.embedding_model ? "Wybierz wariant" : "Najpierw wybierz model"} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {(() => {
                                                    if (!config.embedding_model) return null

                                                    const embeddingMap: Record<string, string> = {
                                                        'gemini-text-embedding-004': 'gem004',
                                                        'text-embedding-3-large': 'oai3l',
                                                        'text-embedding-3-small': 'oai3s',
                                                        'mistral-embed': 'mste',
                                                        'voyage-3.5-lite': 'voy35l',
                                                        'voyage-3.5': 'voy35'
                                                    }

                                                    const suffix = embeddingMap[config.embedding_model]
                                                    const filtered = existingEmbeddings.filter(key => key.endsWith(`_${suffix}`))

                                                    if (filtered.length === 0) {
                                                        return <SelectItem value="none" disabled>Brak embeddingów dla tego modelu</SelectItem>
                                                    }

                                                    return filtered.map((key) => {
                                                        const preset = PRESET_COMBINATIONS.find(p =>
                                                            generateEmbeddingKey(p.enrichment, p.embedding) === key
                                                        )
                                                        return (
                                                            <SelectItem key={key} value={key}>
                                                                {key} {preset ? `(${preset.label})` : ''}
                                                            </SelectItem>
                                                        )
                                                    })
                                                })()}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div></div>
                                </div>
                            </div>

                            {/* MVS Weights */}
                            <div className="space-y-4 border-t pt-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold">Wagi Multi-Vector Search</h3>
                                    <div className="flex items-center space-x-2 bg-secondary/20 px-3 py-1 rounded-md">
                                        <input
                                            type="checkbox"
                                            id="dynamic-weights"
                                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                            checked={config.use_dynamic_weights}
                                            onChange={(e) => setConfig({ ...config, use_dynamic_weights: e.target.checked })}
                                        />
                                        <Label htmlFor="dynamic-weights" className="cursor-pointer text-sm font-medium">Smart Dynamic Weights</Label>
                                    </div>
                                </div>

                                <div className={config.use_dynamic_weights ? "opacity-50 pointer-events-none transition-opacity" : "transition-opacity"}>
                                    <div>
                                        <Label>Identity: {config.mvs_weight_identity.toFixed(2)}</Label>
                                        <Slider
                                            value={[config.mvs_weight_identity]}
                                            onValueChange={([value]) => setConfig({ ...config, mvs_weight_identity: value })}
                                            min={0}
                                            max={1}
                                            step={0.1}
                                            className="mt-2"
                                        />
                                    </div>

                                    <div>
                                        <Label>Physical: {config.mvs_weight_physical.toFixed(2)}</Label>
                                        <Slider
                                            value={[config.mvs_weight_physical]}
                                            onValueChange={([value]) => setConfig({ ...config, mvs_weight_physical: value })}
                                            min={0}
                                            max={1}
                                            step={0.1}
                                            className="mt-2"
                                        />
                                    </div>

                                    <div>
                                        <Label>Context: {config.mvs_weight_context.toFixed(2)}</Label>
                                        <Slider
                                            value={[config.mvs_weight_context]}
                                            onValueChange={([value]) => setConfig({ ...config, mvs_weight_context: value })}
                                            min={0}
                                            max={1}
                                            step={0.1}
                                            className="mt-2"
                                        />
                                    </div>

                                    <Alert>
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription>
                                            Suma wag: {(config.mvs_weight_identity + config.mvs_weight_physical + config.mvs_weight_context).toFixed(2)}
                                            {Math.abs((config.mvs_weight_identity + config.mvs_weight_physical + config.mvs_weight_context) - 1.0) > 0.01 && !config.use_dynamic_weights && (
                                                <span className="text-red-500 ml-2">⚠️ Musi wynosić 1.0</span>
                                            )}
                                        </AlertDescription>
                                    </Alert>
                                </div>
                            </div>

                            {/* Test Parameters */}
                            <div className="space-y-4 border-t pt-4">
                                <h3 className="font-semibold">Parametry Testu</h3>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Liczba zapytań</Label>
                                        <Input
                                            type="number"
                                            value={config.target_query_count || ''}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value)
                                                setConfig({ ...config, target_query_count: isNaN(val) ? 0 : val })
                                            }}
                                            min={1}
                                            max={500}
                                        />
                                    </div>

                                    <div>
                                        <Label>Delay (ms)</Label>
                                        <Input
                                            type="number"
                                            value={config.delay_between_queries_ms || ''}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value)
                                                setConfig({ ...config, delay_between_queries_ms: isNaN(val) ? 0 : val })
                                            }}
                                            min={100}
                                            max={5000}
                                        />
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
                                    <Label htmlFor="sample">Testuj na próbce 50 grup (szybsze)</Label>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    onClick={handleCreateTest}
                                    disabled={loading}
                                    className="flex-1"
                                    size="lg"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Tworzenie...
                                        </>
                                    ) : (
                                        <>
                                            <Play className="w-4 h-4 mr-2" />
                                            Utwórz i Rozpocznij
                                        </>
                                    )}
                                </Button>
                                <Button
                                    onClick={handleAddToQueue}
                                    variant="outline"
                                    size="lg"
                                    disabled={loading}
                                >
                                    <ListPlus className="w-4 h-4 mr-2" />
                                    Do Kolejki
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Embedding Management Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Zarządzanie Embeddingami</CardTitle>
                            <CardDescription>
                                Generuj embeddingi dla różnych kombinacji modeli
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Model Selection */}
                            {/* Model Selection */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Model Embeddingowy</Label>
                                    <Select
                                        value={embeddingConfig.embedding_model}
                                        onValueChange={(value) => setEmbeddingConfig({ ...embeddingConfig, embedding_model: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="gemini-text-embedding-004">Google Gemini Embedding 004</SelectItem>
                                            <SelectItem value="text-embedding-3-large">OpenAI 3 Large</SelectItem>
                                            <SelectItem value="text-embedding-3-small">OpenAI 3 Small</SelectItem>
                                            <SelectItem value="mistral-embed">Mistral Embed</SelectItem>
                                            <SelectItem value="voyage-3.5-lite">Voyage 3.5 Lite</SelectItem>
                                            <SelectItem value="voyage-3.5">Voyage 3.5</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label>Model Wzbogacania</Label>
                                    <Select
                                        value={embeddingConfig.enrichment_model}
                                        onValueChange={(value) => setEmbeddingConfig({ ...embeddingConfig, enrichment_model: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="gemini-2.5-flash-lite">Gemini 2.5 Flash-Lite ($0.10/$0.40)</SelectItem>
                                            <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash ($0.30/$2.50)</SelectItem>
                                            <SelectItem value="gemini-2.0-flash-exp">Gemini 2.0 Flash ($0.10/$0.40)</SelectItem>
                                            <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash ($0.075/$0.30)</SelectItem>
                                            <SelectItem value="gpt-5-nano">GPT-5 Nano ($0.025/$0.20)</SelectItem>
                                            <SelectItem value="gpt-5-mini">GPT-5 Mini ($0.125/$1.00)</SelectItem>
                                            <SelectItem value="gpt-4.1-nano">GPT-4.1 Nano ($0.05/$0.20)</SelectItem>
                                            <SelectItem value="gpt-4o-mini">GPT-4o Mini ($0.075/$0.30)</SelectItem>
                                            <SelectItem value="gpt-4o">GPT-4o ($1.25/$5.00)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Existing Embeddings List */}
                            <div className="border-t pt-4">
                                <div className="flex items-center justify-between mb-3">
                                    <Label className="text-sm font-semibold">Istniejące Embeddingi</Label>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={loadExistingEmbeddings}
                                        className="h-7 text-xs"
                                    >
                                        <RefreshCw className="w-3 h-3 mr-1" />
                                        Odśwież
                                    </Button>
                                </div>
                                {existingEmbeddings.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {existingEmbeddings.map(key => (
                                            <Badge key={key} variant="secondary" className="font-mono text-xs">
                                                {key}
                                            </Badge>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">Brak embeddingów w bazie</p>
                                )}
                            </div>

                            {/* Regeneration Controls */}
                            <div className="border-t pt-4">
                                <Alert className="mb-4">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        Regeneracja nadpisze embeddingi dla klucza: <code className="text-xs bg-secondary px-1 py-0.5 rounded">
                                            {generateEmbeddingKey(embeddingConfig.enrichment_model, embeddingConfig.embedding_model)}
                                        </code>
                                    </AlertDescription>
                                </Alert>

                                <div className="flex gap-2">
                                    <Button
                                        onClick={() => handleRegenerateEmbeddings(true)}
                                        disabled={loading}
                                        variant="outline"
                                    >
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        Próbka 50 grup
                                    </Button>
                                    <Button
                                        onClick={() => handleRegenerateEmbeddings(false)}
                                        disabled={loading}
                                        variant="outline"
                                    >
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        Wszystkie grupy
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Test Queue Card */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <List className="w-5 h-5" />
                                        Kolejka Testów
                                    </CardTitle>
                                    <CardDescription>
                                        Zakolejkowane testy do wykonania
                                    </CardDescription>
                                </div>
                                <Badge variant={
                                    queueState?.status === 'running' ? 'default' :
                                        queueState?.status === 'paused' ? 'secondary' :
                                            'outline'
                                }>
                                    {queueState?.status === 'running' ? '▶ Działa' :
                                        queueState?.status === 'paused' ? '⏸ Pauza' :
                                            '⏹ Bezczynny'}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {queueItems.length === 0 ? (
                                <div className="py-8 text-center text-gray-400">
                                    <ListPlus className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p>Brak testów w kolejce</p>
                                    <p className="text-xs mt-1">Użyj "Do Kolejki" aby dodać testy</p>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {queueItems.map((item, idx) => (
                                            <div
                                                key={item.id}
                                                className={`flex items-center justify-between p-3 border rounded-lg ${item.status === 'running' ? 'border-blue-500 bg-blue-500/10' :
                                                    item.status === 'completed' ? 'border-green-500/50 bg-green-500/5' :
                                                        item.status === 'failed' ? 'border-red-500/50 bg-red-500/5' :
                                                            ''
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm text-muted-foreground w-6">
                                                        #{idx + 1}
                                                    </span>
                                                    <div>
                                                        <p className="font-medium text-sm">
                                                            {(item.config as any).name || 'Test bez nazwy'}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {(item.config as any).tester_model} • {(item.config as any).target_query_count} zapytań
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant={
                                                        item.status === 'running' ? 'default' :
                                                            item.status === 'completed' ? 'secondary' :
                                                                item.status === 'failed' ? 'destructive' :
                                                                    'outline'
                                                    } className="text-xs">
                                                        {item.status === 'running' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                                                        {item.status}
                                                    </Badge>
                                                    {item.status === 'pending' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleRemoveFromQueue(item.id)}
                                                            className="h-6 w-6 p-0"
                                                        >
                                                            <XCircle className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex gap-2 pt-2 border-t">
                                        {queueState?.status === 'idle' && (
                                            <>
                                                <Button onClick={handleStartQueue} className="flex-1">
                                                    <Play className="w-4 h-4 mr-2" />
                                                    Uruchom Kolejkę
                                                </Button>
                                                <Button onClick={handleClearQueue} variant="outline">
                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                    Wyczyść
                                                </Button>
                                            </>
                                        )}
                                        {queueState?.status === 'running' && (
                                            <>
                                                <Button onClick={handlePauseQueue} variant="secondary" className="flex-1">
                                                    <Pause className="w-4 h-4 mr-2" />
                                                    Pauza
                                                </Button>
                                                <Button onClick={handleStopQueue} variant="destructive">
                                                    <Square className="w-4 h-4 mr-2" />
                                                    Stop
                                                </Button>
                                            </>
                                        )}
                                        {queueState?.status === 'paused' && (
                                            <>
                                                <Button onClick={handleStartQueue} className="flex-1">
                                                    <Play className="w-4 h-4 mr-2" />
                                                    Wznów
                                                </Button>
                                                <Button onClick={handleStopQueue} variant="destructive">
                                                    <Square className="w-4 h-4 mr-2" />
                                                    Anuluj
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* MONITOR TAB */}
                <TabsContent value="monitor" className="space-y-6">
                    {currentRun ? (
                        <>
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle>{currentRun.name}</CardTitle>
                                            <CardDescription>
                                                Utworzono: {new Date(currentRun.created_at).toLocaleString('pl-PL')}
                                                {(currentRun.status === 'running' || currentRun.status === 'pending') && (
                                                    <span className="ml-3 text-blue-400 text-xs">
                                                        🔄 Odświeżanie co 2s
                                                    </span>
                                                )}
                                            </CardDescription>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={async () => {
                                                    const { run, metrics } = await getTestRun(currentRun.id)
                                                    setCurrentRun(run)
                                                    setCurrentMetrics(metrics)
                                                }}
                                            >
                                                <RefreshCw className="w-4 h-4" />
                                            </Button>

                                            <Badge variant={
                                                currentRun.status === 'completed' ? 'default' :
                                                    currentRun.status === 'running' ? 'secondary' :
                                                        currentRun.status === 'failed' ? 'destructive' :
                                                            'outline'
                                            }>
                                                {currentRun.status}
                                            </Badge>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Progress */}
                                    <div>
                                        <div className="flex justify-between text-sm mb-2">
                                            <span>Postęp testów</span>
                                            <span>{currentRun.completed_query_count} / {currentRun.target_query_count}</span>
                                        </div>
                                        <div className="w-full bg-gray-700 rounded-full h-2">
                                            <div
                                                className="bg-blue-500 h-2 rounded-full transition-all"
                                                style={{
                                                    width: `${(currentRun.completed_query_count / currentRun.target_query_count) * 100}%`
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Costs */}
                                    <div className="grid grid-cols-2 gap-4 border-t pt-4">
                                        <div>
                                            <p className="text-sm text-gray-400">Tokeny Wyszukiwania</p>
                                            <p className="text-xl font-bold">
                                                {currentRun.total_search_tokens.toLocaleString()}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-400">Tokeny AI-Testera</p>
                                            <p className="text-xl font-bold">
                                                {currentRun.total_tester_tokens.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Current Metrics */}
                                    {currentMetrics && (
                                        <div className="border-t pt-4">
                                            <h3 className="font-semibold mb-4">Aktualne Metryki</h3>
                                            <div className="grid grid-cols-3 gap-4">
                                                <div>
                                                    <p className="text-sm text-gray-400">Accuracy@1</p>
                                                    <p className="text-2xl font-bold text-green-500">
                                                        {currentMetrics.accuracy_at_1}%
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-400">Accuracy@5</p>
                                                    <p className="text-2xl font-bold">
                                                        {currentMetrics.accuracy_at_5}%
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-400">Accuracy@10</p>
                                                    <p className="text-2xl font-bold">
                                                        {currentMetrics.accuracy_at_10}%
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </>
                    ) : (
                        <Card>
                            <CardContent className="py-12 text-center text-gray-400">
                                <Play className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>Brak aktywnego testu. Utwórz nowy test w zakładce Konfiguracja.</p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* RESULTS TAB */}
                <TabsContent value="results" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Historia Testów</CardTitle>
                            <CardDescription>
                                Wszystkie wykonane testy i ich wyniki
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {testRuns.length === 0 ? (
                                <div className="py-12 text-center text-gray-400">
                                    <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                    <p>Brak testów. Utwórz pierwszy test w zakładce Konfiguracja.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {testRuns.map((testRun) => (
                                        <div
                                            key={testRun.id}
                                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-800/50 transition-colors"
                                        >
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-semibold">{testRun.name}</h3>
                                                    <Badge variant={
                                                        testRun.status === 'completed' ? 'default' :
                                                            testRun.status === 'running' ? 'secondary' :
                                                                testRun.status === 'failed' ? 'destructive' :
                                                                    'outline'
                                                    }>
                                                        {testRun.status}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-gray-400 mt-1">
                                                    {new Date(testRun.created_at).toLocaleString('pl-PL')} •
                                                    {testRun.completed_query_count}/{testRun.target_query_count} zapytań •
                                                    {(testRun.total_search_tokens + testRun.total_tester_tokens).toLocaleString()} tokenów
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={async () => {
                                                        const { run, metrics } = await getTestRun(testRun.id)
                                                        setCurrentRun(run)
                                                        setCurrentMetrics(metrics)
                                                        setActiveTab('monitor')
                                                    }}
                                                >
                                                    Zobacz
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDeleteTest(testRun.id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Queue Progress Card */}
                    {queueItems.length > 0 && (
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            <List className="w-5 h-5" />
                                            Postęp Kolejki
                                        </CardTitle>
                                        <CardDescription>
                                            {queueItems.filter(i => i.status === 'completed').length} / {queueItems.length} testów ukończonych
                                        </CardDescription>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={
                                            queueState?.status === 'running' ? 'default' :
                                                queueState?.status === 'paused' ? 'secondary' :
                                                    'outline'
                                        }>
                                            {queueState?.status === 'running' ? '▶ Działa' :
                                                queueState?.status === 'paused' ? '⏸ Pauza' :
                                                    '⏹ Bezczynny'}
                                        </Badge>
                                        {queueState?.status === 'running' && (
                                            <Button onClick={handlePauseQueue} variant="secondary" size="sm">
                                                <Pause className="w-4 h-4 mr-2" />
                                                Pauza
                                            </Button>
                                        )}
                                        {queueState?.status === 'running' && (
                                            <Button onClick={handleStopQueue} variant="destructive" size="sm">
                                                <Square className="w-4 h-4 mr-2" />
                                                Stop
                                            </Button>
                                        )}
                                        {queueState?.status === 'paused' && (
                                            <Button onClick={handleStartQueue} size="sm">
                                                <Play className="w-4 h-4 mr-2" />
                                                Wznów
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {/* Overall Progress Bar */}
                                <div className="mb-4">
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-muted-foreground">Postęp całkowity</span>
                                        <span className="font-medium">
                                            {Math.round((queueItems.filter(i => i.status === 'completed').length / queueItems.length) * 100)}%
                                        </span>
                                    </div>
                                    <div className="w-full bg-secondary rounded-full h-2">
                                        <div
                                            className="bg-primary h-2 rounded-full transition-all duration-300"
                                            style={{
                                                width: `${(queueItems.filter(i => i.status === 'completed').length / queueItems.length) * 100}%`
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Queue Items List */}
                                <div className="space-y-2">
                                    {queueItems.map((item, idx) => (
                                        <div
                                            key={item.id}
                                            className={`p-3 border rounded-lg ${item.status === 'running' ? 'border-blue-500 bg-blue-500/10' :
                                                item.status === 'completed' ? 'border-green-500/50 bg-green-500/5' :
                                                    item.status === 'failed' ? 'border-red-500/50 bg-red-500/5' :
                                                        ''
                                                }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3 flex-1">
                                                    <span className="text-sm text-muted-foreground w-6">
                                                        #{idx + 1}
                                                    </span>
                                                    <div className="flex-1">
                                                        <p className="font-medium text-sm">
                                                            {(item.config as any).name || 'Test bez nazwy'}
                                                        </p>
                                                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                                            <span>{(item.config as any).tester_model}</span>
                                                            <span>•</span>
                                                            <span>{(item.config as any).target_query_count} zapytań</span>
                                                            {item.run_id && (
                                                                <>
                                                                    <span>•</span>
                                                                    <button
                                                                        onClick={async () => {
                                                                            const { run, metrics } = await getTestRun(item.run_id!)
                                                                            if (run) {
                                                                                setCurrentRun(run)
                                                                                setCurrentMetrics(metrics)
                                                                            }
                                                                        }}
                                                                        className="text-blue-400 hover:text-blue-300 underline"
                                                                    >
                                                                        Zobacz wyniki
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <Badge variant={
                                                    item.status === 'running' ? 'default' :
                                                        item.status === 'completed' ? 'secondary' :
                                                            item.status === 'failed' ? 'destructive' :
                                                                'outline'
                                                } className="text-xs">
                                                    {item.status === 'running' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                                                    {item.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                                                    {item.status === 'failed' && <XCircle className="w-3 h-3 mr-1" />}
                                                    {item.status}
                                                </Badge>
                                            </div>
                                            {item.error_message && (
                                                <Alert className="mt-2">
                                                    <AlertCircle className="h-4 w-4" />
                                                    <AlertDescription className="text-xs">
                                                        {item.error_message}
                                                    </AlertDescription>
                                                </Alert>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>
        </div >
    )
}
