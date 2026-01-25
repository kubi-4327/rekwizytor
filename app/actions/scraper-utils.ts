
const PL_MONTHS: { [key: string]: string } = {
    'stycznia': '01', 'styczeń': '01',
    'lutego': '02', 'luty': '02',
    'marca': '03', 'marzec': '03',
    'kwietnia': '04', 'kwiecień': '04',
    'maja': '05', 'maj': '05',
    'czerwca': '06', 'czerwiec': '06',
    'lipca': '07', 'lipiec': '07',
    'sierpnia': '08', 'sierpień': '08',
    'września': '09', 'wrzesień': '09',
    'października': '10', 'październik': '10',
    'listopada': '11', 'listopad': '11',
    'grudnia': '12', 'grudzień': '12'
}

function parsePolishDate(text: string): Date | null {
    const textLower = text.toLowerCase()
    const monthNames = Object.keys(PL_MONTHS).join('|')
    const plDateRegex = new RegExp(`(\\d{1,2})\\s+(${monthNames})\\s+(\\d{4})`)

    const plMatch = textLower.match(plDateRegex)
    if (plMatch) {
        const day = plMatch[1].padStart(2, '0')
        const month = PL_MONTHS[plMatch[2]]
        const year = plMatch[3]
        return new Date(`${year}-${month}-${day}`)
    }

    const numericMatch = text.match(/(\d{1,2})[\.\-\/](\d{1,2})[\.\-\/](\d{4})/)
    if (numericMatch) {
        const day = numericMatch[1].padStart(2, '0')
        const month = numericMatch[2].padStart(2, '0')
        const year = numericMatch[3]
        return new Date(`${year}-${month}-${day}`)
    }

    return null
}

export function cleanHtmlContent(html: string): string {
    return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gmi, "")
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gmi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
}

export function extractTitle(html: string, cleanHtml: string): string {
    let title = ''

    // Priority 1: OG Title
    const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']\s*\/?>/i)
    if (ogTitleMatch && ogTitleMatch[1]) {
        title = ogTitleMatch[1].trim()
        title = title.split(' - ')[0].split(' | ')[0].trim()
    }

    // Priority 2: H1 tag
    if (!title) {
        const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i)
        if (h1Match && h1Match[1]) {
            title = h1Match[1].replace(/<[^>]+>/g, '').trim()
        }
    }

    // Priority 3: Title tag
    if (!title) {
        const titleMatch = html.match(/<title>(.*?)<\/title>/i)
        if (titleMatch && titleMatch[1]) {
            title = titleMatch[1].split('-')[0].split('|')[0].trim()
        }
    }

    // Handle "Na Afiszu" case
    if (title.toUpperCase() === 'NA AFISZU' || title.toUpperCase().includes('NA AFISZU')) {
        // Fallback logic could be improved here, but kept simple for now
    }

    return title
}

export function extractPremiereDate(cleanHtml: string): string {
    let premiereDate: string = new Date().toISOString()
    const premiereRegex = /(?:premiera|prapremiera)\s*[:\-]?\s*(\d{1,2}(?:\s*i\s*\d{1,2})?[^\d]{0,10}?(?:\d{4}|[a-zęóąśłżźćń]+)\s*(?:\d{4})?)/i
    let premiereMatch = cleanHtml.match(premiereRegex)

    if (premiereMatch) {
        const dateStr = premiereMatch[1]
        const pDate = parsePolishDate(dateStr)
        if (pDate) {
            premiereDate = pDate.toISOString()
        } else {
            const doubleDateMatch = dateStr.match(/(\d{1,2})\s+i\s+\d{1,2}\s+([a-zęóąśłżźćń]+)\s+(\d{4})/i)
            if (doubleDateMatch) {
                const day = doubleDateMatch[1]
                const monthName = doubleDateMatch[2]
                const year = doubleDateMatch[3]
                const constructedString = `${day} ${monthName} ${year}`
                const pDate2 = parsePolishDate(constructedString)
                if (pDate2) premiereDate = pDate2.toISOString()
            }
        }
    }
    return premiereDate
}

export function extractShowDates(html: string): string[] {
    const dates: string[] = []
    const termIndex = html.indexOf('Najbliższe terminy')

    if (termIndex !== -1) {
        const textAfterTerms = html.slice(termIndex, termIndex + 10000)
        const dateRegex = /\b(\d{1,2})[\.\-\/](\d{1,2})[\.\-\/](\d{4})\b/g

        let match
        const uniqueDates = new Set<string>()

        while ((match = dateRegex.exec(textAfterTerms)) !== null) {
            const day = match[1].padStart(2, '0')
            const month = match[2].padStart(2, '0')
            const year = match[3]
            const dateStr = `${year}-${month}-${day}T19:00:00`
            uniqueDates.add(dateStr)
        }

        dates.push(...Array.from(uniqueDates))
    }
    return dates
}

export function extractDescription(html: string): string {
    let description = ''

    // Priority 1: OG Description
    const ogDescMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["'](.*?)["']\s*\/?>/i)
    if (ogDescMatch && ogDescMatch[1]) {
        description = ogDescMatch[1].trim()
    }

    // Priority 2: Meta Description
    if (!description) {
        const metaDescMatch = html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']\s*\/?>/i)
        if (metaDescMatch && metaDescMatch[1]) {
            description = metaDescMatch[1].trim()
        }
    }

    // Priority 3: Body Content Heuristic
    if (!description || description.length < 20 || description.toUpperCase().includes('KONTAKT')) {
        const pMatches = html.match(/<p[^>]*>(.*?)<\/p>/gi)
        if (pMatches) {
            for (const p of pMatches) {
                const cleanP = p.replace(/<[^>]+>/g, '').trim()
                if (cleanP.length > 50 && !cleanP.toUpperCase().includes('NA AFISZU') && !cleanP.toUpperCase().includes('BILETY')) {
                    description = cleanP
                    break
                }
            }
        }
    }

    description = description
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim()

    const cleanupRegex = /^(?:.*?)(?:w wieku|od lat|dla widzów powyżej|dla widzów od|lat)\s*\d+(?:\s*lat|\+)?(?:[\.]|[\s]*musical w \d+ aktach[\.]?)?\s*/i

    const match = description.match(cleanupRegex)
    if (match && match[0].length < 250) {
        description = description.replace(cleanupRegex, '')
    }

    const sentenceMatches = description.match(/[^\.!\?]+[\.!\?]+/g)
    if (sentenceMatches) {
        description = sentenceMatches.slice(0, 3).join(' ').trim()
    } else if (description.length > 300) {
        description = description.slice(0, 300) + '...'
    }

    return description
}

export async function extractImage(html: string, url: string): Promise<string> {
    let imageUrl = ''
    const imageCandidates: string[] = []

    // Priority 1: OG Image
    const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["'](.*?)["']\s*\/?>/i)
    if (ogImageMatch && ogImageMatch[1]) {
        imageCandidates.push(ogImageMatch[1].trim())
    }

    // Priority 2: JSON-LD Image
    const jsonLdMatch = html.match(/<script\s+type=["']application\/ld\+json["']>(.*?)<\/script>/i)
    if (jsonLdMatch && jsonLdMatch[1]) {
        try {
            const json = JSON.parse(jsonLdMatch[1])
            if (json.image) {
                const img = Array.isArray(json.image) ? json.image[0] : json.image
                if (img) imageCandidates.push(img)
            }
        } catch (e) { }
    }

    // Priority 3: Prominent body images
    const imgMatches = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)
    if (imgMatches) {
        let foundCount = 0
        for (const imgTag of imgMatches) {
            if (foundCount >= 3) break
            if (imgTag.toLowerCase().includes('logo') || imgTag.toLowerCase().includes('icon')) continue
            const srcMatch = imgTag.match(/src=["']([^"']+)["']/i)
            if (srcMatch && srcMatch[1]) {
                const potentialUrl = srcMatch[1]
                if (potentialUrl.endsWith('.svg') || potentialUrl.includes('pixel') || potentialUrl.includes('blank')) continue
                imageCandidates.push(potentialUrl)
                foundCount++
            }
        }
    }

    console.log(`[Scraper] Found ${imageCandidates.length} image candidates.`)

    for (let candidate of imageCandidates) {
        if (candidate.startsWith('/')) {
            try {
                const urlObj = new URL(url)
                candidate = `${urlObj.origin}${candidate}`
            } catch (e) { continue }
        } else if (!candidate.startsWith('http')) {
            continue
        }

        try {
            console.log(`[Scraper] Trying candidate: ${candidate.substring(0, 50)}...`)
            const imageResponse = await fetch(candidate, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Referer': url,
                    'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
                }
            })

            if (imageResponse.ok) {
                const arrayBuffer = await imageResponse.arrayBuffer()
                const buffer = Buffer.from(arrayBuffer)
                const rawContentType = imageResponse.headers.get('content-type')
                const contentType = rawContentType ? rawContentType.split(';')[0].trim() : 'image/jpeg'

                if (contentType.startsWith('image/')) {
                    const base64 = buffer.toString('base64')
                    console.log(`[Scraper] valid image found: ${contentType}, size: ${base64.length}`)
                    imageUrl = `data:${contentType};base64,${base64}`
                    break
                }
            }
        } catch (e) {
            console.warn(`[Scraper] Error fetching candidate: ${e}`)
        }
    }

    if (!imageUrl && imageCandidates.length > 0) {
        console.log('[Scraper] Could not fetch any valid image as base64. Returning first candidate as URL fallback.')
        let fallback = imageCandidates[0]
        if (fallback.startsWith('/')) {
            try {
                const urlObj = new URL(url)
                fallback = `${urlObj.origin}${fallback}`
            } catch (e) { }
        }
        imageUrl = fallback
    }

    return imageUrl
}
