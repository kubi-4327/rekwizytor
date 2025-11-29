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
