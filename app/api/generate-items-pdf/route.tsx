import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer, Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
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
    header: { marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#e5e5e5', paddingBottom: 10 },
    title: { fontSize: 24, fontFamily: 'Boldonse', marginBottom: 5 },
    subtitle: { fontSize: 10, color: '#666' },
    table: { width: '100%', borderStyle: 'solid', borderWidth: 1, borderColor: '#e5e5e5', borderRightWidth: 0, borderBottomWidth: 0 },
    tableRow: { flexDirection: 'row', width: '100%' },
    tableHeader: { backgroundColor: '#f5f5f5', fontWeight: 'bold' },
    tableCell: { borderStyle: 'solid', borderWidth: 1, borderLeftWidth: 0, borderTopWidth: 0, borderColor: '#e5e5e5', padding: 5 },
    colName: { width: '40%' },
    colNotes: { width: '35%' },
    colStatus: { width: '15%' },
    colCheck: { width: '10%' },
    footer: { position: 'absolute', bottom: 30, left: 30, right: 30, textAlign: 'center', color: '#999', fontSize: 8, borderTopWidth: 1, borderTopColor: '#e5e5e5', paddingTop: 10 },
})

interface Item {
    name: string
    notes: string | null
    performance_status: string | null
    created_at: string
}

interface RequestBody {
    items: Item[]
}

const ItemsPdfDocument = ({ items }: { items: Item[] }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            <View style={styles.header}>
                <Text style={styles.title}>Lista Rekwizytów</Text>
                <Text style={styles.subtitle}>
                    Wygenerowano: {format(new Date(), 'dd.MM.yyyy HH:mm')}
                </Text>
            </View>
            <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHeader]}>
                    <View style={[styles.tableCell, styles.colName]}><Text>Nazwa</Text></View>
                    <View style={[styles.tableCell, styles.colNotes]}><Text>Notatki</Text></View>
                    <View style={[styles.tableCell, styles.colStatus]}><Text>Status</Text></View>
                    <View style={[styles.tableCell, styles.colCheck]}><Text>Sprawdzone</Text></View>
                </View>
                {items.map((item, index) => (
                    <View key={index} style={styles.tableRow} wrap={false}>
                        <View style={[styles.tableCell, styles.colName]}><Text>{item.name}</Text></View>
                        <View style={[styles.tableCell, styles.colNotes]}><Text>{item.notes || '-'}</Text></View>
                        <View style={[styles.tableCell, styles.colStatus]}><Text>{item.performance_status || 'Nieprzypisany'}</Text></View>
                        <View style={[styles.tableCell, styles.colCheck]}><Text></Text></View>
                    </View>
                ))}
            </View>
            <Text style={styles.footer} render={({ pageNumber, totalPages }) => (
                `Rekwizytor - Strona ${pageNumber} z ${totalPages}`
            )} fixed />
        </Page>
    </Document>
)

export async function POST(request: NextRequest) {
    try {
        const body: RequestBody = await request.json()
        if (!body.items || !Array.isArray(body.items)) {
            return NextResponse.json({ error: 'Invalid request: items array required' }, { status: 400 })
        }
        await registerFonts()
        const buffer = await renderToBuffer(<ItemsPdfDocument items={body.items} />)
        return new NextResponse(new Uint8Array(buffer), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="items_list_${format(new Date(), 'yyyy-MM-dd')}.pdf"`,
            },
        })
    } catch (error) {
        console.error('PDF Generation Error:', error)
        return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
    }
}
