export const extractMentions = (content: any) => {
    const mentions: any[] = []

    const traverse = (node: any) => {
        if (node.type === 'userMention' || node.type === 'slashMention') {
            mentions.push({
                id: node.attrs.id,
                type: node.attrs.type,
                label: node.attrs.label
            })
        }

        if (node.content) {
            node.content.forEach(traverse)
        }
    }

    if (content) {
        traverse(content)
    }

    return mentions
}

export const extractTextFromContent = (content: any): string => {
    if (!content) return ''
    let text = ''

    const traverse = (node: any) => {
        if (node.type === 'text') {
            text += node.text + ' '
        } else if (node.type === 'userMention' || node.type === 'slashMention') {
            text += (node.attrs.label || '') + ' '
        }

        if (node.content) {
            node.content.forEach(traverse)
        }
    }

    traverse(content)
    return text.trim()
}

export const generateSceneNoteContent = (scenes: { act_number: number; scene_number: number; name: string | null }[]) => {
    const content: any[] = []

    // Sort scenes
    const sorted = [...scenes].sort((a, b) => {
        if (a.act_number !== b.act_number) return a.act_number - b.act_number
        return a.scene_number - b.scene_number
    })

    let lastAct = 0

    sorted.forEach(scene => {
        // Add Act header if changed
        if (scene.act_number !== lastAct) {
            content.push({
                type: 'heading',
                attrs: { level: 1 },
                content: [{ type: 'text', text: `Akt ${scene.act_number}` }]
            })
            lastAct = scene.act_number
        }

        // Scene Header
        const sceneName = scene.name ? ` - ${scene.name}` : ''
        content.push({
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: `Scena ${scene.scene_number}${sceneName}` }]
        })

        // Horizontal Line
        content.push({ type: 'horizontalRule' })

        // Empty Paragraph for user input
        content.push({ type: 'paragraph' })
        content.push({ type: 'paragraph' }) // Extra space
    })

    return {
        type: 'doc',
        content
    }
}

export const syncSceneNoteContent = (
    currentContent: any,
    oldScenes: { id: string; act_number: number; scene_number: number }[],
    newScenes: { id: string; act_number: number; scene_number: number; name: string | null }[]
) => {
    const contentBySceneId = new Map<string, any[]>()
    const unassignedContent: any[] = []

    // Parse current content
    let currentAct = 1 // Default
    let currentSceneId: string | null = null
    let capturedContent: any[] = []

    const flushCaptured = () => {
        if (currentSceneId && capturedContent.length > 0) {
            const existing = contentBySceneId.get(currentSceneId) || []
            contentBySceneId.set(currentSceneId, [...existing, ...capturedContent])
        } else if (capturedContent.length > 0) {
            // Check if it's purely empty (just empty paragraphs) - optionally discard
            const hasText = capturedContent.some(n => n.content || n.type === 'horizontalRule' || n.type === 'image')
            if (hasText) {
                unassignedContent.push(...capturedContent)
            }
        }
        capturedContent = []
    }

    if (currentContent && currentContent.content) {
        currentContent.content.forEach((node: any) => {
            // Detect Act Header
            if (node.type === 'heading' && node.attrs?.level === 1) {
                const text = extractTextFromContent(node)
                const match = text.match(/Akt\s+(\d+)/i)
                if (match) {
                    currentAct = parseInt(match[1])
                }
                return
            }

            // Detect Scene Header
            if (node.type === 'heading' && node.attrs?.level === 2) {
                const text = extractTextFromContent(node)
                const match = text.match(/Scena\s+(\d+)/i)

                if (match) {
                    flushCaptured() // Save previous block

                    const sceneNum = parseInt(match[1])
                    // Try to find the Scene ID from Old Scenes list
                    // Warning: Heuristic matching by Act/Scene number from OLD list
                    const foundOld = oldScenes.find(s => s.act_number === currentAct && s.scene_number === sceneNum)

                    if (foundOld) {
                        currentSceneId = foundOld.id
                    } else {
                        currentSceneId = null
                    }
                }
                return
            }

            // Detect Horizontal Rule (ignore as we regenerate it)
            if (node.type === 'horizontalRule') return

            // Capture Content
            capturedContent.push(node)
        })
        flushCaptured() // Final flush
    }

    // 2. Reconstruct
    // Sort new scenes
    const sortedNew = [...newScenes].sort((a, b) => {
        if (a.act_number !== b.act_number) return a.act_number - b.act_number
        return a.scene_number - b.scene_number
    })

    const generated: any[] = []
    let lastActNew = 0

    sortedNew.forEach(scene => {
        // Add Act header if changed
        if (scene.act_number !== lastActNew) {
            generated.push({
                type: 'heading',
                attrs: { level: 1 },
                content: [{ type: 'text', text: `Akt ${scene.act_number}` }]
            })
            lastActNew = scene.act_number
        }

        // Scene Header
        const sceneName = scene.name ? ` - ${scene.name}` : ''
        generated.push({
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: `Scena ${scene.scene_number}${sceneName}` }]
        })

        // Horizontal Line
        generated.push({ type: 'horizontalRule' })

        // 3. INJECT SAVED CONTENT
        const saved = contentBySceneId.get(scene.id)
        if (saved && saved.length > 0) {
            generated.push(...saved)
        } else {
            // Default spacing
            generated.push({ type: 'paragraph' })
        }

        // Remove from map to track what's left (deleted scenes)
        contentBySceneId.delete(scene.id)
    })

    // 4. Handle Deleted Scenes (Leftover in map)
    const deletedContent: any[] = []
    contentBySceneId.forEach((nodes, id) => {
        if (nodes.length > 0) deletedContent.push(...nodes)
    })

    if (deletedContent.length > 0 || unassignedContent.length > 0) {
        generated.push({
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Nieprzypisane / Usunięte' }]
        })
        generated.push({ type: 'horizontalRule' })
        generated.push(...deletedContent)
        generated.push(...unassignedContent)
    }

    return {
        type: 'doc',
        content: generated
    }
}
