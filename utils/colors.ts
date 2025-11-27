import ColorThief from 'colorthief'

export async function extractTopColors(imageUrl: string): Promise<string[]> {
    return new Promise((resolve) => {
        const img = new Image()
        img.crossOrigin = 'Anonymous'
        img.src = imageUrl

        img.onload = () => {
            try {
                const colorThief = new ColorThief()
                // Get a larger palette to find distinct colors
                const palette = colorThief.getPalette(img, 15)

                if (palette && palette.length > 0) {
                    const scoredColors = palette.map(rgb => {
                        const [, s, l] = rgbToHsl(rgb[0], rgb[1], rgb[2])

                        // Score calculation
                        // 1. Prefer higher saturation
                        // 2. Penalize very dark or very light colors
                        const lightnessPenalty = Math.abs(l - 0.5) * 2
                        const score = s - (lightnessPenalty * 0.3)

                        return { rgb, score }
                    })

                    // Sort by score descending
                    scoredColors.sort((a, b) => b.score - a.score)

                    // Select distinct colors
                    const selectedColors: typeof scoredColors = []
                    const minDistance = 60 // Threshold for "distinctness" (0-441 range)

                    for (const candidate of scoredColors) {
                        if (selectedColors.length >= 3) break

                        const isDistinct = selectedColors.every(selected => {
                            const dist = Math.sqrt(
                                Math.pow(candidate.rgb[0] - selected.rgb[0], 2) +
                                Math.pow(candidate.rgb[1] - selected.rgb[1], 2) +
                                Math.pow(candidate.rgb[2] - selected.rgb[2], 2)
                            )
                            return dist > minDistance
                        })

                        if (isDistinct) {
                            selectedColors.push(candidate)
                        }
                    }

                    // If we have less than 3, try to fill with next best even if similar (optional, but better to have choices)
                    // For now, let's just return what we found to ensure distinctness.

                    const hexColors = selectedColors.map(item => {
                        return '#' + item.rgb.map(x => {
                            const hex = x.toString(16)
                            return hex.length === 1 ? '0' + hex : hex
                        }).join('')
                    })

                    resolve(hexColors)
                } else {
                    resolve([])
                }
            } catch (error) {
                console.error('Error extracting color:', error)
                resolve([])
            }
        }

        img.onerror = () => {
            console.error('Failed to load image for color extraction')
            resolve([])
        }
    })
}

// Helper: RGB to HSL
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    r /= 255
    g /= 255
    b /= 255

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0
    let s = 0
    const l = (max + min) / 2

    if (max !== min) {
        const d = max - min
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break
            case g: h = (b - r) / d + 2; break
            case b: h = (r - g) / d + 4; break
        }
        h /= 6
    }

    return [h * 360, s, l]
}
