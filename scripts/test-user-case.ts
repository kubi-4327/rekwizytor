'use server'

import { GoogleGenerativeAI, TaskType } from '@google/generative-ai'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const geminiApiKey = process.env.GEMINI_API_KEY!
const genAI = new GoogleGenerativeAI(geminiApiKey)
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })
const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' })

async function generateEnrichedText(name: string): Promise<string> {
    const prompt = `Jesteś ekspertem od semantycznego opisu przedmiotów dla systemu wyszukiwania rekwizytów teatralnych.

ZADANIE: Wygeneruj słowa kluczowe które pomogą użytkownikom znaleźć grupę "${name}" przy RÓŻNYCH zapytaniach.

KATEGORIE DO UWZGLĘDNIENIA (po 2-3 słowa każda):
1. SYNONIMY - inne nazwy (np. krzesło → siedzisko, fotel, taboret)
2. KATEGORIA - do czego to należy (np. krzesło → mebel, wyposażenie)
3. MATERIAŁ - z czego zrobione (np. drewniane, metalowe, szklane, plastikowe)
4. WŁAŚCIWOŚCI ORYGINAŁU - przymiotniki opisujące PRAWDZIWY przedmiot, nie replikę (np. miecz → ostre, niebezpieczne; nóż → tnące)
5. UŻYCIE - gdzie/kiedy używane (np. scena, kuchnia, biuro, wesele, komedia)
6. POWIĄZANE - co występuje razem (np. stół, obrus, sztućce)

⚠️ WAŻNA ZASADA: Opisuj WŁAŚCIWOŚCI ORYGINAŁU, nie repliki teatralnej!
- Jeśli użytkownik szuka "coś ostrego" → musi znaleźć miecze, noże, brzytwy
- Więc "broń sceniczna" MUSI zawierać: ostre, tnące, kłute (bo prawdziwy miecz jest ostry)
- NIE pisz: tępe, bezpieczne, nieostre (to opisuje replikę, nie przedmiot)

KLUCZOWE ZASADY:
- Myśl JAK UŻYTKOWNIK: "potrzebuję coś ostrego" → nóż, brzytwa, miecz
- Dodaj PRZYMIOTNIKI które opisują ORYGINAŁ (ostre, drewniane, vintage, eleganckie)
- Użyj POLSKICH słów w różnych formach (drewno, drewniane, drewniany)

FORMAT: ${name}: słowo1, słowo2, słowo3...

WYGENERUJ (TYLKO słowa, bez komentarzy):`

    const result = await model.generateContent(prompt)
    return result.response.text().trim()
}

function cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0, normA = 0, normB = 0
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i]
        normA += a[i] * a[i]
        normB += b[i] * b[i]
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

async function run() {
    const query = "ostre"
    const queryEmb = (await embeddingModel.embedContent({ content: { role: 'user', parts: [{ text: query }] }, taskType: TaskType.RETRIEVAL_QUERY })).embedding.values

    const groups = ["owoce sztuczne", "brzytwy", "broń sceniczna"]

    for (const name of groups) {
        const enriched = await generateEnrichedText(name)
        const emb = (await embeddingModel.embedContent({ content: { role: 'user', parts: [{ text: enriched }] }, taskType: TaskType.RETRIEVAL_DOCUMENT })).embedding.values
        const similarity = cosineSimilarity(queryEmb, emb)
        console.log(`Group: "${name}"`)
        console.log(`Enriched: ${enriched}`)
        console.log(`Similarity to "${query}": ${(similarity * 100).toFixed(2)}%`)
        console.log('---')
    }
}

run().catch(console.error)
