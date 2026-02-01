import { refreshAllPerformances } from '@/app/actions/scrape-performance'
import { NextResponse } from 'next/server'

// This endpoint is called by Vercel Cron
// It refreshes performance schedules for all performances that have a source_url
export async function GET(request: Request) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    console.log('[CRON] Starting performance refresh at', new Date().toISOString())
    
    const result = await refreshAllPerformances()
    
    console.log('[CRON] Performance refresh completed:', {
      success: result.success,
      refreshed: result.refreshed,
      totalProcessed: result.details?.length || 0
    })
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result
    })
  } catch (error) {
    console.error('[CRON] Performance refresh failed:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
