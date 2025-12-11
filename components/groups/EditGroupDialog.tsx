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
    Warehouse, Container, HardHat, PaintBucket, Brush,
    Clipboard, Folder, FolderOpen, BriefcaseBusiness,
    Monitor, Tablet, Printer, Projector,
    Trash, Trash2, Recycle,
    Dumbbell, Trophy, Medal,
    Circle, Square, Triangle, Hexagon, Octagon,
    Cloud, Moon, Wind, Droplets,
    Pizza, Sandwich, Cake, IceCream, Beaker, FlaskConical,
    Gavel, Scale, GraduationCap, School,
    Drama, VenetianMask, MessageSquare, Megaphone,
    Joystick, Gamepad, Dice1, Dice5,
    Cat, Dog, Fish, Rabbit, Bird, Bug, PawPrint, Rat,
    Wand2, Sparkles, PartyPopper, Rocket, Bot, Castle,
    Baby, Accessibility, Building2, Footprints,
    Phone, Banknote, Coins, CircleHelp, Disc3, Home, ShoppingBasket,
    Image, Mail, Atom, Beer, GlassWater, Banana, Cherry, Grape, Keyboard, Globe, Mic2, ToyBrick
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
    { name: 'ShoppingBasket', icon: ShoppingBasket },
    { name: 'Warehouse', icon: Warehouse },
    { name: 'Container', icon: Container },
    { name: 'Folder', icon: Folder },
    { name: 'FolderOpen', icon: FolderOpen },
    { name: 'Trash', icon: Trash },
    { name: 'CircleHelp', icon: CircleHelp },

    // Shape & Generic
    { name: 'Circle', icon: Circle },
    { name: 'Square', icon: Square },
    { name: 'Triangle', icon: Triangle },
    { name: 'Hexagon', icon: Hexagon },
    { name: 'Octagon', icon: Octagon },
    { name: 'Star', icon: Star },
    { name: 'Sparkles', icon: Sparkles },

    // Furniture & Decor
    { name: 'Armchair', icon: Armchair },
    { name: 'Sofa', icon: Sofa },
    { name: 'Lamp', icon: Lamp },
    { name: 'Bed', icon: Bed },
    { name: 'DoorOpen', icon: DoorOpen },
    { name: 'Frame', icon: Frame },
    { name: 'Lightbulb', icon: Lightbulb },
    { name: 'Hourglass', icon: Hourglass },
    { name: 'Home', icon: Home },
    { name: 'Image', icon: Image },

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

    // Electronics & Tech
    { name: 'Tv', icon: Tv },
    { name: 'Monitor', icon: Monitor },
    { name: 'Radio', icon: Radio },
    { name: 'Mic', icon: Mic },
    { name: 'Mic2', icon: Mic2 },
    { name: 'Speaker', icon: Speaker },
    { name: 'Camera', icon: Camera },
    { name: 'Video', icon: Video },
    { name: 'Laptop', icon: Laptop },
    { name: 'Tablet', icon: Tablet },
    { name: 'Smartphone', icon: Smartphone },
    { name: 'Phone', icon: Phone },
    { name: 'Watch', icon: Watch },
    { name: 'Printer', icon: Printer },
    { name: 'Projector', icon: Projector },
    { name: 'Plug', icon: Plug },
    { name: 'Battery', icon: Battery },
    { name: 'Headphones', icon: Headphones },
    { name: 'Zap', icon: Zap },
    { name: 'Bot', icon: Bot },
    { name: 'Rocket', icon: Rocket },
    { name: 'Keyboard', icon: Keyboard },

    // Kitchen & Food
    { name: 'Utensils', icon: Utensils },
    { name: 'Wine', icon: Wine },
    { name: 'Beer', icon: Beer },
    { name: 'GlassWater', icon: GlassWater },
    { name: 'Coffee', icon: Coffee },
    { name: 'ChefHat', icon: ChefHat },
    { name: 'Apple', icon: Apple },
    { name: 'Banana', icon: Banana },
    { name: 'Cherry', icon: Cherry },
    { name: 'Grape', icon: Grape },
    { name: 'Pizza', icon: Pizza },
    { name: 'Sandwich', icon: Sandwich },
    { name: 'Cake', icon: Cake },
    { name: 'IceCream', icon: IceCream },

    // Clothing & Accessories
    { name: 'Shirt', icon: Shirt },
    { name: 'Glasses', icon: Glasses },
    { name: 'Umbrella', icon: Umbrella },
    { name: 'Briefcase', icon: Briefcase },
    { name: 'BriefcaseBusiness', icon: BriefcaseBusiness },
    { name: 'Backpack', icon: Backpack },
    { name: 'Gem', icon: Gem },
    { name: 'Crown', icon: Crown },
    { name: 'Footprints', icon: Footprints },

    // Medical & Science
    { name: 'Stethoscope', icon: Stethoscope },
    { name: 'Syringe', icon: Syringe },
    { name: 'Thermometer', icon: Thermometer },
    { name: 'Skull', icon: Skull },
    { name: 'Beaker', icon: Beaker },
    { name: 'FlaskConical', icon: FlaskConical },
    { name: 'Atom', icon: Atom },

    // Arts, Theater & Entertainment
    { name: 'Music', icon: Music },
    { name: 'Disc3', icon: Disc3 },
    { name: 'Guitar', icon: Guitar },
    { name: 'Drum', icon: Drum },
    { name: 'Clapperboard', icon: Clapperboard },
    { name: 'Ticket', icon: Ticket },
    { name: 'Drama', icon: Drama },
    { name: 'VenetianMask', icon: VenetianMask },
    { name: 'Ghost', icon: Ghost },
    { name: 'Gamepad', icon: Gamepad },
    { name: 'Dice1', icon: Dice1 },
    { name: 'Dice5', icon: Dice5 },
    { name: 'PartyPopper', icon: PartyPopper },
    { name: 'Wand2', icon: Wand2 },
    { name: 'Castle', icon: Castle },

    // Nature, Animals & Outdoor
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
    { name: 'Cloud', icon: Cloud },
    { name: 'Moon', icon: Moon },
    { name: 'Wind', icon: Wind },
    { name: 'Droplets', icon: Droplets },
    { name: 'Cat', icon: Cat },
    { name: 'Dog', icon: Dog },
    { name: 'Fish', icon: Fish },
    { name: 'Bird', icon: Bird },
    { name: 'Rabbit', icon: Rabbit },
    { name: 'Bug', icon: Bug },
    { name: 'Rat', icon: Rat },
    { name: 'PawPrint', icon: PawPrint },
    { name: 'Globe', icon: Globe },

    // Weapons & Action
    { name: 'Sword', icon: Sword },
    { name: 'Shield', icon: Shield },
    { name: 'Target', icon: Target },

    // Office, Paper & School
    { name: 'Book', icon: Book },
    { name: 'Newspaper', icon: Newspaper },
    { name: 'Scroll', icon: Scroll },
    { name: 'FileText', icon: FileText },
    { name: 'Pen', icon: Pen },
    { name: 'Gift', icon: Gift },
    { name: 'Key', icon: Key },
    { name: 'Lock', icon: Lock },
    { name: 'Clipboard', icon: Clipboard },
    { name: 'GraduationCap', icon: GraduationCap },
    { name: 'School', icon: School },
    { name: 'Gavel', icon: Gavel },
    { name: 'Scale', icon: Scale },
    { name: 'Building2', icon: Building2 },
    { name: 'Mail', icon: Mail },
    { name: 'Banknote', icon: Banknote },
    { name: 'Coins', icon: Coins },

    // Vehicles
    { name: 'Car', icon: Car },
    { name: 'Bike', icon: Bike },
    { name: 'Truck', icon: Truck },
    { name: 'Plane', icon: Plane },
    { name: 'Ship', icon: Ship },
    { name: 'Anchor', icon: Anchor },
    { name: 'Accessibility', icon: Accessibility },

    // Sports & Awards
    { name: 'Trophy', icon: Trophy },
    { name: 'Medal', icon: Medal },
    { name: 'Dumbbell', icon: Dumbbell },

    // Communication & People
    { name: 'MessageSquare', icon: MessageSquare },
    { name: 'Megaphone', icon: Megaphone },
    { name: 'Baby', icon: Baby },
]

const KEYWORD_MAPPINGS: Record<string, string[]> = {
    // Specific Database Mappings
    'brzytwy': ['Scissors', 'Sword', 'Axe', 'Feather'],
    'telefony': ['Smartphone', 'Phone', 'Radio', 'Projector'],
    'banknoty': ['Banknote', 'Coins', 'BriefcaseBusiness', 'Gem'],
    'pieniądze': ['Banknote', 'Coins', 'BriefcaseBusiness', 'Gem'],
    'pudełka': ['Box', 'Package', 'Pizza', 'Gift'],
    'pizza': ['Pizza', 'Box'],
    'torby': ['ShoppingBag', 'ShoppingBasket', 'Briefcase', 'Backpack'],
    'nieznane': ['CircleHelp', 'Box', 'Ghost'],
    'różne': ['CircleHelp', 'Box', 'Sparkles', 'Star', 'Ghost', 'Gift', 'Hourglass', 'Circle', 'Square', 'Triangle', 'Hexagon', 'Octagon'],
    'plecaki': ['Backpack', 'Briefcase', 'Tent'],
    'księżyc': ['Moon', 'Star', 'Cloud'],
    'czarno na białym': ['FileText', 'Newspaper', 'Pen'],
    'żelazka': ['Shirt', 'Flame'],
    'płyty': ['Disc3', 'Music', 'Mic', 'Mic2'],
    'winyle': ['Disc3', 'Music'],
    'miski': ['ChefHat', 'Utensils', 'Circle'],
    'gospodarstwo': ['Home', 'Utensils', 'Lamp', 'Armchair'],
    'deski': ['Hammer', 'Ruler', 'Wrench', 'Axe'],
    'mopy': ['Brush', 'PaintBucket'],
    'książki': ['Book', 'School', 'Library'],
    'lampy': ['Lamp', 'Lightbulb', 'Flame'],
    'prezenty': ['Gift', 'PartyPopper', 'Star'],
    'krzesła': ['Armchair', 'Sofa'],
    'broń': ['Sword', 'Target', 'Shield'],
    'koszyki': ['ShoppingBasket', 'ShoppingBag'],
    'obrazy': ['Image', 'Frame', 'Palette'],
    'koperty': ['Mail', 'FileText'],
    'gazety': ['Newspaper', 'FileText'],
    'papiery': ['FileText', 'Scroll', 'Newspaper'],
    'piloty': ['Tv', 'Monitor', 'Radio'],
    'curie': ['Atom', 'FlaskConical', 'Beaker', 'Science'],
    'cabaret': ['Mic2', 'Drama', 'Music', 'Wine', 'PartyPopper'],
    'talerze': ['Circle', 'Disc3', 'Utensils'],
    'kufle': ['Beer', 'GlassWater'],
    'butelki': ['Wine', 'Beer', 'GlassWater', 'FlaskConical'],
    'segregatory': ['Folder', 'FolderOpen', 'Book'],
    'owoce': ['Apple', 'Banana', 'Cherry', 'Grape'],
    'maskotki': ['Baby', 'Cat', 'Dog', 'Rabbit', 'Bear', 'ToyBrick'],
    'pluszaki': ['Baby', 'Cat', 'Dog', 'Rabbit'],
    'materiałowe': ['Scissors', 'Shirt', 'Roller'],
    'maszyny': ['Keyboard', 'Printer', 'Monitor'],
    'maski': ['VenetianMask', 'Ghost', 'Drama'],
    'globusy': ['Globe', 'Map', 'Compass'],
    'jedzenie': ['Apple', 'Pizza', 'Banana', 'Cherry', 'Grape', 'Sandwich', 'Utensils', 'Coffee', 'Cake', 'IceCream'],
    'beetlejuice': ['Bug', 'Ghost', 'Skull', 'Wand2', 'Coffin'],
    'radia': ['Radio', 'Mic', 'Music'],
    'lampiony': ['Lamp', 'Flame', 'Sun'],
    'school of rock': ['Guitar', 'Drum', 'Music', 'School', 'Bus'],

    // General Categories
    'meble': ['Armchair', 'Sofa', 'Bed', 'Lamp', 'Frame'],
    'stół': ['Frame', 'Box'],
    'oświetlenie': ['Lamp', 'Plug', 'Sun', 'Lightbulb'],
    'lampa': ['Lamp', 'Lightbulb'],
    'narzędzia': ['Hammer', 'Wrench', 'Ruler', 'Axe', 'Brush', 'PaintBucket', 'HardHat'],
    'budowa': ['Hammer', 'Wrench', 'Paintbrush', 'HardHat'],
    'elektronika': ['Tv', 'Radio', 'Laptop', 'Smartphone', 'Plug', 'Zap', 'Monitor', 'Tablet', 'Bot', 'Rocket'],
    'komputer': ['Laptop', 'Monitor', 'Tablet'],
    'telefon': ['Smartphone'],
    'audio': ['Mic', 'Speaker', 'Headphones', 'Music', 'Radio'],
    'wideo': ['Camera', 'Video', 'Tv', 'Clapperboard', 'Projector'],
    'kuchnia': ['Utensils', 'ChefHat', 'Coffee', 'Wine', 'Pizza', 'Cake', 'Beer', 'GlassWater'],
    'picie': ['Wine', 'Coffee', 'Beaker'],
    'naczynia': ['Utensils', 'Coffee', 'Wine', 'Beaker', 'FlaskConical'],
    'ubrania': ['Shirt', 'Glasses', 'Briefcase', 'Backpack', 'Umbrella', 'Footprints'],
    'kostiumy': ['Shirt', 'Crown', 'Glasses', 'Gem', 'VenetianMask', 'Drama', 'Wand2'],
    'medyczne': ['Stethoscope', 'Syringe', 'Thermometer', 'Skull', 'Beaker', 'FlaskConical'],
    'szpital': ['Bed', 'Stethoscope', 'Syringe'],
    'muzyka': ['Music', 'Guitar', 'Drum', 'Mic', 'Headphones'],
    'instrumenty': ['Guitar', 'Drum', 'Music'],
    'teatr': ['Drama', 'VenetianMask', 'Ticket', 'Clapperboard', 'Megaphone', 'Castle', 'Mic2'],
    'sztuka': ['Palette', 'Paintbrush', 'Music', 'Drama', 'VenetianMask'],
    'biuro': ['Briefcase', 'Book', 'Pen', 'FileText', 'Laptop', 'Clipboard', 'BriefcaseBusiness', 'Printer', 'Projector', 'Mail'],
    'dokumenty': ['FileText', 'Newspaper', 'Scroll', 'Archive', 'Folder', 'Clipboard', 'Mail'],
    'papier': ['FileText', 'Book', 'Scroll', 'Newspaper'],
    'wojsko': ['Sword', 'Shield', 'Tent', 'Target', 'Medal', 'Rocket'],
    'pojazdy': ['Car', 'Truck', 'Bike', 'Plane', 'Ship', 'Anchor', 'Rocket', 'Accessibility'],
    'transport': ['Truck', 'Car', 'Box', 'Package', 'Container'],
    'plener': ['Tent', 'TreeDeciduous', 'Flower', 'Leaf', 'Sun', 'Map', 'Compass', 'Cloud', 'Moon', 'Wind'],
    'przyroda': ['Flower', 'Leaf', 'Feather', 'Flame', 'TreeDeciduous', 'Sun', 'Cloud', 'Moon', 'Wind', 'Droplets', 'Cat', 'Dog', 'Fish', 'Bird', 'Rabbit', 'Bug', 'PawPrint', 'Rat'],
    'zwierzęta': ['Cat', 'Dog', 'Fish', 'Bird', 'Rabbit', 'Bug', 'PawPrint', 'Rat'],
    'magazyn': ['Box', 'Package', 'Archive', 'Layers', 'Warehouse', 'Container', 'Folder'],
    'pudła': ['Box', 'Package', 'Archive', 'Container'],
    'ozdoby': ['Gem', 'Crown', 'Frame', 'Flower', 'Star', 'Sparkles', 'PartyPopper'],
    'klucze': ['Key', 'Lock'],
    'sport': ['Trophy', 'Medal', 'Dumbbell', 'Target', 'Gamepad', 'Dice1', 'Dice5'],
    'szkoła': ['School', 'GraduationCap', 'Book', 'Pen', 'Backpack', 'Clipboard'],
    'prawo': ['Gavel', 'Scale', 'Book', 'FileText'],
    'gry': ['Gamepad', 'Dice1', 'Dice5', 'Joystick'],
    'komunikacja': ['MessageSquare', 'Megaphone', 'Radio', 'Smartphone'],
    'śmieci': ['Trash', 'Trash2', 'Recycle'],
    'magia': ['Wand2', 'Sparkles', 'Ghost', 'Potion', 'Gem', 'Star', 'Moon', 'Atom'],
    'bajki': ['Castle', 'Crown', 'Wand2', 'Ghost', 'Baby'],
    'miasto': ['Building2', 'Car', 'Bus', 'Bike', 'Home'],
    'dziecko': ['Baby', 'PartyPopper', 'Gift', 'Gamepad'],
    'nauka': ['Beaker', 'FlaskConical', 'Bot', 'Rocket', 'Monitor', 'Atom', 'Globe']
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

    // Return top 5 icon objects
    return Array.from(suggestions)
        .map(name => ICONS.find(i => i.name === name))
        .filter((i): i is typeof ICONS[0] => !!i)
        .slice(0, 5)
}

export function EditGroupDialog({ group, isOpen, onClose }: Props) {
    const t = useTranslations('Groups')
    const supabase = createClient()
    const router = useRouter()

    const [name, setName] = useState('')
    const [selectedIcon, setSelectedIcon] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        if (group) {
            setName(group.name)

            // Auto-assign logic:
            // 1. Use existing icon if any
            // 2. Try to find suggested icon from name (first match)
            // 3. Fallback to 'Folder'
            const suggested = getSuggestedIcons(group.name)
            const autoIcon = group.icon || suggested[0]?.name || 'Folder'

            setSelectedIcon(autoIcon)
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

    // Helper text for translation fallback
    const labelTitle = t('editGroup', { defaultMessage: 'Edit Group' })
    const labelName = t('name', { defaultMessage: 'Name' })
    const labelIcon = t('icon', { defaultMessage: 'Icon' })
    const placeholderSearch = t('searchIcons', { defaultMessage: 'Search icons (e.g. box, krzesło)...' })
    const labelSuggested = t('suggested', { defaultMessage: 'Suggested' })
    const labelCancel = t('cancel', { defaultMessage: 'Cancel' })
    const labelSave = t('save', { defaultMessage: 'Save Changes' })

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
                                        {labelTitle}
                                    </Dialog.Title>

                                    <div className="space-y-6">
                                        <div>
                                            <label htmlFor="name" className="block text-sm font-medium text-neutral-400 mb-2">
                                                {labelName}
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
                                                {labelIcon}
                                            </label>

                                            <div className="mb-4">
                                                <input
                                                    type="text"
                                                    placeholder={placeholderSearch}
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    className="block w-full rounded-md border-0 bg-neutral-900 py-1.5 px-3 text-white shadow-sm ring-1 ring-inset ring-neutral-800 placeholder:text-neutral-500 focus:ring-2 focus:ring-inset focus:ring-white sm:text-sm sm:leading-6"
                                                />
                                            </div>

                                            {/* Suggested Icons */}
                                            {!searchTerm && getSuggestedIcons(name).length > 0 && (
                                                <div className="mb-3">
                                                    <p className="text-xs text-neutral-500 mb-2">{labelSuggested}</p>
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
                                                {ICONS
                                                    .filter(item => {
                                                        const lowerSearch = searchTerm.toLowerCase()
                                                        // Direct name match
                                                        if (item.name.toLowerCase().includes(lowerSearch)) return true

                                                        // Reverse lookup in mappings to allow searching by Polish term in the input
                                                        // E.g. user types "krzesło", we find 'Armchair' in mapping['krzesło']
                                                        const polishMatches = Object.entries(KEYWORD_MAPPINGS)
                                                            .filter(([key]) => key.includes(lowerSearch))
                                                            .flatMap(([, icons]) => icons)

                                                        return polishMatches.includes(item.name)
                                                    })
                                                    .map((item) => (
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
                                        {labelCancel}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="primary"
                                        onClick={handleSave}
                                        isLoading={isSaving}
                                        className="w-full"
                                    >
                                        {labelSave}
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
