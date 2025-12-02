import jsPDF from 'jspdf'

export async function loadPdfFonts(doc: jsPDF): Promise<boolean> {
    const fonts = [
        {
            url: '/fonts/Roboto-Regular.ttf',
            filename: 'Roboto-Regular.ttf',
            fontName: 'Roboto',
            fontStyle: 'normal'
        },
        {
            url: '/fonts/Roboto-Bold.ttf',
            filename: 'Roboto-Bold.ttf',
            fontName: 'Roboto',
            fontStyle: 'bold'
        }
    ]

    let loadedAny = false

    for (const font of fonts) {
        try {
            const fontUrl = window.location.origin + font.url
            const response = await fetch(fontUrl)

            if (!response.ok) {
                console.warn(`Failed to fetch font ${font.filename}: ${response.status} ${response.statusText}`)
                continue
            }

            const contentType = response.headers.get('content-type')
            if (contentType && contentType.includes('text/html')) {
                console.warn(`Failed to fetch font ${font.filename}: Server returned HTML instead of font file. Check file path.`)
                continue
            }

            const blob = await response.blob()
            if (blob.size < 1000) {
                console.warn(`Font file ${font.filename} seems too small (${blob.size} bytes). Skipping.`)
                continue
            }

            const reader = new FileReader()
            const success = await new Promise<boolean>((resolve) => {
                reader.onloadend = () => {
                    const base64data = reader.result as string
                    if (!base64data || !base64data.includes(',')) {
                        console.error(`Failed to read font data for ${font.filename}`)
                        resolve(false)
                        return
                    }

                    const base64Content = base64data.split(',')[1]

                    if (base64Content) {
                        try {
                            // Important: filename in addFileToVFS must match filename in addFont
                            doc.addFileToVFS(font.filename, base64Content)
                            doc.addFont(font.filename, font.fontName, font.fontStyle)
                            console.log(`Successfully loaded font: ${font.filename}`)
                            resolve(true)
                        } catch (fontError) {
                            console.error(`Error adding font ${font.filename} to jsPDF:`, fontError)
                            resolve(false)
                        }
                    } else {
                        resolve(false)
                    }
                }
                reader.onerror = () => {
                    console.error(`Error reading font blob for ${font.filename}`)
                    resolve(false)
                }
                reader.readAsDataURL(blob)
            })

            if (success) {
                loadedAny = true
            }
        } catch (e) {
            console.error(`Exception loading font ${font.filename}:`, e)
        }
    }

    return loadedAny
}

export async function loadAppLogo(): Promise<string | null> {
    try {
        const logoUrl = window.location.origin + '/logo-pdf.png'
        const response = await fetch(logoUrl)
        if (!response.ok) return null

        const blob = await response.blob()
        return new Promise((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => {
                resolve(reader.result as string)
            }
            reader.onerror = () => resolve(null)
            reader.readAsDataURL(blob)
        })
    } catch (e) {
        console.error("Failed to load logo", e)
        return null
    }
}

import QRCode from 'qrcode'

interface GroupLabelData {
    id: string
    name: string
    locationName?: string
}

/**
 * Safely set font with fallback to Helvetica
 */
function setFontSafely(doc: jsPDF, useCustomFonts: boolean, style: 'normal' | 'bold') {
    if (useCustomFonts) {
        try {
            doc.setFont('Roboto', style)
        } catch (e) {
            console.warn('Failed to set Roboto font, falling back to Helvetica')
            doc.setFont('helvetica', style)
        }
    } else {
        doc.setFont('helvetica', style)
    }
}

/**
 * Safely split text to size with fallback
 */
function splitTextSafely(doc: jsPDF, text: string, maxWidth: number): string | string[] {
    try {
        return doc.splitTextToSize(text, maxWidth)
    } catch (e) {
        console.error('Error splitting text, falling back to simple split:', e)
        // Fallback: simple text wrapping
        const words = text.split(' ')
        const lines: string[] = []
        let currentLine = ''

        for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word
            const testWidth = doc.getTextWidth(testLine)

            if (testWidth > maxWidth && currentLine) {
                lines.push(currentLine)
                currentLine = word
            } else {
                currentLine = testLine
            }
        }

        if (currentLine) {
            lines.push(currentLine)
        }

        return lines.length > 0 ? lines : [text]
    }
}

export async function drawGroupLabel(
    doc: jsPDF,
    x: number,
    y: number,
    width: number,
    height: number,
    data: GroupLabelData,
    logoBase64: string | null,
    useCustomFonts: boolean = false
) {
    // Generate QR Code
    const groupUrl = `${window.location.origin}/items?groupId=${data.id}`
    const qrCodeDataUrl = await QRCode.toDataURL(groupUrl, {
        errorCorrectionLevel: 'H',
        margin: 0,
        width: 200
    })

    const margin = 5
    const centerX = x + (width / 2)

    // 1. Group Name (Top Center, Bold)
    setFontSafely(doc, useCustomFonts, 'bold')

    // Reduced font size to avoid overlap
    doc.setFontSize(16)
    doc.setTextColor(0)

    // Allow name to wrap if too long
    const maxNameWidth = width - (margin * 2)
    const splitName = splitTextSafely(doc, data.name, maxNameWidth)
    const splitNameArray = Array.isArray(splitName) ? splitName : [splitName]

    // Calculate vertical center offset for the text block (Name + Location)
    // Moved up slightly (y + 10 instead of y + 15)
    doc.text(splitNameArray, centerX, y + 10, { align: 'center' })

    // 2. Location (Below Name, Center, Regular)
    let currentY = y + 10 + (splitNameArray.length * 7) // Dynamic Y based on name lines (reduced line height)

    if (data.locationName) {
        setFontSafely(doc, useCustomFonts, 'normal')
        doc.setFontSize(10) // Reduced from 12
        doc.setTextColor(60)
        doc.text(data.locationName, centerX, currentY, { align: 'center' })
    }

    // 3. QR Code (Bottom Right)
    const qrSize = 25
    doc.addImage(qrCodeDataUrl, 'PNG', x + width - margin - qrSize, y + height - margin - qrSize, qrSize, qrSize)

    // 4. Logo (Bottom Left)
    if (logoBase64) {
        const logoWidth = 25 // Fixed width for logo
        const imgProps = doc.getImageProperties(logoBase64)
        const logoHeight = (imgProps.height * logoWidth) / imgProps.width

        // Align bottom of logo with bottom of QR code (approx)
        const logoY = y + height - margin - logoHeight
        doc.addImage(logoBase64, 'PNG', x + margin, logoY, logoWidth, logoHeight)
    }

    // Footer / ID (Small, bottom center)
    setFontSafely(doc, useCustomFonts, 'normal')
    doc.setFontSize(6)
    doc.setTextColor(150)
    doc.text(data.id.slice(0, 8), centerX, y + height - 2, { align: 'center' })
}

export async function generateAllGroupsLabelsPdf(groups: GroupLabelData[]) {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    })

    // Try to load custom fonts, but continue even if they fail
    const fontsLoaded = await loadPdfFonts(doc)
    console.log('Custom fonts loaded:', fontsLoaded)

    const logoBase64 = await loadAppLogo()

    const pageWidth = 210
    const pageHeight = 297
    const margin = 10 // Page margin
    const labelWidth = 90
    const labelHeight = 50
    const colGap = 10
    const rowGap = 0 // No gap between rows for easier cutting, or small gap? User image shows dashed lines.

    // Grid configuration: 2 columns, 5 rows per page = 10 labels per page
    const cols = 2
    const rows = 5
    const labelsPerPage = cols * rows

    // Calculate starting X to center the grid
    const gridWidth = (cols * labelWidth) + ((cols - 1) * colGap)
    const startX = (pageWidth - gridWidth) / 2
    const startY = 15

    for (let i = 0; i < groups.length; i++) {
        const group = groups[i]
        const pageIndex = Math.floor(i / labelsPerPage)
        const positionOnPage = i % labelsPerPage

        // Add new page if needed
        if (i > 0 && positionOnPage === 0) {
            doc.addPage()
        }

        const col = positionOnPage % cols
        const row = Math.floor(positionOnPage / cols)

        const x = startX + (col * (labelWidth + colGap))
        const y = startY + (row * labelHeight)

        // Draw Cut Lines (Dashed) around the label
        doc.setDrawColor(200)
        doc.setLineDashPattern([2, 2], 0)
        doc.rect(x, y, labelWidth, labelHeight)
        doc.setLineDashPattern([], 0) // Reset dash

        // Draw Label Content - pass fontsLoaded to indicate if custom fonts are available
        await drawGroupLabel(doc, x, y, labelWidth, labelHeight, group, logoBase64, fontsLoaded)
    }

    doc.save(`all_groups_labels_${new Date().toISOString().split('T')[0]}.pdf`)
}
