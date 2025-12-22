import { extractTextFromContent } from './utils'

export const getSceneNotesFromContent = (content: any, scenes: { id: string; act_number: number; scene_number: number }[]): Map<string, any[]> => {
    const sceneContentMap = new Map<string, any[]>()
    if (!content || !content.content) return sceneContentMap

    let currentAct = 1
    let currentSceneId: string | null = null
    let buffer: any[] = []

    const flushBuffer = () => {
        if (currentSceneId && buffer.length > 0) {
            sceneContentMap.set(currentSceneId, buffer)
        }
        buffer = []
    }

    content.content.forEach((node: any) => {
        if (node.type === 'heading') {
            const text = extractTextFromContent(node)

            const actMatch = text.match(/Akt\s+(\d+)/i)
            if (actMatch) {
                currentAct = parseInt(actMatch[1])
                return
            }

            const sceneMatch = text.match(/Scena\s+(\d+)/i)
            if (sceneMatch) {
                flushBuffer() // Flush previous
                const num = parseInt(sceneMatch[1])
                const found = scenes.find(s => s.act_number === currentAct && s.scene_number === num)
                currentSceneId = found ? found.id : null
                return
            }
        }

        if (node.type === 'horizontalRule') return

        buffer.push(node)
    })
    flushBuffer() // Final flush

    return sceneContentMap
}
