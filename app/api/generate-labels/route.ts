import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { renderToBuffer } from '@react-pdf/renderer'
import QRCode from 'qrcode'
import { Document, Page, Text, View, Image, StyleSheet, Font } from '@react-pdf/renderer'
import React from 'react'

interface GroupData {
    id: string
    name: string
    locationName?: string

    short_id?: string
    iconImage?: string
}

interface RequestBody {
    groups: GroupData[]
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
        lineHeight: 1.15,
        // wordWrap: 'break-word', // Removed to prevent splitting words
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
    icon: {
        position: 'absolute',
        top: '4mm',
        right: '4mm',
        width: '8mm',
        height: '8mm',
        objectFit: 'contain',
        opacity: 0.8
    }
})

// Create PDF document using React.createElement
function createPDFDocument(groups: GroupData[], qrData: { code: string, dataUrl: string }[]) {
    const labelsPerPage = 10
    const pages: GroupData[][] = []

    for (let i = 0; i < groups.length; i += labelsPerPage) {
        pages.push(groups.slice(i, i + labelsPerPage))
    }

    const pageElements = pages.map((pageGroups, pageIndex) => {
        const labelElements = pageGroups.map((group, idx) => {
            const globalIdx = pageIndex * labelsPerPage + idx

            // Calculate dynamic font size based on name length
            // Shifted down by one step as requested
            // Boldonse is taller than Courier Prime (~1.7x at same font size)
            let nameFontSize = 20 // Reduced base size from 24
            if (group.name.length > 10) {
                nameFontSize = 16
            }
            if (group.name.length > 20) {
                nameFontSize = 14
            }
            if (group.name.length > 30) {
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

            // Location at top left (if exists)
            if (group.locationName) {
                children.push(
                    React.createElement(Text, { key: 'location', style: styles.labelLocation }, group.locationName)
                )
            }

            // Main name in center
            children.push(
                React.createElement(Text, { key: 'name', style: dynamicNameStyle }, group.name)
            )

            // Icon at top right (if exists)
            if (group.iconImage) {
                children.push(
                    React.createElement(Image, { key: 'icon', src: group.iconImage, style: styles.icon })
                )
            }

            // QR code at bottom right
            children.push(
                React.createElement(Image, { key: 'qr', src: qrData[globalIdx].dataUrl, style: styles.qrCode })
            )

            // "Rekwizytor" text at bottom left (instead of logo)
            children.push(
                React.createElement(Text, { key: 'rekwizytor', style: styles.rekwizytor }, 'Rekwizytor')
            )

            // ID at bottom center (Use the Universal Short Code)
            children.push(
                React.createElement(Text, { key: 'id', style: styles.labelId }, qrData[globalIdx].code)
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
            [
                React.createElement(Text, { key: 'header', style: styles.pageHeader }, 'Narzędzie dla teatru'),
                React.createElement(View, { key: 'grid', style: styles.grid }, labelElements)
            ]
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

        // Register Boldonse font
        await registerBoldonseFont()

        // Generate QR codes
        // Generate QR codes with Universal Logic
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        // Setup code generator
        const { customAlphabet } = await import('nanoid')
        const generateCode = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 6)

        const qrCodes = await Promise.all(
            body.groups.map(async (group) => {
                const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
                const targetUrl = `/groups?viewGroup=${group.id}`
                let code = ''

                // 1. Try to find existing QR code for this target
                // We assume there's one canonical code for this exact URL created by the system
                const { data: existing } = await supabase
                    .from('qr_codes')
                    .select('code')
                    .eq('target_url', targetUrl)
                    .eq('active', true) // Prefer active ones
                    .limit(1)
                    .single()

                if (existing) {
                    code = existing.code
                } else {
                    // 2. Create new code if doesn't exist
                    code = generateCode()
                    await supabase.from('qr_codes').insert({
                        code,
                        target_url: targetUrl,
                        description: `Etykieta: ${group.name}`, // Auto-generated label
                        created_by: user?.id, // Link to user printing it
                        access_level: 'authenticated', // Safe default
                        active: true
                    })
                }

                // 3. Generate QR Image pointing to the Universal Redirector
                const universalUrl = `${baseUrl}/qr/${code}`

                const dataUrl = await QRCode.toDataURL(universalUrl, {
                    errorCorrectionLevel: 'L',
                    margin: 0,
                    width: 200,
                })

                return { code, dataUrl }
            })
        )

        // Create document (no logo needed - we use text 'Rekwizytor' instead)
        const doc = createPDFDocument(body.groups, qrCodes)

        // Render PDF
        const pdfBuffer = await renderToBuffer(doc)

        // Return PDF (convert Buffer to Uint8Array for NextResponse)
        return new NextResponse(new Uint8Array(pdfBuffer), {
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
