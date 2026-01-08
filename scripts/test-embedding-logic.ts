'use server'

import { GoogleGenerativeAI, TaskType } from '@google/generative-ai'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const geminiApiKey = process.env.GEMINI_API_KEY!
const genAI = new GoogleGenerativeAI(geminiApiKey)
const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' })

function cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0, normA = 0, normB = 0
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i]
        normA += a[i] * a[i]
        normB += b[i] * b[i]
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

async function test(query: string, doc: string) {
    const queryEmb = (await embeddingModel.embedContent({ content: { role: 'user', parts: [{ text: query }] }, taskType: TaskType.RETRIEVAL_QUERY })).embedding.values
    const docEmb = (await embeddingModel.embedContent({ content: { role: 'user', parts: [{ text: doc }] }, taskType: TaskType.RETRIEVAL_DOCUMENT })).embedding.values
    return cosineSimilarity(queryEmb, docEmb)
}

async function run() {
    const q = "ostre"

    console.log(`Query: "${q}"`)

    const cases = [
        { name: "Sama nazwa", text: "brzytwy" },
        { name: "Samo słowo klucz", text: "ostre" },
        { name: "Nazwa + słowo klucz", text: "brzytwy: ostre" },
        { name: "Długi enrichment z 'ostre'", text: "brzytwy: narzędzie, akcesorium, rekwizyt, stalowe, metalowe, żelazne, ostre, tnące, niebezpieczne, fryzjer, barber, golarnia" },
        { name: "Owoce bez 'ostre'", text: "owoce sztuczne: atrapy owoców, jedzenie, plastik, guma, soczyste, słodkie, martwa natura, kuchnia, restauracja" }
    ]

    for (const c of cases) {
        const score = await test(q, c.text)
        console.log(`${c.name.padEnd(25)}: ${(score * 100).toFixed(2)}% | Text: ${c.text}`)
    }
}

run().catch(console.error)
