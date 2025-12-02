import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import QRCode from 'qrcode'
import { Document, Page, Text, View, Image, StyleSheet, Font } from '@react-pdf/renderer'
import React from 'react'

interface GroupData {
    id: string
    name: string
    locationName?: string
}

interface RequestBody {
    groups: GroupData[]
}

// Register fonts
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
        padding: '10mm',
        backgroundColor: 'white',
    },
    grid: {
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        width: '100%',
    },
    labelContainer: {
        width: '50%',
        padding: '5mm',
    },
    label: {
        border: '2px dashed #cccccc',
        padding: '5mm',
        height: '45mm',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
    },
    labelName: {
        fontFamily: 'Courier Prime',
        fontSize: 16,
        fontWeight: 700,
        textAlign: 'center',
        color: '#000000',
        marginTop: '8mm',
        maxWidth: '75mm',
        lineHeight: 1.2,
    },
    labelLocation: {
        fontFamily: 'Courier Prime',
        fontSize: 10,
        textAlign: 'center',
        color: '#666666',
        marginTop: '3mm',
    },
    qrCode: {
        position: 'absolute',
        bottom: '5mm',
        right: '5mm',
        width: '22mm',
        height: '22mm',
    },
    logo: {
        position: 'absolute',
        bottom: '5mm',
        left: '5mm',
        maxWidth: '22mm',
        maxHeight: '22mm',
        objectFit: 'contain',
    },
    labelId: {
        position: 'absolute',
        bottom: '2mm',
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: 6,
        color: '#999999',
        fontFamily: 'Courier Prime',
    },
})

// Get logo as base64
async function getLogoBase64(): Promise<string | null> {
    try {
        const logoPath = process.cwd() + '/public/logo-pdf.png'
        const fs = await import('fs/promises')
        const buffer = await fs.readFile(logoPath)
        return `data:image/png;base64,${buffer.toString('base64')}`
    } catch (e) {
        console.error('Failed to load logo:', e)
        return null
    }
}

// Create PDF document using React.createElement
function createPDFDocument(groups: GroupData[], qrCodes: string[], logoBase64: string | null) {
    const labelsPerPage = 10
    const pages: GroupData[][] = []

    for (let i = 0; i < groups.length; i += labelsPerPage) {
        pages.push(groups.slice(i, i + labelsPerPage))
    }

    const pageElements = pages.map((pageGroups, pageIndex) => {
        const labelElements = pageGroups.map((group, idx) => {
            const globalIdx = pageIndex * labelsPerPage + idx

            const children = [
                React.createElement(Text, { key: 'name', style: styles.labelName }, group.name),
            ]

            if (group.locationName) {
                children.push(
                    React.createElement(Text, { key: 'location', style: styles.labelLocation }, group.locationName)
                )
            }

            children.push(
                React.createElement(Image, { key: 'qr', src: qrCodes[globalIdx], style: styles.qrCode })
            )

            if (logoBase64) {
                children.push(
                    React.createElement(Image, { key: 'logo', src: logoBase64, style: styles.logo })
                )
            }

            children.push(
                React.createElement(Text, { key: 'id', style: styles.labelId }, group.id.slice(0, 8))
            )

            return React.createElement(
                View,
                { key: group.id, style: styles.labelContainer },
                React.createElement(View, { style: styles.label }, children)
            )
        })

        return React.createElement(
            Page,
            { key: pageIndex, size: 'A4', style: styles.page },
            React.createElement(View, { style: styles.grid }, labelElements)
        )
    })

    return React.createElement(Document, {}, pageElements)
}

export async function POST(request: NextRequest) {
    try {
        const body: RequestBody = await request.json()

        if (!body.groups || !Array.isArray(body.groups)) {
            return NextResponse.json(
                { error: 'Invalid request: groups array required' },
                { status: 400 }
            )
        }

        // Generate QR codes
        const qrCodes = await Promise.all(
            body.groups.map(async (group) => {
                const url = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/items?groupId=${group.id}`
                return await QRCode.toDataURL(url, {
                    errorCorrectionLevel: 'H',
                    margin: 0,
                    width: 200,
                })
            })
        )

        // Load logo
        const logoBase64 = await getLogoBase64()

        // Create document
        const doc = createPDFDocument(body.groups, qrCodes, logoBase64)

        // Render PDF
        const pdfBuffer = await renderToBuffer(doc)

        // Return PDF
        return new NextResponse(pdfBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="labels_${new Date().toISOString().split('T')[0]}.pdf"`,
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
