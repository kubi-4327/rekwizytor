'use server'

import { geminiFlash, geminiFlashLite, isGeminiAvailable } from '@/utils/gemini'
import { createClient } from '@/utils/supabase/server'
import { randomUUID } from 'crypto'

export type ScannedScene = {
    _id: string // Temp ID for UI handling (DnD)
    original_number: string | number // What was properly read
    scene_number: number // Proposed system number
    act_number: number | null
    name: string | null
    confidence?: string // 'high', 'low'
    source_index?: number
}

export async function scanSceneImage(formData: FormData): Promise<{ scenes: ScannedScene[], error?: string }> {
    const file = formData.get('file') as File
    const supabase = await createClient()

    if (!file) {
        return { scenes: [], error: 'No file provided' }
    }

    if (!isGeminiAvailable() || !geminiFlash) {
        return { scenes: [], error: 'AI service not available (API Key missing)' }
    }

    try {
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const base64Image = buffer.toString('base64')

        const prompt = `
        You are a theatrical assistant. Analyze this image of a performance breakdown (scene list).
        Extract ALL scenes from the list in their original order.
        
        For each row, provide:
        - "scene_number" (integer): The number of the scene. Numbering usually restarts at 1 for each new Act.
        - "act_number" (integer): The number of the Act. If not explicitly specified on the page, infer it from headers like "ACT I", "AKT II" or use the last known/inferred Act number.
        - "name" (string): The title, description, or location of the scene.

        Return a JSON object with this exact structure:
        {
            "scenes": [
                { "scene_number": 1, "act_number": 1, "name": "Opening Scene" },
                ...
            ]
        }
        
        IMPORTANT:
        - If the list is long, ensure you extract EVERY single scene. Do not truncate.
        - Use ONLY valid JSON.
        `

        const model = geminiFlashLite || geminiFlash
        if (!model) {
            return { scenes: [], error: 'AI service not available' }
        }

        const result = await model.generateContent({
            contents: [{
                role: 'user',
                parts: [
                    { text: prompt },
                    {
                        inlineData: {
                            mimeType: file.type || 'image/jpeg',
                            data: base64Image
                        }
                    }
                ]
            }],
            generationConfig: {
                responseMimeType: "application/json",
                maxOutputTokens: 2048,
                temperature: 0.1
            }
        })

        const response = result.response
        const usage = response.usageMetadata

        if (usage) {
            await supabase.from('ai_usage_logs').insert({
                tokens_input: usage.promptTokenCount,
                tokens_output: usage.candidatesTokenCount,
                total_tokens: usage.totalTokenCount,
                model_name: geminiFlashLite ? 'gemini-2.5-flash-lite' : 'gemini-2.0-flash',
                operation_type: 'scan_scenes'
            })
        }

        const text = response.text()
        console.log('Gemini raw response:', text)

        try {
            const data = JSON.parse(text)

            if (!data.scenes || !Array.isArray(data.scenes)) {
                return { scenes: [], error: 'Invalid AI response structure' }
            }

            // Post-process to fit ScannedScene type
            const scenes: ScannedScene[] = data.scenes.map((s: any) => ({
                _id: randomUUID(),
                original_number: s.scene_number,
                scene_number: s.scene_number, // Default to read number, client will re-calc if needed
                act_number: s.act_number,
                name: s.name,
                confidence: 'high' // simplified
            }))

            return { scenes }
        } catch (e) {
            console.error('Failed to parse Gemini response:', text)
            return { scenes: [], error: 'Failed to parse AI response' }
        }

    } catch (error) {
        console.error('Error scanning scenes:', error)
        return { scenes: [], error: 'Error processing image' }
    }
}
