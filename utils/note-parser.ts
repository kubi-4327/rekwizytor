import { JSONContent } from '@tiptap/react'

export interface LiveScene {
    id: string
    name: string
    items: {
        id: string
        text: string
    }[]
    type: 'scene' | 'act' | 'preshow'
}

function generateId(text: string, index: number): string {
    return `${text.slice(0, 10).replace(/[^a-z0-9]/gi, '_')}_${index}`
}

export function parseNoteToLiveScenes(content: JSONContent): LiveScene[] {
    const scenes: LiveScene[] = []
    let currentScene: LiveScene | null = null
    let globalIndex = 0

    if (!content.content) return []

    // Helper to start a new scene
    const startScene = (name: string, type: 'scene' | 'act' | 'preshow' = 'scene') => {
        if (currentScene && currentScene.items.length === 0) {
            // Remove empty previous scene if it was just a header without items? 
            // optional behavior, but let's keep it to allow empty scenes as transitions
        }
        currentScene = {
            id: generateId(name, scenes.length),
            name: name,
            items: [],
            type
        }
        scenes.push(currentScene)
    }

    // Default first scene if content starts without a header
    startScene("Wstęp", 'scene')

    content.content.forEach((node, index) => {
        const type = node.type

        if (type === 'heading') {
            const text = node.content?.[0]?.text || 'Bez tytułu'
            const lowerText = text.toLowerCase()

            let sceneType: 'scene' | 'act' | 'preshow' = 'scene'

            if (lowerText.includes('przed spektaklem') || lowerText.includes('stage 0') || lowerText.includes('before show')) {
                sceneType = 'preshow'
            } else if (lowerText.startsWith('akt') || lowerText.startsWith('act')) {
                sceneType = 'act'
            }

            startScene(text, sceneType)
        } else if (type === 'bulletList' || type === 'orderedList') {
            if (node.content) {
                node.content.forEach((listItem) => {
                    // listItem content is usually a paragraph
                    listItem.content?.forEach((p) => {
                        if (p.content) {
                            const itemText = p.content.map(c => c.text).join('')
                            if (currentScene && itemText.trim()) {
                                currentScene.items.push({
                                    id: generateId(itemText, globalIndex++),
                                    text: itemText
                                })
                            }
                        }
                    })
                })
            }
        } else if (type === 'taskList') {
            if (node.content) {
                node.content.forEach((taskItem) => {
                    // taskItem content is usually a paragraph
                    taskItem.content?.forEach((p) => {
                        if (p.content) {
                            const itemText = p.content.map(c => c.text).join('')
                            if (currentScene && itemText.trim()) {
                                currentScene.items.push({
                                    id: generateId(itemText, globalIndex++),
                                    text: itemText
                                })
                            }
                        }
                    })
                })
            }
        } else if (type === 'paragraph') {
            // Treat top-level paragraphs (under a header) as items too? 
            // Yes, user might just write lines.
            if (node.content) {
                const itemText = node.content.map(c => c.text).join('')
                if (currentScene && itemText.trim()) {
                    currentScene.items.push({
                        id: generateId(itemText, globalIndex++),
                        text: itemText
                    })
                }
            }
        }
    })

    // Filter out the default "Wstęp" scene if it remained empty and we have other scenes
    if (scenes.length > 1 && scenes[0].name === "Wstęp" && scenes[0].items.length === 0) {
        scenes.shift()
    }

    return scenes
}
