'use client'

import { Calendar, Download } from 'lucide-react'
import { useState } from 'react'

type Props = {
    title: string
    date: string
    location?: string
    details?: string
    className?: string
}

export function AddToCalendar({ title, date, location, details, className }: Props) {
    const [isOpen, setIsOpen] = useState(false)

    const eventDate = new Date(date)
    const endDate = new Date(eventDate.getTime() + 2 * 60 * 60 * 1000) // Default 2 hours

    const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${eventDate.toISOString().replace(/-|:|\.\d\d\d/g, "")}/${endDate.toISOString().replace(/-|:|\.\d\d\d/g, "")}&details=${encodeURIComponent(details || '')}&location=${encodeURIComponent(location || '')}&sf=true&output=xml`

    const downloadIcs = () => {
        const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
URL:${document.location.href}
DTSTART:${eventDate.toISOString().replace(/-|:|\.\d\d\d/g, "")}
DTEND:${endDate.toISOString().replace(/-|:|\.\d\d\d/g, "")}
SUMMARY:${title}
DESCRIPTION:${details || ''}
LOCATION:${location || ''}
END:VEVENT
END:VCALENDAR`

        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `${title}.ics`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-md transition-colors ${className || ''}`}
                title="Add to Calendar"
            >
                <Calendar className="h-4 w-4" />
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 rounded-md border border-neutral-800 bg-neutral-900 shadow-lg z-20 py-1">
                        <a
                            href={googleUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white"
                            onClick={() => setIsOpen(false)}
                        >
                            <Calendar className="mr-2 h-3 w-3" />
                            Google Calendar
                        </a>
                        <button
                            onClick={() => {
                                downloadIcs()
                                setIsOpen(false)
                            }}
                            className="flex w-full items-center px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white"
                        >
                            <Download className="mr-2 h-3 w-3" />
                            Apple Calendar (.ics)
                        </button>
                    </div>
                </>
            )}
        </div>
    )
}
