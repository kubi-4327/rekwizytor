export async function compressImage(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            const img = new Image()
            img.onload = () => {
                const canvas = document.createElement('canvas')
                const ctx = canvas.getContext('2d')

                if (!ctx) {
                    reject(new Error('Failed to get canvas context'))
                    return
                }

                // Max size 1024px (maintain aspect ratio)
                const maxSize = 1024
                let width = img.width
                let height = img.height

                if (width > height && width > maxSize) {
                    height = (height * maxSize) / width
                    width = maxSize
                } else if (height > maxSize) {
                    width = (width * maxSize) / height
                    height = maxSize
                }

                canvas.width = width
                canvas.height = height
                ctx.drawImage(img, 0, 0, width, height)

                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(blob)
                    } else {
                        reject(new Error('Failed to compress image'))
                    }
                }, 'image/jpeg', 0.85)
            }
            img.onerror = () => reject(new Error('Failed to load image'))
            img.src = e.target?.result as string
        }
        reader.onerror = () => reject(new Error('Failed to read file'))
        reader.readAsDataURL(file)
    })
}

export async function createThumbnail(file: File, size: number = 300): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            const img = new Image()
            img.onload = () => {
                const canvas = document.createElement('canvas')
                const ctx = canvas.getContext('2d')

                if (!ctx) {
                    reject(new Error('Failed to get canvas context'))
                    return
                }

                // Square crop logic with safety zoom (5%) to avoid edge artifacts
                const minDimension = Math.min(img.width, img.height)
                const cropSize = minDimension * 0.95 // Crop 95% of the center
                const sx = (img.width - cropSize) / 2
                const sy = (img.height - cropSize) / 2

                canvas.width = size
                canvas.height = size

                // Draw cropped and resized image
                ctx.drawImage(img, sx, sy, cropSize, cropSize, 0, 0, size, size)

                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(blob)
                    } else {
                        reject(new Error('Failed to create thumbnail'))
                    }
                }, 'image/jpeg', 0.80)
            }
            img.onerror = () => reject(new Error('Failed to load image'))
            img.src = e.target?.result as string
        }
        reader.onerror = () => reject(new Error('Failed to read file'))
        reader.readAsDataURL(file)
    })
}
