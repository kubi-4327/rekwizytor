import { JSONContent } from '@tiptap/react'

export interface LiveScene {
    id: string
    name: string
    items: {
        id: string
        text: string
    }[]
    isPreShow: boolean
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
    const startScene = (name: string, isPreShow: boolean = false) => {
        if (currentScene && currentScene.items.length === 0) {
            // Remove empty previous scene if it was just a header without items? 
            // optional behavior, but let's keep it to allow empty scenes as transitions
        }
        currentScene = {
            id: generateId(name, scenes.length),
            name: name,
            items: [],
            isPreShow
        }
        scenes.push(currentScene)
    }

    // Default first scene if content starts without a header
    startScene("Wstęp", false)

    content.content.forEach((node, index) => {
        const type = node.type

        if (type === 'heading') {
            const text = node.content?.[0]?.text || 'Bez tytułu'
            const isPreShow = text.toLowerCase().includes('przed spektaklem') ||
                text.toLowerCase().includes('stage 0') ||
                text.toLowerCase().includes('before show')

            startScene(text, isPreShow)
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
        }
    })

    // Filter out the default "Wstęp" scene if it remained empty and we have other scenes
    if (scenes.length > 1 && scenes[0].name === "Wstęp" && scenes[0].items.length === 0) {
        scenes.shift()
    }

    return scenes
}
