'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

const EASTER_EGG_NAMES = ['jessica', 'jessi', 'dżesika', 'dżesi', 'jesica', 'dzesika']

interface GreetingProps {
    name: string
}

export function Greeting({ name }: GreetingProps) {
    const t = useTranslations('Greeting')
    const [greetingPart, setGreetingPart] = useState<string>("")
    const [messagePart, setMessagePart] = useState<string>("")
    const [easterEgg, setEasterEgg] = useState<string | null>(null)

    useEffect(() => {
        const hour = new Date().getHours()
        let timeKey = "hello"
        let messageType = "morning"

        if (hour >= 5 && hour < 12) {
            timeKey = "morning"
            messageType = "morning"
        } else if (hour >= 12 && hour < 18) {
            timeKey = "afternoon"
            messageType = "afternoon"
        } else {
            timeKey = "evening"
            messageType = "evening"
        }

        // Get messages from translations
        // Note: We need to cast to any because getTranslations returns a rich object structure
        // and we want to access arrays. In a real app we might want a safer way.
        // However, useTranslations returns a function that can also return arrays if configured or keys.
        // A better approach with next-intl for arrays is to use keys like "morning.0", "morning.1" etc.
        // OR use t.raw('morning') if available/configured.
        // Let's try to use t.raw() if possible, or just iterate if we know the length.
        // But t.raw might not be available on the client hook in all versions.
        // Let's assume we can get the array via t.raw or similar.
        // Actually, standard next-intl usage for arrays is often t.raw('key').

        // Let's try a safer approach: get the array using t.raw if possible, 
        // or just pick a random index if we know the count. 
        // Since we defined 5 messages for each, we can just pick random 0-4.
        const randomIndex = Math.floor(Math.random() * 5)

        const timeGreeting = t(`timeGreeting.${timeKey}`)
        setGreetingPart(`${timeGreeting}, ${name}`)

        // We use the key pattern "morning.0", "morning.1" etc if we want to be type safe without raw,
        // but our JSON has arrays. 
        // next-intl allows accessing array elements by index: t('morning.0')
        setMessagePart(t(`${messageType}.${randomIndex}` as any))

        // Check for Easter Egg
        const lowerName = name.toLowerCase()
        const isTargetUser = EASTER_EGG_NAMES.some(n => lowerName.startsWith(n))

        if (isTargetUser) {
            const randomEggIndex = Math.floor(Math.random() * 5)
            setEasterEgg(t(`easterEgg.${randomEggIndex}` as any))
        } else {
            setEasterEgg(null)
        }
    }, [name, t])

    if (!greetingPart) {
        return (
            <div className="flex flex-col gap-1 py-1 opacity-0">
                <span className="text-2xl font-bold">Witaj {name}</span>
                <span className="text-base text-neutral-400">Ładowanie...</span>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-1 py-1">
            <span className="text-2xl font-bold text-white tracking-tight">
                {greetingPart}
            </span>
            <span className="text-base text-neutral-400 font-normal">
                {easterEgg || messagePart}
            </span>
        </div>
    )
}
