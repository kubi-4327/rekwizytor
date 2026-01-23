import { NextRequest, NextResponse } from 'next/server'
import { intentClassifier } from '@/utils/intent-classifier'

export async function POST(request: NextRequest) {
    try {
        const { query } = await request.json()

        if (!query || typeof query !== 'string') {
            return NextResponse.json(
                { error: 'Query is required' },
                { status: 400 }
            )
        }

        const result = await intentClassifier.classify(query)

        return NextResponse.json(result)
    } catch (error) {
        console.error('Intent classification error:', error)
        return NextResponse.json(
            { error: 'Failed to classify intent' },
            { status: 500 }
        )
    }
}
