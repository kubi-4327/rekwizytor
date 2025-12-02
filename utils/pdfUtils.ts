import jsPDF from 'jspdf'

// Note: Custom font loading has been disabled due to jsPDF initialization issues.
// The PDF will use the built-in Helvetica font which supports Polish characters
// and works reliably without requiring custom font files.
export async function loadPdfFonts(doc: jsPDF): Promise<boolean> {
    console.log('Using built-in Helvetica font for PDF generation')
    return false // Indicate that no custom fonts were loaded
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
 * Set font using built-in Helvetica
 */
function setFontSafely(doc: jsPDF, style: 'normal' | 'bold') {
    doc.setFont('helvetica', style)
}

/**
 * Split text to size using built-in Helvetica
 */
function splitTextSafely(doc: jsPDF, text: string, maxWidth: number): string[] {
    const result = doc.splitTextToSize(text, maxWidth)
    return Array.isArray(result) ? result : [result]
}

export async function drawGroupLabel(
    doc: jsPDF,
    x: number,
    y: number,
    width: number,
    height: number,
    data: GroupLabelData,
    logoBase64: string | null
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
    setFontSafely(doc, 'bold')

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
        setFontSafely(doc, 'normal')
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
    setFontSafely(doc, 'normal')
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

        // Draw Label Content
        await drawGroupLabel(doc, x, y, labelWidth, labelHeight, group, logoBase64)
    }

    doc.save(`all_groups_labels_${new Date().toISOString().split('T')[0]}.pdf`)
}
