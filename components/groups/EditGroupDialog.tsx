'use client'

import { Fragment, useState, useEffect } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { X, Loader2, Tag, Box, Layers, ClipboardList, Settings, Sparkles, BarChart, Notebook, Home, Star, Heart, Flag, Bookmark, Camera, Video, Mic, Music, Speaker, Monitor, Smartphone, Laptop, Tablet, Watch, Headphones, Battery, Zap, Sun, Moon, Cloud, Umbrella, Droplets, Snowflake, Flame, Wind, Anchor, Map, Compass, Navigation, Globe, Truck, Car, Bike, Plane, Ship, Package, ShoppingBag, ShoppingCart, Gift, CreditCard, Wallet, DollarSign, Euro, PoundSterling, Bitcoin, Briefcase, Folder, File, FileText, Image, Film, User, Users, UserPlus, UserMinus, UserCheck, UserX, Smile, Frown, Meh, ThumbsUp, ThumbsDown, Check, CheckCircle, AlertCircle, AlertTriangle, Info, HelpCircle, Search, Filter, SortAsc, SortDesc, List, Grid, Layout, LayoutGrid, LayoutList, LayoutPanelLeft, LayoutPanelTop, Sidebar, Menu, MoreHorizontal, MoreVertical, Plus, Minus, Trash, Edit, Save, Download, Upload, Share, Link as LinkIcon, ExternalLink, RefreshCw, RotateCw, RotateCcw, Shuffle, Repeat, Play, Pause, StopCircle, SkipBack, SkipForward, Volume, Volume1, Volume2, VolumeX, Mute, Unmute, Eye, EyeOff, Lock, Unlock, Key, Shield, ShieldCheck, ShieldAlert, ShieldOff } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/utils/supabase/client'
import { Database } from '@/types/supabase'
import { useRouter } from 'next/navigation'

type Group = Database['public']['Tables']['groups']['Row']

type Props = {
    group: Group | null
    isOpen: boolean
    onClose: () => void
}

const ICONS = [
    { name: 'Tag', icon: Tag },
    { name: 'Box', icon: Box },
    { name: 'Layers', icon: Layers },
    { name: 'ClipboardList', icon: ClipboardList },
    { name: 'Settings', icon: Settings },
    { name: 'Sparkles', icon: Sparkles },
    { name: 'BarChart', icon: BarChart },
    { name: 'Notebook', icon: Notebook },
    { name: 'Home', icon: Home },
    { name: 'Star', icon: Star },
    { name: 'Heart', icon: Heart },
    { name: 'Flag', icon: Flag },
    { name: 'Bookmark', icon: Bookmark },
    { name: 'Camera', icon: Camera },
    { name: 'Video', icon: Video },
    { name: 'Mic', icon: Mic },
    { name: 'Music', icon: Music },
    { name: 'Speaker', icon: Speaker },
    { name: 'Monitor', icon: Monitor },
    { name: 'Smartphone', icon: Smartphone },
    { name: 'Laptop', icon: Laptop },
    { name: 'Tablet', icon: Tablet },
    { name: 'Watch', icon: Watch },
    { name: 'Headphones', icon: Headphones },
    { name: 'Battery', icon: Battery },
    { name: 'Zap', icon: Zap },
    { name: 'Sun', icon: Sun },
    { name: 'Moon', icon: Moon },
    { name: 'Cloud', icon: Cloud },
    { name: 'Umbrella', icon: Umbrella },
    { name: 'Droplets', icon: Droplets },
    { name: 'Snowflake', icon: Snowflake },
    { name: 'Flame', icon: Flame },
    { name: 'Wind', icon: Wind },
    { name: 'Anchor', icon: Anchor },
    { name: 'Map', icon: Map },
    { name: 'Compass', icon: Compass },
    { name: 'Navigation', icon: Navigation },
    { name: 'Globe', icon: Globe },
    { name: 'Truck', icon: Truck },
    { name: 'Car', icon: Car },
    { name: 'Bike', icon: Bike },
    { name: 'Plane', icon: Plane },
    { name: 'Ship', icon: Ship },
    { name: 'Package', icon: Package },
    { name: 'ShoppingBag', icon: ShoppingBag },
    { name: 'ShoppingCart', icon: ShoppingCart },
    { name: 'Gift', icon: Gift },
    { name: 'CreditCard', icon: CreditCard },
    { name: 'Wallet', icon: Wallet },
    { name: 'DollarSign', icon: DollarSign },
    { name: 'Euro', icon: Euro },
    { name: 'PoundSterling', icon: PoundSterling },
    { name: 'Bitcoin', icon: Bitcoin },
    { name: 'Briefcase', icon: Briefcase },
    { name: 'Folder', icon: Folder },
    { name: 'File', icon: File },
    { name: 'FileText', icon: FileText },
    { name: 'Image', icon: Image },
    { name: 'Film', icon: Film },
    { name: 'User', icon: User },
    { name: 'Users', icon: Users },
    { name: 'Smile', icon: Smile },
    { name: 'Frown', icon: Frown },
    { name: 'Meh', icon: Meh },
    { name: 'ThumbsUp', icon: ThumbsUp },
    { name: 'ThumbsDown', icon: ThumbsDown },
    { name: 'Check', icon: Check },
    { name: 'AlertCircle', icon: AlertCircle },
    { name: 'Info', icon: Info },
    { name: 'HelpCircle', icon: HelpCircle },
    { name: 'Search', icon: Search },
    { name: 'Filter', icon: Filter },
    { name: 'List', icon: List },
    { name: 'Grid', icon: Grid },
    { name: 'Layout', icon: Layout },
    { name: 'Menu', icon: Menu },
    { name: 'MoreHorizontal', icon: MoreHorizontal },
    { name: 'Trash', icon: Trash },
    { name: 'Edit', icon: Edit },
    { name: 'Save', icon: Save },
    { name: 'Download', icon: Download },
    { name: 'Upload', icon: Upload },
    { name: 'Share', icon: Share },
    { name: 'Link', icon: LinkIcon },
    { name: 'ExternalLink', icon: ExternalLink },
    { name: 'RefreshCw', icon: RefreshCw },
    { name: 'Play', icon: Play },
    { name: 'Pause', icon: Pause },
    { name: 'Eye', icon: Eye },
    { name: 'EyeOff', icon: EyeOff },
    { name: 'Lock', icon: Lock },
    { name: 'Unlock', icon: Unlock },
    { name: 'Key', icon: Key },
    { name: 'Shield', icon: Shield },
]

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
                                    <button
                                        type="button"
                                        className="rounded-md text-neutral-400 hover:text-white focus:outline-none"
                                        onClick={onClose}
                                    >
                                        <X className="h-6 w-6" aria-hidden="true" />
                                    </button>
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
                                                className="block w-full rounded-md border-0 bg-neutral-900 py-1.5 text-white shadow-sm ring-1 ring-inset ring-neutral-800 placeholder:text-neutral-500 focus:ring-2 focus:ring-inset focus:ring-white sm:text-sm sm:leading-6"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-neutral-400 mb-2">
                                                Icon
                                            </label>
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
                                    <button
                                        type="button"
                                        className="inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-black shadow-sm hover:bg-neutral-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50 disabled:cursor-not-allowed"
                                        onClick={handleSave}
                                        disabled={isSaving}
                                    >
                                        {isSaving ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            'Save Changes'
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        className="inline-flex w-full justify-center rounded-md bg-neutral-800 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-neutral-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-600"
                                        onClick={onClose}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition.Root>
    )
}
