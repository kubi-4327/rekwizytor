import { ReactRenderer } from '@tiptap/react'
import tippy from 'tippy.js'
import MentionList from './MentionList'
import { createClient } from '@/utils/supabase/client'
import { Box, MapPin, Tag, User, Calendar } from 'lucide-react'
import React from 'react'

export const getItemSuggestions = async (query: string) => {
    const supabase = createClient()
    const { data } = await supabase
        .from('performance_props')
        .select('id, item_name, image_url')
        .ilike('item_name', `%${query}%`)
        .limit(5)
    return data?.map(d => ({
        id: d.id,
        label: d.item_name,
        type: 'item',
        image_url: d.image_url,
        notes: null,
        icon: <Box size={14} />
    })) || []
}



const fetchCategories = async (query: string) => {
    const supabase = createClient()
    const { data } = await supabase
        .from('groups')
        .select('id, name')
        .ilike('name', `%${query}%`)
        .limit(5)
    return data?.map(d => ({ id: d.id, label: d.name, type: 'category', icon: <Tag size={14} /> })) || []
}

const fetchLocations = async (query: string) => {
    const supabase = createClient()
    const { data } = await supabase
        .from('locations')
        .select('id, name')
        .ilike('name', `%${query}%`)
        .limit(5)
    return data?.map(d => ({ id: d.id, label: d.name, type: 'location', icon: <MapPin size={14} /> })) || []
}

const fetchUsers = async (query: string) => {
    const supabase = createClient()
    const { data } = await supabase
        .from('profiles')
        .select('id, full_name, username')
        .or(`full_name.ilike.%${query}%,username.ilike.%${query}%`)
        .limit(5)
    return data?.map(d => ({ id: d.id, label: d.full_name || d.username || 'Unknown', type: 'user', icon: <User size={14} /> })) || []
}

import { format, parse, isValid } from 'date-fns'

export const getDateSuggestions = (query: string) => {
    const options = [
        { id: 'today', label: 'Today', type: 'date', value: new Date().toISOString(), icon: <Calendar size={14} /> },
        { id: 'tomorrow', label: 'Tomorrow', type: 'date', value: new Date(Date.now() + 86400000).toISOString(), icon: <Calendar size={14} /> },
        { id: 'next-week', label: 'Next Week', type: 'date', value: new Date(Date.now() + 7 * 86400000).toISOString(), icon: <Calendar size={14} /> },
    ]

    if (!query) return options

    // Try to parse the query as a date
    // Supported formats: YYYY-MM-DD, DD.MM.YYYY, DD/MM/YYYY
    const formats = ['yyyy-MM-dd', 'dd.MM.yyyy', 'dd/MM/yyyy', 'd.MM.yyyy', 'd/MM/yyyy']
    let parsedDate: Date | null = null

    for (const fmt of formats) {
        const d = parse(query, fmt, new Date())
        if (isValid(d)) {
            parsedDate = d
            break
        }
    }

    if (parsedDate) {
        const formatted = format(parsedDate, 'MMM d, yyyy')
        return [
            {
                id: query,
                label: formatted,
                type: 'date',
                value: parsedDate.toISOString(),
                icon: <Calendar size={14} />
            },
            ...options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
        ]
    }

    return options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
}

export const getSlashSuggestions = async (query: string) => {
    const lower = query.toLowerCase()

    // Cancel if user types a space immediately after slash (e.g. "/ ")
    if (query.startsWith(' ')) return []

    // Trigger specific searches immediately if the command is typed
    if (lower === 'item' || lower.startsWith('item ')) {
        return await getItemSuggestions(query.slice(lower.startsWith('item ') ? 5 : 4))
    }
    if (lower === 'cat' || lower === 'category' || lower.startsWith('cat ') || lower.startsWith('category ')) {
        const offset = lower.startsWith('category ') ? 9 : (lower.startsWith('cat ') ? 4 : (lower === 'category' ? 8 : 3))
        return await fetchCategories(query.slice(offset))
    }
    if (lower === 'place' || lower.startsWith('place ')) {
        return await fetchLocations(query.slice(lower.startsWith('place ') ? 6 : 5))
    }
    if (lower === 'data' || lower.startsWith('data ')) {
        return getDateSuggestions(query.slice(lower.startsWith('data ') ? 5 : 4))
    }

    if (lower === 'user' || lower === 'person' || lower.startsWith('user ') || lower.startsWith('person ')) {
        return await getUserSuggestions(query.slice(lower.startsWith('person ') ? 7 : (lower.startsWith('user ') ? 5 : (lower === 'person' ? 6 : 4))))
    }

    const commands = [
        { id: 'cmd-item', label: 'Item', type: 'command', value: 'item', icon: <Box size={14} /> },
        { id: 'cmd-cat', label: 'Category', type: 'command', value: 'category', icon: <Tag size={14} /> },
        { id: 'cmd-place', label: 'Place', type: 'command', value: 'place', icon: <MapPin size={14} /> },
        { id: 'cmd-date', label: 'Date', type: 'command', value: 'data', icon: <Calendar size={14} /> },
        { id: 'cmd-user', label: 'Person', type: 'command', value: 'user', icon: <User size={14} /> },
        { id: 'cmd-preshow', label: 'Pre-show Stage', type: 'command', value: 'preshow', icon: <Box size={14} /> },
    ]
    return commands.filter(c => c.label.toLowerCase().startsWith(lower) || c.value.startsWith(lower))
}

export const getUserSuggestions = async (query: string) => {
    return await fetchUsers(query)
}

export const renderSuggestion = () => {
    let component: ReactRenderer | null = null
    let popup: any | null = null

    return {
        onStart: (props: any) => {
            component = new ReactRenderer(MentionList, {
                props,
                editor: props.editor,
            })

            if (!props.clientRect) {
                return
            }

            popup = tippy('body', {
                getReferenceClientRect: props.clientRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
            })
        },

        onUpdate(props: any) {
            component?.updateProps(props)

            if (!props.clientRect) {
                return
            }

            popup[0].setProps({
                getReferenceClientRect: props.clientRect,
            })
        },

        onKeyDown(props: any) {
            if (props.event.key === 'Escape') {
                popup[0].hide()
                return true
            }

            return (component?.ref as any)?.onKeyDown(props)
        },

        onExit() {
            popup[0].destroy()
            component?.destroy()
        },
    }
}
