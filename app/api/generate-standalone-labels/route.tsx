import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import QRCode from 'qrcode'
import { Document, Page, Text, View, Image, StyleSheet, Font } from '@react-pdf/renderer'
import React from 'react'

// --- Types ---
interface RequestBody {
    title: string
    description?: string
    labelSize: 'a4' | 'a5' | 'a6' | 'small'
    copies: number
}

// --- Icons (embedded base64 for PDF) ---
// Using a simple unicode scissors for now as in the reference logic
const SCISSORS_ICON = '✂'

// --- Fonts ---
async function registerFonts() {
    try {
        const fs = await import('fs/promises')

        // Load Boldonse
        try {
            const boldonsePath = process.cwd() + '/public/fonts/Boldonse-Regular.ttf'
            const boldonseBuffer = await fs.readFile(boldonsePath)
            console.log('Boldonse loaded, size:', boldonseBuffer.length)
            Font.register({
                family: 'Boldonse',
                src: `data:font/truetype;base64,${boldonseBuffer.toString('base64')}`,
            })
        } catch (e) {
            console.error('Error loading Boldonse:', e)
        }

        // Load Roboto (Regular and Bold)
        try {
            const robotoRegularPath = process.cwd() + '/public/fonts/Roboto-Regular.ttf'
            const robotoRegularBuffer = await fs.readFile(robotoRegularPath)
            console.log('Roboto Regular loaded, size:', robotoRegularBuffer.length)

            const robotoBoldPath = process.cwd() + '/public/fonts/Roboto-Bold.ttf'
            const robotoBoldBuffer = await fs.readFile(robotoBoldPath)
            console.log('Roboto Bold loaded, size:', robotoBoldBuffer.length)

            Font.register({
                family: 'Roboto',
                fonts: [
                    {
                        src: `data:font/truetype;base64,${robotoRegularBuffer.toString('base64')}`,
                        fontWeight: 400
                    },
                    {
                        src: `data:font/truetype;base64,${robotoBoldBuffer.toString('base64')}`,
                        fontWeight: 700
                    }
                ]
            })
        } catch (e) {
            console.error('Error loading Roboto:', e)
            throw new Error(`Failed to load Roboto fonts: ${e instanceof Error ? e.message : String(e)}`)
        }

    } catch (e) {
        console.error('Failed to register fonts:', e)
        throw e // Re-throw to cause API error so we see it
    }

    // Courier
    try {
        Font.register({
            family: 'Courier',
            src: 'https://fonts.gstatic.com/s/courierprime/v9/u-450q2lgwslOqpF_6gQ8kELWwZjW-_-tvg.ttf'
        })
    } catch (e) {
        console.error('Failed to register Courier font', e)
    }
}

// --- Styles ---
// We define base styles, but specific dimensions will be calculated dynamically
const styles = StyleSheet.create({
    page: {
        backgroundColor: 'white',
        padding: 0, // We control padding in the grid
    },
    label: {
        borderWidth: 1,
        borderColor: '#e5e5e5',
        borderStyle: 'dashed',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    scissors: {
        position: 'absolute',
        top: 2,
        right: 2,
        fontSize: 10,
        color: '#ccc',
    },
    header: {
        position: 'absolute',
        top: 20,
        left: 20,
        fontSize: 10,
        fontFamily: 'Courier',
        color: '#666',
        textTransform: 'uppercase',
    },
    title: {
        fontFamily: 'Boldonse',
        fontSize: 40,
        textAlign: 'center',
        marginBottom: 10,
    },
    description: {
        fontFamily: 'Roboto',
        fontSize: 12,
        textAlign: 'center',
        color: '#444',
        maxWidth: '80%',
    },
    footerRe: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        fontSize: 10,
        fontFamily: 'Boldonse',
    },
    footerId: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        fontSize: 8,
        fontFamily: 'Courier',
        color: '#ccc',
    },
})

// --- Document Component ---
const StandaloneLabelDocument = ({ title, description, labelSize, copies }: RequestBody) => {

    // Layout Logic
    // A4 Page is ~595 x 842 pt
    const PAGE_WIDTH = 595
    const PAGE_HEIGHT = 842

    let labelsPerPage = 1
    let labelWidth = PAGE_WIDTH
    let labelHeight = PAGE_HEIGHT
    let fontSize = 50

    switch (labelSize) {
        case 'a4':
            labelsPerPage = 1
            labelWidth = PAGE_WIDTH
            labelHeight = PAGE_HEIGHT
            fontSize = 60
            break
        case 'a5':
            labelsPerPage = 2
            labelWidth = PAGE_WIDTH
            labelHeight = PAGE_HEIGHT / 2
            fontSize = 40
            break
        case 'a6':
            labelsPerPage = 4
            labelWidth = PAGE_WIDTH / 2
            labelHeight = PAGE_HEIGHT / 2
            fontSize = 30
            break
        case 'small':
            labelsPerPage = 10
            labelWidth = PAGE_WIDTH / 2
            labelHeight = PAGE_HEIGHT / 5
            fontSize = 20
            break
    }

    const totalLabels = copies
    const chunks = []
    // We create an array of all labels to print, then chunk them into pages
    const allLabels = Array(totalLabels).fill({ title, description })

    for (let i = 0; i < allLabels.length; i += labelsPerPage) {
        chunks.push(allLabels.slice(i, i + labelsPerPage))
    }

    return (
        <Document>
            {
                chunks.map((chunk, pageIndex) => (
                    <Page key={pageIndex} size="A4" style={styles.page} >
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: '100%', height: '100%' }} >
                            {
                                chunk.map((label: any, idx: number) => (
                                    <View
                                        key={idx}
                                        style={
                                            [
                                                styles.label,
                                                { width: labelWidth, height: labelHeight }
                                            ]}
                                    >
                                        <Text style={styles.scissors} > {SCISSORS_ICON} </Text>
                                        < Text style={styles.header} > Etykieta </Text>

                                        < Text style={[styles.title, { fontSize }]} >
                                            {label.title}
                                        </Text>

                                        {
                                            label.description && (
                                                <Text style={styles.description} >
                                                    {label.description}
                                                </Text>
                                            )
                                        }

                                        < Text style={styles.footerRe} > Rekwizytor </Text>
                                        < Text style={styles.footerId} > {new Date().toLocaleDateString()} </Text>
                                    </View>
                                ))}
                        </View>
                    </Page>
                ))}
        </Document>
    )
}

export async function POST(request: NextRequest) {
    try {
        const body: RequestBody = await request.json()
        await registerFonts()

        const doc = <StandaloneLabelDocument {...body} />
        const buffer = await renderToBuffer(doc)

        return new NextResponse(new Uint8Array(buffer), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="labels.pdf"`,
            },
        })
    } catch (error) {
        console.error('Labels Error:', error)
        const msg = error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.json({ error: 'Failed', details: msg }, { status: 500 })
    }
}
