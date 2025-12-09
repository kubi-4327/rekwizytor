'use client'

import { Fragment, useState, useEffect } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import {
    X, Tag, Box, Package, Layers, Archive, ShoppingBag,
    Armchair, Sofa, Lamp, Bed, DoorOpen, Frame,
    Hammer, Wrench, Ruler, Paintbrush, Palette, Scissors, Axe,
    Tv, Radio, Mic, Speaker, Camera, Video, Laptop, Smartphone, Watch, Plug, Battery,
    Utensils, Wine, Coffee, ChefHat,
    Shirt, Glasses, Umbrella, Briefcase, Backpack,
    Stethoscope, Syringe, Thermometer,
    Music, Guitar, Drum, Clapperboard, Ticket,
    Flower, Leaf, Feather, Tent, Flame, Snowflake,
    Sword, Shield, Target,
    Book, Newspaper, Scroll, FileText, Pen,
    Car, Bike, Truck, Plane, Ship,
    Ghost, Skull, Crown, Gem, Gift, Key,
    Sun, TreeDeciduous, Lock, Apple, Headphones, Star,
    Lightbulb, Zap, Hourglass, Map, Compass, Anchor,
    Warehouse, Container, HardHat, PaintBucket, Brush
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/utils/supabase/client'
import { Database } from '@/types/supabase'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

type Group = Database['public']['Tables']['groups']['Row']

type Props = {
    group: Group | null
    isOpen: boolean
    onClose: () => void
}

const ICONS = [
    // Storage & General
    { name: 'Tag', icon: Tag },
    { name: 'Box', icon: Box },
    { name: 'Package', icon: Package },
    { name: 'Archive', icon: Archive },
    { name: 'Layers', icon: Layers },
    { name: 'ShoppingBag', icon: ShoppingBag },
    { name: 'Warehouse', icon: Warehouse },
    { name: 'Container', icon: Container },

    // Furniture & Decor
    { name: 'Armchair', icon: Armchair },
    { name: 'Sofa', icon: Sofa },
    { name: 'Lamp', icon: Lamp },
    { name: 'Bed', icon: Bed },
    { name: 'DoorOpen', icon: DoorOpen },
    { name: 'Frame', icon: Frame },
    { name: 'Lightbulb', icon: Lightbulb },
    { name: 'Hourglass', icon: Hourglass },

    // Tools & Construction
    { name: 'Hammer', icon: Hammer },
    { name: 'Wrench', icon: Wrench },
    { name: 'Ruler', icon: Ruler },
    { name: 'Paintbrush', icon: Paintbrush },
    { name: 'Palette', icon: Palette },
    { name: 'Scissors', icon: Scissors },
    { name: 'Axe', icon: Axe },
    { name: 'HardHat', icon: HardHat },
    { name: 'PaintBucket', icon: PaintBucket },
    { name: 'Brush', icon: Brush },

    // Electronics
    { name: 'Tv', icon: Tv },
    { name: 'Radio', icon: Radio },
    { name: 'Mic', icon: Mic },
    { name: 'Speaker', icon: Speaker },
    { name: 'Camera', icon: Camera },
    { name: 'Video', icon: Video },
    { name: 'Laptop', icon: Laptop },
    { name: 'Smartphone', icon: Smartphone },
    { name: 'Watch', icon: Watch },
    { name: 'Plug', icon: Plug },
    { name: 'Battery', icon: Battery },
    { name: 'Headphones', icon: Headphones },
    { name: 'Zap', icon: Zap },

    // Kitchen & Food
    { name: 'Utensils', icon: Utensils },
    { name: 'Wine', icon: Wine },
    { name: 'Coffee', icon: Coffee },
    { name: 'ChefHat', icon: ChefHat },
    { name: 'Apple', icon: Apple },

    // Clothing & Accessories
    { name: 'Shirt', icon: Shirt },
    { name: 'Glasses', icon: Glasses },
    { name: 'Umbrella', icon: Umbrella },
    { name: 'Briefcase', icon: Briefcase },
    { name: 'Backpack', icon: Backpack },
    { name: 'Gem', icon: Gem },
    { name: 'Crown', icon: Crown },

    // Medical
    { name: 'Stethoscope', icon: Stethoscope },
    { name: 'Syringe', icon: Syringe },
    { name: 'Thermometer', icon: Thermometer },
    { name: 'Skull', icon: Skull },

    // Arts & Entertainment
    { name: 'Music', icon: Music },
    { name: 'Guitar', icon: Guitar },
    { name: 'Drum', icon: Drum },
    { name: 'Clapperboard', icon: Clapperboard },
    { name: 'Ticket', icon: Ticket },
    { name: 'Ghost', icon: Ghost },

    // Nature & Outdoor
    { name: 'Flower', icon: Flower },
    { name: 'Leaf', icon: Leaf },
    { name: 'Feather', icon: Feather },
    { name: 'Tent', icon: Tent },
    { name: 'Flame', icon: Flame },
    { name: 'Snowflake', icon: Snowflake },
    { name: 'Sun', icon: Sun },
    { name: 'TreeDeciduous', icon: TreeDeciduous },
    { name: 'Map', icon: Map },
    { name: 'Compass', icon: Compass },

    // Weapons & Action
    { name: 'Sword', icon: Sword },
    { name: 'Shield', icon: Shield },
    { name: 'Target', icon: Target },

    // Office & Paper
    { name: 'Book', icon: Book },
    { name: 'Newspaper', icon: Newspaper },
    { name: 'Scroll', icon: Scroll },
    { name: 'FileText', icon: FileText },
    { name: 'Pen', icon: Pen },
    { name: 'Gift', icon: Gift },
    { name: 'Key', icon: Key },
    { name: 'Lock', icon: Lock },

    // Vehicles
    { name: 'Car', icon: Car },
    { name: 'Bike', icon: Bike },
    { name: 'Truck', icon: Truck },
    { name: 'Plane', icon: Plane },
    { name: 'Ship', icon: Ship },
    { name: 'Anchor', icon: Anchor },

    // Misc
    { name: 'Star', icon: Star },
]

const KEYWORD_MAPPINGS: Record<string, string[]> = {
    'meble': ['Armchair', 'Sofa', 'Bed', 'Lamp', 'Frame'],
    'krzesło': ['Armchair', 'Sofa'],
    'stół': ['Frame', 'Box'], // No direct table icon, using generic
    'oświetlenie': ['Lamp', 'Plug', 'Sun', 'Lightbulb'],
    'narzędzia': ['Hammer', 'Wrench', 'Ruler', 'Axe', 'Brush', 'PaintBucket', 'HardHat'],
    'budowa': ['Hammer', 'Wrench', 'Paintbrush', 'HardHat'],
    'elektronika': ['Tv', 'Radio', 'Laptop', 'Smartphone', 'Plug', 'Zap'],
    'audio': ['Mic', 'Speaker', 'Headphones', 'Music', 'Radio'],
    'wideo': ['Camera', 'Video', 'Tv', 'Clapperboard'],
    'kuchnia': ['Utensils', 'ChefHat', 'Coffee', 'Wine'],
    'jedzenie': ['Utensils', 'Apple', 'Coffee'],
    'naczynia': ['Utensils', 'Coffee', 'Wine'],
    'ubrania': ['Shirt', 'Glasses', 'Briefcase', 'Backpack'],
    'kostiumy': ['Shirt', 'Crown', 'Glasses', 'Gem'],
    'medyczne': ['Stethoscope', 'Syringe', 'Thermometer', 'Skull'],
    'szpital': ['Bed', 'Stethoscope', 'Syringe'],
    'muzyka': ['Music', 'Guitar', 'Drum', 'Mic', 'Headphones'],
    'instrumenty': ['Guitar', 'Drum', 'Music'],
    'biuro': ['Briefcase', 'Book', 'Pen', 'FileText', 'Laptop'],
    'dokumenty': ['FileText', 'Newspaper', 'Scroll', 'Archive'],
    'papier': ['FileText', 'Book', 'Scroll'],
    'broń': ['Sword', 'Shield', 'Target', 'Axe'],
    'wojsko': ['Sword', 'Shield', 'Tent', 'Target'],
    'pojazdy': ['Car', 'Truck', 'Bike', 'Plane', 'Ship', 'Anchor'],
    'transport': ['Truck', 'Car', 'Box', 'Package', 'Container'],
    'plener': ['Tent', 'TreeDeciduous', 'Flower', 'Leaf', 'Sun', 'Map', 'Compass'],
    'przyroda': ['Flower', 'Leaf', 'Feather', 'Flame', 'TreeDeciduous', 'Sun'],
    'magazyn': ['Box', 'Package', 'Archive', 'Layers', 'Warehouse', 'Container'],
    'pudła': ['Box', 'Package', 'Archive', 'Container'],
    'różne': ['Box', 'Star', 'Ghost', 'Gift', 'Hourglass'],
    'ozdoby': ['Gem', 'Crown', 'Frame', 'Flower', 'Star'],
    'klucze': ['Key', 'Lock'],
}

const getSuggestedIcons = (inputName: string): typeof ICONS => {
    if (!inputName) return []

    const lowerName = inputName.toLowerCase()
    const suggestions = new Set<string>()

    // Check mappings
    Object.entries(KEYWORD_MAPPINGS).forEach(([keyword, icons]) => {
        if (lowerName.includes(keyword) || keyword.includes(lowerName)) {
            icons.forEach(icon => suggestions.add(icon))
        }
    })

    // Check direct name matches (fuzzy)
    ICONS.forEach(item => {
        if (item.name.toLowerCase().includes(lowerName)) {
            suggestions.add(item.name)
        }
    })

    // Return top 3 icon objects
    return Array.from(suggestions)
        .map(name => ICONS.find(i => i.name === name))
        .filter((i): i is typeof ICONS[0] => !!i)
        .slice(0, 3)
}

export function EditGroupDialog({ group, isOpen, onClose }: Props) {
    const t = useTranslations('Groups') // Assuming translations exist or fallback
    const supabase = createClient()
    const router = useRouter()

    const [name, setName] = useState('')
    const [selectedIcon, setSelectedIcon] = useState<string | null>(null)
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        if (group) {
            setName(group.name)
            setSelectedIcon(group.icon)
        }
    }, [group])

    const handleSave = async () => {
        if (!group) return
        setIsSaving(true)
        try {
            const { error } = await supabase
                .from('groups')
                .update({
                    name,
                    icon: selectedIcon
                })
                .eq('id', group.id)

            if (error) throw error

            router.refresh()
            onClose()
        } catch (error) {
            console.error('Failed to update group:', error)
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <Transition.Root show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/80 transition-opacity" />
                </Transition.Child>

                <div className="fixed inset-0 z-10 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-[#1a1a1a] px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6 border border-neutral-800">
                                <div className="absolute right-4 top-4">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="text-neutral-400 hover:text-white"
                                        onClick={onClose}
                                    >
                                        <X className="h-6 w-6" aria-hidden="true" />
                                    </Button>
                                </div>

                                <div className="mt-3 sm:mt-5">
                                    <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-white mb-6">
                                        Edit Group
                                    </Dialog.Title>

                                    <div className="space-y-6">
                                        <div>
                                            <label htmlFor="name" className="block text-sm font-medium text-neutral-400 mb-2">
                                                Name
                                            </label>
                                            <input
                                                type="text"
                                                id="name"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="block w-full rounded-md border-0 bg-neutral-900 py-1.5 px-3 text-white shadow-sm ring-1 ring-inset ring-neutral-800 placeholder:text-neutral-500 focus:ring-2 focus:ring-inset focus:ring-white sm:text-sm sm:leading-6"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-neutral-400 mb-2">
                                                Icon
                                            </label>

                                            {/* Suggested Icons */}
                                            {getSuggestedIcons(name).length > 0 && (
                                                <div className="mb-3">
                                                    <p className="text-xs text-neutral-500 mb-2">Suggested</p>
                                                    <div className="flex gap-2">
                                                        {getSuggestedIcons(name).map((item) => (
                                                            <button
                                                                key={`suggested-${item.name}`}
                                                                onClick={() => setSelectedIcon(item.name)}
                                                                className={`p-2 rounded-md flex items-center justify-center transition-colors border border-neutral-700 ${selectedIcon === item.name
                                                                    ? 'bg-white text-black'
                                                                    : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
                                                                    }`}
                                                                title={item.name}
                                                            >
                                                                <item.icon className="w-5 h-5" />
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-6 gap-2 max-h-60 overflow-y-auto p-2 bg-neutral-900 rounded-md border border-neutral-800">
                                                {ICONS.map((item) => (
                                                    <button
                                                        key={item.name}
                                                        onClick={() => setSelectedIcon(item.name)}
                                                        className={`p-2 rounded-md flex items-center justify-center transition-colors ${selectedIcon === item.name
                                                            ? 'bg-white text-black'
                                                            : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
                                                            }`}
                                                        title={item.name}
                                                    >
                                                        <item.icon className="w-5 h-5" />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-5 sm:mt-6 flex gap-3">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={onClose}
                                        className="w-full"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="primary" // Changed to primary to utilize white/black contrast or consistent burgundy
                                        onClick={handleSave}
                                        isLoading={isSaving}
                                        className="w-full bg-white text-black hover:bg-neutral-200" // Overriding to match original 'white' style or sticking to primary? Original was white. Let's stick to user request of "Unify". But maybe user likes the white button here? Let's use primary (Burgundy) for consistency as requested.
                                    >
                                        Save Changes
                                    </Button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition.Root>
    )
}
