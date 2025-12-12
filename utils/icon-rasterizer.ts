import ReactDOMServer from 'react-dom/server'
import React from 'react'
import { getIconComponent } from '@/utils/icon-map'
import { Folder } from 'lucide-react'

// Function to rasterize icon to PNG
export async function rasterizeIcon(iconName: string): Promise<string | null> {
    if (!iconName) return null
    if (typeof window === 'undefined') return null

    const iconData = getIconComponent(iconName) || Folder
    // @ts-ignore - Lucide icons are valid React components
    const svgString = ReactDOMServer.renderToStaticMarkup(React.createElement(iconData, {
        width: 100,
        height: 100,
        strokeWidth: 2,
        color: '#000000'
    }))

    const canvas = document.createElement('canvas')
    canvas.width = 100
    canvas.height = 100
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    const img = new Image()
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)

    return new Promise((resolve) => {
        img.onload = () => {
            ctx.drawImage(img, 0, 0)
            URL.revokeObjectURL(url)
            resolve(canvas.toDataURL('image/png'))
        }
        img.onerror = () => {
            URL.revokeObjectURL(url)
            resolve(null)
        }
        img.src = url
    })
}
