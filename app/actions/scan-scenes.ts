'use server'

import { geminiFlash, isGeminiAvailable } from '@/utils/gemini'
import { createClient } from '@/utils/supabase/server'

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
        Extract all scenes in order.
        For each row, identify:
        1. Scene Number (integer). CAUTION: Numbering might restart for each Act. If you see "9a", "9b", etc., convert them to the base integer (e.g. 9).
        2. Act Number (integer). If not explicitly written, look for headers like "Act II", "Akt 2". If unclear, return null.
        3. Name (string). The scene title, location, or song name. If unreadable, use "???".

        Return ONLY valid JSON in this format:
        {
            "scenes": [
                { "scene_number": 1, "act_number": 1, "name": "Opening" },
                ...
            ]
        }
        Do not include markdown formatting like \`\`\`json.
        `

        const result = await geminiFlash.generateContent([
            prompt,
            {
                inlineData: {
                    mimeType: file.type || 'image/jpeg',
                    data: base64Image
                }
            }
        ])

        const response = result.response
        const usage = response.usageMetadata

        if (usage) {
            await supabase.from('ai_usage_logs').insert({
                tokens_input: usage.promptTokenCount,
                tokens_output: usage.candidatesTokenCount,
                total_tokens: usage.totalTokenCount,
                model_name: 'gemini-1.5-flash',
                operation_type: 'scan_scenes'
            })
        }

        const text = response.text()

        // Clean markdown if present
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim()

        try {
            const data = JSON.parse(jsonStr)

            // Post-process to fit ScannedScene type
            const scenes: ScannedScene[] = data.scenes.map((s: any) => ({
                _id: crypto.randomUUID(),
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
