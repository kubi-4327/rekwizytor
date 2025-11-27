import { GoogleGenerativeAI } from '@google/generative-ai'
import fs from 'fs'
import path from 'path'

// Simple env loader
const envPath = path.join(process.cwd(), '.env.local')
let apiKey = process.env.GEMINI_API_KEY

if (!apiKey && fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8')
    const match = envContent.match(/GEMINI_API_KEY=(.*)/)
    if (match) {
        apiKey = match[1].trim()
    }
}

async function listModels() {
    if (!apiKey) {
        console.error('Missing GEMINI_API_KEY in .env.local or environment')
        return
    }

    const genAI = new GoogleGenerativeAI(apiKey)

    console.log('Checking available models...')

    const modelsToCheck = [
        'gemini-1.5-flash',
        'gemini-1.5-flash-001',
        'gemini-1.5-pro',
        'gemini-pro',
        'gemini-pro-vision'
    ]

    for (const modelName of modelsToCheck) {
        try {
            console.log(`Testing ${modelName}...`)
            const model = genAI.getGenerativeModel({ model: modelName })
            await model.generateContent('Hello, are you there?')
            console.log(`✅ ${modelName} is WORKING`)
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            console.log(`❌ ${modelName} failed: ${errorMessage.split('\n')[0]}`)
        }
    }
}

listModels()
