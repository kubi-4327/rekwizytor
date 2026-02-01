// Edge Function to refresh performance schedules
// This function scrapes theater websites and updates show dates

import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper types
type ScrapedPerformanceData = {
  title: string
  description: string
  dates: string[]
  premiereDate?: string
  imageUrl?: string
}

type ScrapeResult = {
  success: boolean
  data?: ScrapedPerformanceData
  error?: string
}

// Polish month names mapping
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
  const cleaned = text.toLowerCase().trim()
  const patterns = [
    /(\d{1,2})\s+(\w+)\s+(\d{4})/,
    /(\d{1,2})\.(\d{1,2})\.(\d{4})/,
    /(\d{4})-(\d{2})-(\d{2})/
  ]

  for (const pattern of patterns) {
    const match = cleaned.match(pattern)
    if (match) {
      if (pattern.source.includes('\\w+')) {
        const day = match[1].padStart(2, '0')
        const monthName = match[2]
        const year = match[3]
        const month = PL_MONTHS[monthName]
        if (month) return new Date(`${year}-${month}-${day}`)
      } else if (pattern.source.includes('\\.')) {
        const day = match[1].padStart(2, '0')
        const month = match[2].padStart(2, '0')
        const year = match[3]
        return new Date(`${year}-${month}-${day}`)
      } else {
        return new Date(match[0])
      }
    }
  }
  return null
}

function extractShowDates(html: string): string[] {
  const dates: string[] = []
  const datePattern = /(\d{1,2})\s+(stycznia|lutego|marca|kwietnia|maja|czerwca|lipca|sierpnia|września|października|listopada|grudnia)\s+(\d{4}),?\s*godz\.\s*(\d{1,2}):(\d{2})/gi

  let match
  while ((match = datePattern.exec(html)) !== null) {
    const day = match[1].padStart(2, '0')
    const monthName = match[2].toLowerCase()
    const year = match[3]
    const hour = match[4].padStart(2, '0')
    const minute = match[5]
    const month = PL_MONTHS[monthName]

    if (month) {
      const isoDate = `${year}-${month}-${day}T${hour}:${minute}:00`
      dates.push(isoDate)
    }
  }

  return dates
}

async function scrapePerformance(url: string): Promise<ScrapeResult> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`)
    }

    const html = await response.text()
    const dates = extractShowDates(html)

    return {
      success: true,
      data: {
        title: '',
        description: '',
        dates
      }
    }
  } catch (error) {
    console.error('Scraping error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown scraping error'
    }
  }
}

async function refreshSinglePerformance(
  supabase: any,
  performanceId: string,
  sourceUrl: string
) {
  const result = await scrapePerformance(sourceUrl)
  if (!result.success || !result.data?.dates) {
    return { success: false, error: result.error || 'No dates found' }
  }

  const scrapedDates = result.data.dates
  if (scrapedDates.length === 0) return { success: true, added: 0 }

  // Get existing shows
  const { data: existingShows } = await supabase
    .from('scene_checklists')
    .select('show_date')
    .eq('performance_id', performanceId)
    .eq('type', 'show')

  const existingDateStrings = new Set(
    existingShows?.map((s: { show_date: string }) => 
      new Date(s.show_date).toISOString().split('T')[0]
    ) || []
  )

  // Filter new dates
  const newDates = scrapedDates.filter(dateStr => {
    const d = new Date(dateStr).toISOString().split('T')[0]
    return !existingDateStrings.has(d)
  })

  if (newDates.length === 0) return { success: true, added: 0 }

  // Get first scene
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

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Get all performances with source_url
    const { data: performances } = await supabase
      .from('performances')
      .select('id, source_url, title')
      .not('source_url', 'is', null)
      .neq('source_url', '')

    if (!performances || performances.length === 0) {
      return new Response(
        JSON.stringify({ success: true, refreshed: 0, details: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const results = []

    // Iterate and refresh (sequentially to avoid rate limits)
    for (const perf of performances) {
      if (!perf.source_url) continue

      try {
        const res = await refreshSinglePerformance(supabase, perf.id, perf.source_url)
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

    return new Response(
      JSON.stringify({
        success: true,
        refreshed: results.filter(r => r.success).length,
        details: results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
