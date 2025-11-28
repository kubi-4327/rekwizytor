'use client'

import { useEffect, useState } from 'react'

const MESSAGES_MORNING = [
    "Gotowy na nowy dzień?",
    "Kawa już wypita?",
    "Owocnego poranka!",
    "Zacznijmy ten dzień produktywnie.",
    "Co dzisiaj w planach?"
]

const MESSAGES_AFTERNOON = [
    "Jak mija dzień?",
    "Wszystko pod kontrolą?",
    "Chwila przerwy czy działamy dalej?",
    "Jak tam rekwizyty?",
    "Miłego popołudnia!"
]

const MESSAGES_EVENING = [
    "Jak minął dzień?",
    "Jeszcze pracujesz?",
    "Spokojnego wieczoru.",
    "Czas na podsumowanie dnia?",
    "Odpoczywasz czy działasz?"
]

const EASTER_EGG_NAMES = ['jessica', 'jessi', 'dżesika', 'dżesi', 'jesica', 'dzesika']
const EASTER_EGG_MESSAGES = [
    "Pamiętaj nie dokręcać słoika!",
    "Smacznej herbatki ☕",
    "A Ty nie byłaś chora? 🤔",
    "Miłego dnia, tylko bez stresu!",
    "Odpocznij chwilę, robota nie zając."
]

interface GreetingProps {
    name: string
}

export function Greeting({ name }: GreetingProps) {
    const [greetingPart, setGreetingPart] = useState<string>("")
    const [messagePart, setMessagePart] = useState<string>("")
    const [easterEgg, setEasterEgg] = useState<string | null>(null)

    useEffect(() => {
        const hour = new Date().getHours()
        let selectedMessages: string[]
        let timeGreeting = "Witaj"

        if (hour >= 5 && hour < 12) {
            selectedMessages = MESSAGES_MORNING
            timeGreeting = "Dzień dobry"
        } else if (hour >= 12 && hour < 18) {
            selectedMessages = MESSAGES_AFTERNOON
            timeGreeting = "Cześć"
        } else {
            selectedMessages = MESSAGES_EVENING
            timeGreeting = "Dobry wieczór"
        }

        const randomIndex = Math.floor(Math.random() * selectedMessages.length)
        setGreetingPart(`${timeGreeting}, ${name}`)
        setMessagePart(selectedMessages[randomIndex])

        // Check for Easter Egg
        const lowerName = name.toLowerCase()
        const isTargetUser = EASTER_EGG_NAMES.some(n => lowerName.startsWith(n))

        if (isTargetUser) {
            const randomEggIndex = Math.floor(Math.random() * EASTER_EGG_MESSAGES.length)
            setEasterEgg(EASTER_EGG_MESSAGES[randomEggIndex])
        } else {
            setEasterEgg(null)
        }
    }, [name])

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
