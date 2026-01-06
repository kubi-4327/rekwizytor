import { icons } from 'lucide-react'

export const KEYWORD_MAPPINGS: Record<string, string[]> = {
    'Sofa': ['kanapa', 'wersalka', 'sofa', 'fotel', 'pufa', 'siedzisko'],
    'Lamp': ['lampa', 'światło', 'oświetlenie', 'żarówka', 'abażur', 'kinkiet', 'latarka'],
    'Table': ['stół', 'stolik', 'biurko', 'blat', 'taboret', 'ława'],
    'Box': ['pudło', 'karton', 'skrzynia', 'walizka', 'pojemnik', 'szkatulka'],
    'Sword': ['miecz', 'szabla', 'nóż', 'sztylet', 'broń', 'pistolet', 'karabin'],
    'Shirt': ['ubranie', 'koszula', 'spodnie', 'kostium', 'strój', 'czapka', 'buty', 'kurtka', 'płaszcz'],
    'Book': ['książka', 'zeszyt', 'notatnik', 'papier', 'dokument', 'list', 'gazeta'],
    'Phone': ['telefon', 'komórka', 'smartfon', 'słuchawka'],
    'Laptop': ['laptop', 'komputer', 'ekran', 'monitor', 'tablet'],
    'Camera': ['aparat', 'kamera', 'zdjęcie'],
    'Music': ['instrument', 'gitara', 'pianino', 'skrzypce', 'bęben', 'muzyka', 'nuty'],
    'Utensils': ['sztućce', 'widelce', 'łyżki', 'nóż', 'talerz', 'kubek', 'szklanka', 'miska', 'garnek'],
    'Wrench': ['narzędzie', 'klucz', 'młotek', 'śrubokręt', 'wiertarka'],
    'Flower': ['kwiat', 'roślina', 'doniczka', 'wazon', 'bukiet', 'krzew', 'drzewo'],
    'Car': ['auto', 'samochód', 'pojazd', 'rower', 'wózek'],
    'Clock': ['zegar', 'budzik', 'czas', 'zegarek'],
    'Key': ['klucz', 'klucze', 'brelok'],
    'Glasses': ['okulary', 'binokle', 'lupa'],
    'Scissors': ['nożyczki', 'tnij'],
    'Trash': ['śmieci', 'kosz', 'bio'],
    'Bag': ['torba', 'plecak', 'worek', 'torebka'],
    'Crown': ['korona', 'król', 'berło', 'władza'],
    'Ghost': ['duch', 'straszny', 'zjawa'],
    'Skull': ['czaszka', 'szkielet', 'kość'],
    'Gem': ['klejnot', 'skarb', 'złoto', 'pieniądze', 'moneta'],
    'Gift': ['prezent', 'podarunek', 'paczka'],
    'Bell': ['dzwonek', 'dzwon'],
    'Hammer': ['mlotek', 'młot'],
    'Axe': ['siekiera', 'topór'],
    'Shield': ['tarcza', 'ochrona'],
    'Scroll': ['zwój', 'mapa', 'pergamin'],
    'Feather': ['pióro', 'pisanie'],
    'Umbrella': ['parasol', 'deszcz'],
    'Sun': ['słońce', 'pogoda'],
    'Moon': ['księżyc', 'noc'],
    'Cloud': ['chmura', 'niebo'],
    'Droplet': ['woda', 'kropla', 'płyn', 'napój', 'wino', 'piwo', 'wódka'],
    'Flame': ['ogień', 'płomień', 'świeca', 'znicz', 'pochodnia'],
    'Heart': ['serce', 'miłość'],
    'Star': ['gwiazda', 'magia'],
    'Zap': ['prąd', 'energia', 'błyskawica']
}

export function getSuggestedIcon(name: string): string {
    const lowerName = name.toLowerCase()

    // 1. Check exact match with Lucide icon names
    const exactMatch = Object.keys(icons).find(
        iconName => iconName.toLowerCase() === lowerName
    )
    if (exactMatch) return exactMatch

    // 2. Check keywords
    for (const [icon, keywords] of Object.entries(KEYWORD_MAPPINGS)) {
        if (keywords.some(k => lowerName.includes(k))) {
            return icon
        }
    }

    return 'Folder'
}
