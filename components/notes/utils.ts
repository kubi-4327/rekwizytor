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
