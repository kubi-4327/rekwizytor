import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { Check, User, Box, MapPin, Tag, Calendar } from 'lucide-react'

export default forwardRef((props: any, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0)

    const selectItem = (index: number) => {
        const item = props.items[index]
        if (item) {
            props.command({ ...item })
        }
    }

    const upHandler = () => {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length)
    }

    const downHandler = () => {
        setSelectedIndex((selectedIndex + 1) % props.items.length)
    }

    const enterHandler = () => {
        selectItem(selectedIndex)
    }

    useEffect(() => setSelectedIndex(0), [props.items])

    useImperativeHandle(ref, () => ({
        onKeyDown: ({ event }: { event: KeyboardEvent }) => {
            if (event.key === 'ArrowUp') {
                upHandler()
                return true
            }
            if (event.key === 'ArrowDown') {
                downHandler()
                return true
            }
            if (event.key === 'Enter') {
                enterHandler()
                return true
            }
            return false
        },
    }))

    if (!props.items || props.items.length === 0) {
        return null
    }

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden min-w-[200px] max-w-[300px] max-h-[400px] overflow-y-auto z-50">
            {props.items.map((item: any, index: number) => (
                <button
                    className={`flex items-start w-full text-left p-2 text-sm transition-colors ${index === selectedIndex
                        ? 'bg-zinc-100 dark:bg-zinc-800'
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                        }`}
                    key={index}
                    onClick={() => selectItem(index)}
                >
                    {item.type === 'item' ? (
                        <div className="flex gap-3 w-full">
                            <div className="relative w-10 h-10 shrink-0 bg-zinc-100 dark:bg-zinc-800 rounded overflow-hidden border border-zinc-200 dark:border-zinc-700">
                                {item.image_url ? (
                                    <img src={item.image_url} alt={item.label} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-zinc-400">
                                        <Box size={16} />
                                    </div>
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{item.label}</div>
                                {item.notes && (
                                    <div className="text-xs text-zinc-500 truncate mt-0.5">{item.notes}</div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center w-full">
                            {item.icon && <span className="mr-2 opacity-60 text-zinc-500">{item.icon}</span>}
                            <span className="text-zinc-700 dark:text-zinc-300">{item.label}</span>
                        </div>
                    )}
                </button>
            ))}
        </div>
    )
})
