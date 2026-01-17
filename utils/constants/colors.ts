export const COLORS = {
    BRAND: {
        BURGUNDY: '#A0232F', // Used as default group color
    },
    ENTITIES: {
        GROUP: {
            DEFAULT: '#A0232F',
            FALLBACK_CYAN: '#22d3ee', // Replacing with DEFAULT in most places
        },
        NOTE: {
            DEFAULT: '#fbbf24', // Amber 400
        },
        PRODUCTION: {
            DEFAULT: '#c084fc', // Purple 400
        }
    }
} as const

export const DEFAULT_GROUP_COLOR = COLORS.BRAND.BURGUNDY
