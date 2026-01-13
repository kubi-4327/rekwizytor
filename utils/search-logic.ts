export interface SearchWeights {
    identity: number
    physical: number
    context: number
}

// Intent Classification Logic
export type QueryIntent = 'physical' | 'context' | 'specific' | 'default'

export function classifyQueryIntent(query: string): QueryIntent {
    const q = query.toLowerCase()

    // 1. PHYSICAL Intent (Heavy weight on attributes)
    // Keywords: materials, textures, structural properties
    const physicalKeywords = [
        'ostre', 'tępe', 'metalowe', 'drewniane', 'szklane', 'plastikowe', 'papierowe',
        'czerwone', 'zielone', 'niebieskie', 'żółte', 'czarne', 'białe', 'kolorowe',
        'duże', 'małe', 'wysokie', 'niskie', 'długie', 'ciężkie', 'lekkie',
        'stare', 'nowe', 'zardzewiałe', 'zniszczone', 'antyk'
    ]
    if (physicalKeywords.some(k => q.includes(k))) return 'physical'

    // 2. CONTEXT Intent (Heavy weight on situation/location)
    // Keywords: usage, places, occasions
    const contextKeywords = [
        'kuchni', 'kuchenne', 'łazienki', 'salon', 'biuro', 'szkoła', 'klasa',
        'wesele', 'ślub', 'pogrzeb', 'święta', 'boże narodzenie', 'wielkanoc',
        'lata 20', 'lata 30', 'lata 40', 'lata 50', 'lata 60', 'lata 70', 'lata 80', 'lata 90',
        'wojenne', 'średniowieczne', 'futurystyczne',
        'jedzenie', 'picie', 'dekoracja'
    ]
    if (contextKeywords.some(k => q.includes(k))) return 'context'

    // 3. SPECIFIC Intent (Heavy weight on identity)
    // Short queries without intent keywords likely mean specific object search (e.g. "krzesło")
    const wordCount = q.split(/\s+/).length
    if (wordCount <= 2) return 'specific'

    // 4. Default Mixed Intent
    return 'default'
}

export function getWeightsForIntent(intent: QueryIntent): SearchWeights {
    switch (intent) {
        case 'physical': // "ostre" -> Look for correct property, ignore context (kitchen)
            return { identity: 0.1, physical: 0.8, context: 0.1 }
        case 'context': // "wesele" -> Look for occasion, ignore if it's a specific knife type
            return { identity: 0.2, physical: 0.1, context: 0.7 }
        case 'specific': // "krzesło" -> I want a chair, not something used ON a chair
            return { identity: 0.8, physical: 0.1, context: 0.1 }
        default: // Balanced approach
            return { identity: 0.5, physical: 0.3, context: 0.2 }
    }
}
