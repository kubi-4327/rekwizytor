'use client'

import { useEffect, useState } from 'react'

const GREETINGS_MORNING = [
    "Dzień dobry {name}, gotowy na nowy dzień?",
    "Cześć {name}, kawa już wypita?",
    "Hej {name}, owocnego poranka!",
    "Witaj {name}, zacznijmy ten dzień produktywnie.",
    "Dzień dobry {name}, co dzisiaj w planach?"
]

const GREETINGS_AFTERNOON = [
    "Cześć {name}, jak mija dzień?",
    "Hej {name}, wszystko pod kontrolą?",
    "Witaj {name}, chwila przerwy czy działamy dalej?",
    "Siemanko {name}, jak tam rekwizyty?",
    "Hejka {name}, miłego popołudnia!"
]

const GREETINGS_EVENING = [
    "Dobry wieczór {name}, jak minął dzień?",
    "Cześć {name}, jeszcze pracujesz?",
    "Hej {name}, spokojnego wieczoru.",
    "Witaj {name}, czas na podsumowanie dnia?",
    "Dobry wieczór {name}, odpoczywasz czy działasz?"
]

interface GreetingProps {
    name: string
}

export function Greeting({ name }: GreetingProps) {
    const [greeting, setGreeting] = useState<string>("")

    useEffect(() => {
        const hour = new Date().getHours()
        let selectedGreetings: string[]

        if (hour >= 5 && hour < 12) {
            selectedGreetings = GREETINGS_MORNING
        } else if (hour >= 12 && hour < 18) {
            selectedGreetings = GREETINGS_AFTERNOON
        } else {
            selectedGreetings = GREETINGS_EVENING
        }

        const randomIndex = Math.floor(Math.random() * selectedGreetings.length)
        setGreeting(selectedGreetings[randomIndex].replace("{name}", name))
    }, [name])

    // Render a non-breaking space or a default greeting initially to avoid layout shift if possible,
    // but since we want random on client, we accept a small jump or show a default one.
    // To match server rendering (if we were to do it), we'd need a fixed one.
    // Let's show nothing until client side hydration to avoid mismatch text, 
    // or better, show a generic one that is replaced.
    // Given the design, a small fade in or just appearing is fine.
    if (!greeting) {
        return <span className="opacity-0">Witaj {name}</span> // Reserve space roughly
    }

    return (
        <span>
            {greeting}
        </span>
    )
}
