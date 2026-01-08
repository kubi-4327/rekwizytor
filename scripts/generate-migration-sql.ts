
import fs from 'fs'
import path from 'path'
import { enrichGroupNameForEmbedding } from '../utils/group-embedding-enrichment'
import { generateEmbedding } from '../utils/embeddings'
import { TaskType } from '@google/generative-ai'

async function run() {
    const groupsPath = path.resolve(process.cwd(), 'groups.json')
    const outputPath = path.resolve(process.cwd(), 'migration_vectors.sql')

    if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath)
    }

    if (!fs.existsSync(groupsPath)) {
        console.error('Groups file not found at:', groupsPath)
        process.exit(1)
    }

    const groups = JSON.parse(fs.readFileSync(groupsPath, 'utf8'))
    console.log(`Loaded ${groups.length} groups.`)

    for (let i = 0; i < groups.length; i++) {
        const group = groups[i]
        console.log(`[${i + 1}/${groups.length}] Processing "${group.name}"...`)

        try {
            const enrichment = await enrichGroupNameForEmbedding(group.name)
            console.log(`   Enriched: ID=${enrichment.identity.substring(0, 20)}...`)

            const [idEmb, physEmb, ctxEmb] = await Promise.all([
                generateEmbedding(enrichment.identity || group.name, TaskType.RETRIEVAL_DOCUMENT),
                generateEmbedding(enrichment.physical || '-', TaskType.RETRIEVAL_DOCUMENT),
                generateEmbedding(enrichment.context || '-', TaskType.RETRIEVAL_DOCUMENT)
            ])

            const sql = `UPDATE groups SET embedding_identity = '${JSON.stringify(idEmb)}', embedding_physical = '${JSON.stringify(physEmb)}', embedding_context = '${JSON.stringify(ctxEmb)}' WHERE id = '${group.id}';\n`

            // Append immediately to file
            fs.appendFileSync(outputPath, sql)

        } catch (e: any) {
            console.error(`   Error processing ${group.name}: ${e.message}`)
        }

        // Delay 1s to be gentle with rate limits
        await new Promise(r => setTimeout(r, 1000))
    }

    console.log('Done! SQL saved to migration_vectors.sql')
}

run()
