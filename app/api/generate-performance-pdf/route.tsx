import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer, Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer'
import React from 'react'
import { format } from 'date-fns'

async function registerFonts() {
    try {
        const fontPath = process.cwd() + '/public/fonts/Boldonse-Regular.ttf'
        const fs = await import('fs/promises')
        const buffer = await fs.readFile(fontPath)
        const base64 = buffer.toString('base64')
        Font.register({
            family: 'Boldonse',
            src: `data:font/truetype;base64,${base64}`,
        })
    } catch (e) {
        console.error('Failed to load Boldonse font:', e)
    }
    Font.register({
        family: 'Roboto',
        fonts: [
            { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf', fontWeight: 400 },
            { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 700 },
        ],
    })
}

const styles = StyleSheet.create({
    page: { padding: 30, fontFamily: 'Roboto', fontSize: 10 },
    header: { flexDirection: 'row', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#e5e5e5', paddingBottom: 10 },
    headerInfo: { flex: 1, alignItems: 'flex-end' },
    poster: { width: 100, height: 150, marginRight: 20, objectFit: 'cover' },
    titleSection: { flex: 1 },
    title: { fontSize: 24, fontFamily: 'Boldonse', marginBottom: 5 },
    status: { fontSize: 12, color: '#666', marginBottom: 10 },
    masterNote: { marginTop: 10, padding: 10, backgroundColor: '#f5f5f5', borderRadius: 4 },
    masterNoteTitle: { fontWeight: 'bold', marginBottom: 5 },
    sectionTitle: { fontSize: 14, fontWeight: 'bold', marginTop: 20, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#000', paddingBottom: 2 },
    table: { width: '100%', borderStyle: 'solid', borderWidth: 1, borderColor: '#e5e5e5', borderRightWidth: 0, borderBottomWidth: 0 },
    tableRow: { flexDirection: 'row', width: '100%' },
    tableHeader: { backgroundColor: '#282828', color: 'white', fontWeight: 'bold' },
    tableCell: { borderStyle: 'solid', borderWidth: 1, borderLeftWidth: 0, borderTopWidth: 0, borderColor: '#e5e5e5', padding: 5 },
    colName: { width: '55%' },
    colScene: { width: '25%' },
    colCheck: { width: '20%' },
    footer: { position: 'absolute', bottom: 30, left: 30, right: 30, textAlign: 'center', color: '#999', fontSize: 8, borderTopWidth: 1, borderTopColor: '#e5e5e5', paddingTop: 10 },
})

interface Performance {
    title: string
    status: string
    notes: string | null
    image_url: string | null
}

interface PerformanceItem {
    id: string
    scene_number: string | null
    items: {
        name: string
        image_url: string | null
    } | null
}

interface User {
    full_name: string | null
    email: string | undefined
}

interface RequestBody {
    production: Performance
    items: PerformanceItem[]
    user: User | null
}

const PerformancePdfDocument = ({ production, items, user }: RequestBody) => {
    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={{ marginBottom: 10, alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 8, color: '#666' }}>
                        Wygenerowano: {format(new Date(), 'dd.MM.yyyy HH:mm')}
                    </Text>
                    <Text style={{ fontSize: 8, color: '#666' }}>
                        Przez: {user?.full_name || user?.email || 'Nieznany użytkownik'}
                    </Text>
                </View>
                <View style={{ flexDirection: 'row', marginBottom: 20 }}>
                    {production.image_url && (
                        <Image src={production.image_url} style={styles.poster} />
                    )}
                    <View style={styles.titleSection}>
                        <Text style={styles.title}>{production.title}</Text>
                        <Text style={styles.status}>Status: {production.status}</Text>
                        {production.notes && (
                            <View style={styles.masterNote}>
                                <Text style={styles.masterNoteTitle}>Master Note:</Text>
                                <Text>{production.notes}</Text>
                            </View>
                        )}
                    </View>
                </View>
                <Text style={styles.sectionTitle}>Lista Rekwizytów</Text>
                <View style={styles.table}>
                    <View style={[styles.tableRow, styles.tableHeader]}>
                        <View style={[styles.tableCell, styles.colName]}><Text>Nazwa</Text></View>
                        <View style={[styles.tableCell, styles.colScene]}><Text>Scena</Text></View>
                        <View style={[styles.tableCell, styles.colCheck]}><Text>Sprawdzone</Text></View>
                    </View>
                    {items.map((item, index) => (
                        <View key={index} style={styles.tableRow} wrap={false}>
                            <View style={[styles.tableCell, styles.colName]}>
                                <Text>{item.items?.name || 'Nieznany przedmiot'}</Text>
                            </View>
                            <View style={[styles.tableCell, styles.colScene]}>
                                <Text>{item.scene_number ? `Scena ${item.scene_number}` : 'Nieprzypisane'}</Text>
                            </View>
                            <View style={[styles.tableCell, styles.colCheck]}>
                                <Text>[   ]</Text>
                            </View>
                        </View>
                    ))}
                </View>
                <Text style={styles.footer} render={({ pageNumber, totalPages }) => (
                    `Rekwizytor - Strona ${pageNumber} z ${totalPages}`
                )} fixed />
            </Page>
        </Document>
    )
}

export async function POST(request: NextRequest) {
    try {
        const body: RequestBody = await request.json()
        if (!body.production || !body.items) {
            return NextResponse.json({ error: 'Invalid request: production and items required' }, { status: 400 })
        }
        await registerFonts()
        const buffer = await renderToBuffer(
            <PerformancePdfDocument
                production={body.production}
                items={body.items}
                user={body.user}
            />
        )
        const safeTitle = body.production.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()
        return new NextResponse(new Uint8Array(buffer), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${safeTitle}_export_${format(new Date(), 'yyyy-MM-dd')}.pdf"`,
            },
        })
    } catch (error) {
        console.error('PDF Generation Error:', error)
        return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
    }
}
