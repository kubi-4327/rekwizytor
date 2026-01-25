export const FEATURES = {
    EXPERIMENTAL_MAPPING: 'experimental_mapping',
} as const;

export function isFeatureEnabled(feature: keyof typeof FEATURES): boolean {
    if (typeof process === 'undefined') return false;

    switch (feature) {
        case 'EXPERIMENTAL_MAPPING':
            return process.env.NEXT_PUBLIC_ENABLE_EXPERIMENTAL_MAPPING === 'true';
        default:
            return false;
    }
}
