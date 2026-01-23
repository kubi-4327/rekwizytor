'use server'

import { createClient } from '@/utils/supabase/server'

export type ScrapedPerformanceData = {
    title: string
    description: string
    dates: string[] // To be added as scheduled shows
    premiereDate?: string
    imageUrl?: string
}

export type ScrapeResult = {
    success: boolean
    data?: ScrapedPerformanceData
    error?: string
}

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
    // Try "30 marca 2019" or "30.03.2019"

    // Check for DD Month YYYY
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

    // Check for DD.MM.YYYY
    const numericMatch = text.match(/(\d{1,2})[\.\-\/](\d{1,2})[\.\-\/](\d{4})/)
    if (numericMatch) {
        const day = numericMatch[1].padStart(2, '0')
        const month = numericMatch[2].padStart(2, '0')
        const year = numericMatch[3]
        return new Date(`${year}-${month}-${day}`)
    }

    return null
}

export async function scrapePerformance(url: string): Promise<ScrapeResult> {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
        })

        if (!response.ok) {
            throw new Error(`Failed to fetch URL: ${response.statusText}`)
        }

        const html = await response.text()
        const cleanHtml = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gmi, "")
            .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gmi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")

        // 1. Extract Title
        let title = ''

        // Priority 1: OG Title (usually clean)
        const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']\s*\/?>/i)
        if (ogTitleMatch && ogTitleMatch[1]) {
            title = ogTitleMatch[1].trim()
            // Sometime it has suffixes like " - Teatr Rozrywki"
            title = title.split(' - ')[0].split(' | ')[0].trim()
        }

        // Priority 2: H1 tag
        if (!title) {
            const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i)
            if (h1Match && h1Match[1]) {
                title = h1Match[1].replace(/<[^>]+>/g, '').trim()
            }
        }

        // Priority 3: Title tag (fallback)
        if (!title) {
            const titleMatch = html.match(/<title>(.*?)<\/title>/i)
            if (titleMatch && titleMatch[1]) {
                title = titleMatch[1].split('-')[0].split('|')[0].trim()
            }
        }

        // Cleanup title if it matches "Na Afiszu" specific case
        if (title.toUpperCase() === 'NA AFISZU' || title.toUpperCase().includes('NA AFISZU')) {
            // If the title is generic, try to find a real title in the breadcrumbs or before "Najbliższe terminy"
            const termsIndex = cleanHtml.indexOf('Najbliższe terminy')
            if (termsIndex > 50) {
                // Look at the window of text before "Najbliższe terminy"
                // This is risky but might work for specific layouts
                // Better: look for the most prominent text that isn't navigational
            }
        }

        // 2. Extract Premiere Date
        let premiereDate: string = new Date().toISOString() // Default to today

        // Regex to find "Premiera:" or "Prapremiera:" and surrounding text
        // We look for patterns like "Premiera: 30 marca 2019" or "Prapremiera: 14.09.2024"
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

        // 3. Extract Dates (Najbliższe terminy)
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

        // 4. Extract Description
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
        // If we still don't have a good description, try to find the start of the article
        // Skip common nav keywords
        if (!description || description.length < 20 || description.toUpperCase().includes('KONTAKT')) {
            // Look for a paragraph p tag with substantial length
            const pMatches = html.match(/<p[^>]*>(.*?)<\/p>/gi)
            if (pMatches) {
                for (const p of pMatches) {
                    const cleanP = p.replace(/<[^>]+>/g, '').trim()
                    // Filter out short texts or nav-like texts
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

        // Heuristic: Clean up common header junk (AuthorTitle...Age)
        // Detect "w wieku X+", "od lat X", "dla widzów powyżej X lat" at the beginning
        // Example: "AuthorTitle... w wieku 6+. Actual Description"
        // Also handling "musical w 2 aktach" if it appears before the description
        const cleanupRegex = /^(?:.*?)(?:w wieku|od lat|dla widzów powyżej|dla widzów od|lat)\s*\d+(?:\s*lat|\+)?(?:[\.]|[\s]*musical w \d+ aktach[\.]?)?\s*/i

        // Only apply if the match is in the first 250 chars to avoid cutting middle of text
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

        // 5. Extract Image (Poster)
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
            } catch (e) {
                // Ignore
            }
        }

        // Priority 3: Prominent body images
        const imgMatches = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)
        if (imgMatches) {
            let foundCount = 0
            for (const imgTag of imgMatches) {
                if (foundCount >= 3) break // key only top 3 body images to avoid scanning too much
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

        // Try iterating candidates until we get a good one
        for (let candidate of imageCandidates) {
            // Resolve relative URL
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
                        break // We found a winner!
                    } else {
                        console.warn(`[Scraper] Candidate content type invalid: ${contentType}`)
                    }
                } else {
                    console.warn(`[Scraper] Failed to fetch candidate: ${imageResponse.status}`)
                }
            } catch (e) {
                console.warn(`[Scraper] Error fetching candidate: ${e}`)
            }
        }

        if (!imageUrl && imageCandidates.length > 0) {
            console.log('[Scraper] Could not fetch any valid image as base64. Returning first candidate as URL fallback.')
            // Fallback: Return the first candidate as raw URL if strict processing failed
            // But verify it's absolute
            let fallback = imageCandidates[0]
            if (fallback.startsWith('/')) {
                try {
                    const urlObj = new URL(url)
                    fallback = `${urlObj.origin}${fallback}`
                } catch (e) { }
            }
            imageUrl = fallback
        }

        return {
            success: true,
            data: {
                title,
                description,
                dates,
                premiereDate,
                imageUrl
            },
        }
    } catch (error) {
        console.error('Scraping error:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown scraping error'
        }
    }
}



export async function refreshSinglePerformance(performanceId: string, sourceUrl: string) {
    const supabase = await createClient()

    // 1. Scrape
    const result = await scrapePerformance(sourceUrl)
    if (!result.success || !result.data?.dates) {
        return { success: false, error: result.error || 'No dates found' }
    }

    const scrapedDates = result.data.dates
    if (scrapedDates.length === 0) return { success: true, added: 0 }

    // 2. Get existing shows
    const { data: existingShows } = await supabase
        .from('scene_checklists')
        .select('show_date')
        .eq('performance_id', performanceId)
        .eq('type', 'show')

    const existingDateStrings = new Set(existingShows?.map((s: { show_date: string }) => new Date(s.show_date).toISOString().split('T')[0]) || [])

    // 3. Filter new dates
    const newDates = scrapedDates.filter(dateStr => {
        // Scraper returns ISO strings like 2024-03-30T19:00:00
        // We compare by YYYY-MM-DD to be safe
        const d = new Date(dateStr).toISOString().split('T')[0]
        return !existingDateStrings.has(d)
    })

    if (newDates.length === 0) return { success: true, added: 0 }

    // 4. Insert new shows
    // We need to know the "Act 1, Scene 1" equivalent for this performance to create a valid checklist?
    // In CreatePerformanceForm we defaulted to Scene 1.
    // Let's try to find the first scene of Act 1.

    const { data: firstScene } = await supabase
        .from('scenes')
        .select('id, scene_number, name')
        .eq('performance_id', performanceId)
        .order('act_number', { ascending: true })
        .order('scene_number', { ascending: true })
        .limit(1)
        .single()

    const sceneNum = firstScene?.scene_number?.toString() || '1'
    const sceneName = firstScene?.name || 'Scene 1'

    const checklistsToInsert = newDates.map(dateStr => ({
        performance_id: performanceId,
        show_date: dateStr,
        scene_number: sceneNum,
        scene_name: sceneName,
        type: 'show',
        is_active: false
    }))

    const { error } = await supabase
        .from('scene_checklists')
        .insert(checklistsToInsert)

    if (error) {
        console.error(`Error adding shows for ${performanceId}:`, error)
        return { success: false, error: error.message }
    }

    return { success: true, added: newDates.length }
}

export async function refreshAllPerformances() {
    const supabase = await createClient()

    // 1. Get all performances with source_url
    const { data: performances } = await supabase
        .from('performances')
        .select('id, source_url, title')
        .not('source_url', 'is', null)
        .neq('source_url', '')

    if (!performances || performances.length === 0) {
        return { success: true, refreshed: 0, details: [] }
    }

    const results = []

    // 2. Iterate and refresh (sequentially to avoid rate limits/overload)
    for (const perf of performances) {
        if (!perf.source_url) continue

        try {
            const res = await refreshSinglePerformance(perf.id, perf.source_url)
            results.push({
                title: perf.title,
                success: res.success,
                added: res.added || 0,
                error: res.error
            })
        } catch (e) {
            results.push({
                title: perf.title,
                success: false,
                error: String(e)
            })
        }
    }

    return { success: true, refreshed: results.filter(r => r.success).length, details: results }
}
