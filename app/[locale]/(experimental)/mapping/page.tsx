'use client'

import { createClient } from "@/utils/supabase/client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Map, ArrowRight, Loader2 } from "lucide-react"
import { createLocation } from "@/app/actions/create-location"

type Location = {
    id: string
    name: string
    map_image_url: string | null
    type: string
}

export default function MappingPage() {
    const [locations, setLocations] = useState<Location[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        const fetchLocations = async () => {
            const { data } = await supabase
                .from('locations')
                .select('id, name, map_image_url, type')
                .in('type', ['main_storage', 'backstage', 'stage', 'other']) // Correct enum values
                .order('name')

            if (data) {
                setLocations(data)
            }
            setLoading(false)
        }

        fetchLocations()
    }, [])

    return (
        <div className="p-8 max-w-7xl mx-auto text-white">
            <header className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Mapowanie Wizualne</h1>
                <p className="text-neutral-400">Wybierz pomieszczenie, aby zarządzać jego planem cyfrowym.</p>
            </header>

            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="w-8 h-8 animate-spin text-burgundy-main" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {locations.map((loc) => (
                        <Link
                            key={loc.id}
                            href={`/mapping/${loc.id}`}
                            className="group block"
                        >
                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                className="bg-[#1e1e1e] border border-neutral-800 rounded-lg p-6 hover:border-burgundy-main transition-colors"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-2 bg-neutral-800 rounded-md group-hover:bg-burgundy-main/20 group-hover:text-burgundy-main transition-colors">
                                        <Map className="w-6 h-6" />
                                    </div>
                                    {loc.map_image_url && (
                                        <span className="text-xs px-2 py-1 bg-green-500/10 text-green-500 rounded-full border border-green-500/20">
                                            Zmapowane
                                        </span>
                                    )}
                                </div>
                                <h3 className="text-xl font-semibold mb-1">{loc.name}</h3>
                                <p className="text-sm text-neutral-500 uppercase tracking-wider">{loc.type}</p>

                                <div className="mt-4 flex items-center text-sm text-neutral-400 group-hover:text-white transition-colors">
                                    Edytuj plan <ArrowRight className="w-4 h-4 ml-2" />
                                </div>
                            </motion.div>
                        </Link>
                    ))}

                    {locations.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-16 text-neutral-500 bg-[#1e1e1e] rounded-lg border border-dashed border-neutral-800">
                            <Map className="w-12 h-12 mb-4 opacity-50" />
                            <p className="text-lg font-medium mb-2">Brak lokalizacji</p>
                            <p className="text-sm max-w-md text-center mb-6">
                                Nie znaleziono magazynów ani pokoi. Utwórz nową lokalizację, aby rozpocząć mapowanie.
                            </p>

                            <form action={async () => {
                                const formData = new FormData()
                                formData.append('name', 'Nowe Pomieszczenie')
                                formData.append('type', 'other')
                                await createLocation(formData)
                            }}>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-burgundy-main text-white rounded hover:bg-burgundy-hover transition-colors font-medium text-sm flex items-center"
                                >
                                    + Utworz losową lokalizację
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
