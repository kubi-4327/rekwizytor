import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import QRCode from 'qrcode'
import { Document, Page, Text, View, Image, StyleSheet, Font } from '@react-pdf/renderer'
import React from 'react'

interface PerformanceData {
    id: string
    title: string
    premiereDate?: string
}

interface RequestBody {
    performances: PerformanceData[]
}

// Register fonts
// Boldonse from local file
async function registerBoldonseFont() {
    try {
        const fontPath = process.cwd() + '/public/fonts/Boldonse-Regular.ttf'
        const fs = await import('fs/promises')
        const buffer = await fs.readFile(fontPath)
        const base64 = buffer.toString('base64')

        Font.register({
            family: 'Boldonse',
            src: `data:font/truetype;base64,${base64}`,
        })
        return true
    } catch (e) {
        console.error('Failed to load Boldonse font:', e)
        return false
    }
}

// Courier Prime from Google Fonts
Font.register({
    family: 'Courier Prime',
    fonts: [
        {
            src: 'https://fonts.gstatic.com/s/courierprime/v9/u-450q2lgwslOqpF_6gQ8kELWwZjW-_-tvg.ttf',
            fontWeight: 400,
        },
        {
            src: 'https://fonts.gstatic.com/s/courierprime/v9/u-4k0q2lgwslOqpF_6gQ8kELY7pMf-fVqvHoJXw.ttf',
            fontWeight: 700,
        },
    ],
})

// Styles
const styles = StyleSheet.create({
    page: {
        padding: '8mm',
        backgroundColor: 'white',
    },
    pageHeader: {
        position: 'absolute',
        top: '5mm',
        left: '8mm',
        fontSize: 10,
        fontFamily: 'Courier Prime',
        color: '#999999',
    },
    grid: {
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        width: '100%',
        marginTop: '5mm',
    },
    labelContainer: {
        width: '50%',
        padding: '1.5mm',
        position: 'relative',
    },
    label: {
        border: '0.5px dashed #d0d0d0',
        padding: '4mm',
        height: '47mm',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
    },
    scissorsIcon: {
        position: 'absolute',
        top: '-1.5mm',
        right: '-1.5mm',
        fontSize: 8,
        color: '#d0d0d0',
    },
    labelLocation: {
        position: 'absolute',
        top: '4mm',
        left: '4mm',
        fontFamily: 'Courier Prime',
        fontSize: 8,
        textAlign: 'left',
        color: '#000000',
        textTransform: 'uppercase',
    },
    labelName: {
        fontFamily: 'Boldonse',
        fontSize: 20,
        fontWeight: 700,
        textAlign: 'center',
        color: '#000000',
        marginTop: '6mm',
        maxWidth: '70mm',
        lineHeight: 0.9,
        wordWrap: 'break-word',
    },
    qrCode: {
        position: 'absolute',
        bottom: '4mm',
        right: '4mm',
        width: '15mm',
        height: '15mm',
    },
    rekwizytor: {
        position: 'absolute',
        bottom: '4mm',
        left: '4mm',
        fontSize: 8,
        fontFamily: 'Boldonse',
        color: '#000000',
    },
    labelId: {
        position: 'absolute',
        bottom: '1mm',
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: 5,
        color: '#cccccc',
        fontFamily: 'Courier Prime',
    },
})

// Create PDF document using React.createElement
function createPDFDocument(performances: PerformanceData[], qrCodes: string[]) {
    const labelsPerPage = 10
    const pages: PerformanceData[][] = []

    for (let i = 0; i < performances.length; i += labelsPerPage) {
        pages.push(performances.slice(i, i + labelsPerPage))
    }

    const pageElements = pages.map((pagePerformances, pageIndex) => {
        const labelElements = pagePerformances.map((perf, idx) => {
            const globalIdx = pageIndex * labelsPerPage + idx

            // Calculate dynamic font size based on name length
            let nameFontSize = 20
            if (perf.title.length > 15) {
                nameFontSize = 16
            }
            if (perf.title.length > 25) {
                nameFontSize = 14
            }
            if (perf.title.length > 35) {
                nameFontSize = 12
            }

            const dynamicNameStyle = {
                ...styles.labelName,
                fontSize: nameFontSize,
            }

            const children: React.ReactElement[] = [
                // Scissors icon for cut line
                React.createElement(Text, { key: 'scissors', style: styles.scissorsIcon }, '✂'),
            ]

            // Premiere date at top left (if exists)
            if (perf.premiereDate) {
                children.push(
                    React.createElement(Text, { key: 'date', style: styles.labelLocation }, `PREMIERA: ${perf.premiereDate}`)
                )
            } else {
                children.push(
                    React.createElement(Text, { key: 'type', style: styles.labelLocation }, 'SPEKTAKL')
                )
            }

            // Main title in center
            children.push(
                React.createElement(Text, { key: 'title', style: dynamicNameStyle }, perf.title)
            )

            // QR code at bottom right
            children.push(
                React.createElement(Image, { key: 'qr', src: qrCodes[globalIdx], style: styles.qrCode })
            )

            // "Rekwizytor" text at bottom left
            children.push(
                React.createElement(Text, { key: 'rekwizytor', style: styles.rekwizytor }, 'Rekwizytor')
            )

            // ID at bottom center
            children.push(
                React.createElement(Text, { key: 'id', style: styles.labelId }, perf.id.slice(0, 8))
            )

            return React.createElement(
                View,
                { key: perf.id, style: styles.labelContainer },
                React.createElement(View, { style: styles.label }, children)
            )
        })

        return React.createElement(
            Page,
            { key: pageIndex, size: 'A4', style: styles.page },
            [
                React.createElement(Text, { key: 'header', style: styles.pageHeader }, 'Narzędzie dla teatru - Etykiety Spektakli'),
                React.createElement(View, { key: 'grid', style: styles.grid }, labelElements)
            ]
        )
    })

    return React.createElement(Document, {}, pageElements)
}

export async function POST(request: NextRequest) {
    try {
        const body: RequestBody = await request.json()

        if (!body.performances || !Array.isArray(body.performances)) {
            return NextResponse.json(
                { error: 'Invalid request: performances array required' },
                { status: 400 }
            )
        }

        // Register Boldonse font
        await registerBoldonseFont()

        // Generate QR codes
        const qrCodes = await Promise.all(
            body.performances.map(async (perf) => {
                const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
                const url = `${baseUrl}/performances/${perf.id}`

                return await QRCode.toDataURL(url, {
                    errorCorrectionLevel: 'L',
                    margin: 0,
                    width: 200,
                })
            })
        )

        // Create document
        const doc = createPDFDocument(body.performances, qrCodes)

        // Render PDF
        const pdfBuffer = await renderToBuffer(doc)

        // Return PDF
        return new NextResponse(new Uint8Array(pdfBuffer), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="performance_labels_${new Date().toISOString().split('T')[0]}.pdf"`,
            },
        })
    } catch (error) {
        console.error('Error generating PDF:', error)
        return NextResponse.json(
            { error: 'Failed to generate PDF', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        )
    }
}
