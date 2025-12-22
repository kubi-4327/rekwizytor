'use server'

import { geminiFlash } from '@/utils/gemini'
import { sanitizeAIOutput } from '@/utils/ai-security'

export async function analyzeGroupImage(imageBase64: string) {
    if (!geminiFlash) {
        return { error: 'AI service unavailable' }
    }

    try {
        // Remove data URL prefix if present
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '')

        const prompt = `
        Analyze this image and suggest a Category Name (Group Name) for the items shown.
        The name should be short, plural, and in Polish (e.g. "Kable", "Broń", "Naczynia", "Elektronika").
        
        Also provide a short 1-line description of what you see.
        
        Return ONLY a JSON object:
        {
            "suggestedName": "Nazwa Grupy",
            "description": "Krótki opis tego co jest na zdjęciu"
        }
        `

        const result = await geminiFlash.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Data,
                    mimeType: 'image/jpeg'
                }
            }
        ])

        const responseText = result.response.text()

        // Extract JSON
        const jsonMatch = responseText.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
            throw new Error('Invalid AI response format')
        }

        const data = JSON.parse(jsonMatch[0])

        return {
            suggestedName: sanitizeAIOutput(data.suggestedName),
            description: sanitizeAIOutput(data.description)
        }

    } catch (error) {
        console.error('Vision Analysis Error:', error)
        return { error: 'Failed to analyze image' }
    }
}
