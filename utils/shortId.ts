import { customAlphabet } from 'nanoid'

// Use a custom alphabet for short IDs to avoid ambiguous characters and ensure URL safety
// Removed: l, I, 1, O, 0 (to avoid confusion)
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
const generateShortId = customAlphabet(alphabet, 6)

export { generateShortId }
