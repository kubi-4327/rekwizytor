/**
 * This file will export the tool definitions that the AI Agent can use.
 * Tools will map to server actions or Supabase calls.
 */

export const AGENT_TOOLS = [
    {
        name: 'add_group',
        description: 'Create a new group/category for items',
        parameters: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Name of the group' },
                parentId: { type: 'string', description: 'Optional parent group ID' }
            },
            required: ['name']
        }
    },
    // Future tools: move_items, check_item, etc.
]
