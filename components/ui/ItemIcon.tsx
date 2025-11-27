import {
    Sword, Hammer, Armchair, Bed, Table, Tv, Radio, Laptop, Smartphone,
    Shirt, Glasses, HardHat, FileText, Book, Scroll, Wrench, Scissors,
    Lamp, Lightbulb, Flashlight, Box, Package, Music,
    Coffee, Utensils, Watch, Camera, Key, Lock, Map, Compass,
    Umbrella, Gift, Bell, Flag, Crown, Wine, Beer, Martini,
    GlassWater, Apple, Croissant, UtensilsCrossed, Image, Monitor,
    Disc, Pen, Feather, Mail, ShoppingBag, Backpack, Luggage,
    LucideIcon
} from 'lucide-react'

const ICON_MAP: Record<string, LucideIcon> = {
    // Weapons
    'miecz': Sword, 'szabla': Sword, 'nóż': Sword, 'sztylet': Sword, 'broń': Sword, 'pistolet': Sword,
    'młot': Hammer, 'topór': Hammer,

    // Furniture
    'krzesło': Armchair, 'fotel': Armchair, 'tron': Armchair, 'siedzisko': Armchair,
    'stół': Table, 'stolik': Table, 'biurko': Table, 'ławka': Table,
    'łóżko': Bed, 'kanapa': Bed, 'sofa': Bed, 'materac': Bed,
    'obraz': Image, 'lustro': Image, 'rama': Image,

    // Electronics
    'telewizor': Tv, 'tv': Tv, 'ekran': Tv, 'monitor': Monitor,
    'radio': Radio, 'głośnik': Radio, 'gramofon': Disc, 'płyta': Disc,
    'laptop': Laptop, 'komputer': Laptop,
    'telefon': Smartphone, 'smartfon': Smartphone, 'komórka': Smartphone,
    'aparat': Camera, 'kamera': Camera,

    // Clothing/Accessories
    'koszula': Shirt, 'spodnie': Shirt, 'ubranie': Shirt, 'kostium': Shirt,
    'okulary': Glasses, 'gogle': Glasses,
    'czapka': HardHat, 'kapelusz': HardHat, 'hełm': HardHat, 'kask': HardHat,
    'korona': Crown, 'diadem': Crown,
    'zegarek': Watch,
    'parasol': Umbrella,
    'torba': ShoppingBag, 'reklamówka': ShoppingBag,
    'plecak': Backpack,
    'walizka': Luggage,

    // Documents/Writing
    'dokument': FileText, 'list': FileText, 'papier': FileText, 'scenariusz': FileText,
    'książka': Book, 'tom': Book, 'zeszyt': Book,
    'zwój': Scroll, 'mapa': Map,
    'długopis': Pen, 'ołówek': Pen, 'pisak': Pen,
    'pióro': Feather,
    'koperta': Mail, 'poczta': Mail,

    // Tools
    'klucz': Key, 'kłódka': Lock,
    'nożyczki': Scissors,
    'narzędzie': Wrench,

    // Lighting
    'lampa': Lamp, 'lampka': Lamp, 'żyrandol': Lamp, 'latarnia': Lamp,
    'żarówka': Lightbulb,
    'latarka': Flashlight,

    // Containers
    'pudło': Box, 'pudełko': Box, 'karton': Box, 'skrzynia': Box,
    'paczka': Package, 'przesyłka': Package,
    'prezent': Gift,

    // Food & Drink
    'wino': Wine, 'butelka': Wine, 'alkohol': Wine, 'szampan': Wine,
    'piwo': Beer, 'kufel': Beer, 'puszka': Beer,
    'drink': Martini, 'koktajl': Martini, 'kieliszek': Martini,
    'woda': GlassWater, 'szklanka': GlassWater, 'napój': GlassWater, 'sok': GlassWater,
    'jabłko': Apple, 'owoc': Apple,
    'rogal': Croissant, 'chleb': Croissant, 'bułka': Croissant, 'pieczywo': Croissant, 'ciasto': Croissant,
    'jedzenie': UtensilsCrossed, 'posiłek': UtensilsCrossed, 'obiad': UtensilsCrossed,

    // Misc
    'instrument': Music, 'gitara': Music, 'skrzypce': Music,
    'kubek': Coffee, 'filiżanka': Coffee,
    'talerz': Utensils, 'sztućce': Utensils, 'naczynie': Utensils, 'miska': Utensils, 'garnek': Utensils, 'patelnia': Utensils,
    'kompas': Compass,
    'dzwonek': Bell,
    'flaga': Flag, 'chorągiew': Flag,
}

interface ItemIconProps {
    name: string
    className?: string
}

export function ItemIcon({ name, className }: ItemIconProps) {
    const lowerName = name.toLowerCase()

    // Find first matching keyword
    const matchedKey = Object.keys(ICON_MAP).find(key => lowerName.includes(key))

    const IconComponent = matchedKey ? ICON_MAP[matchedKey] : Box

    return <IconComponent className={className} />
}
