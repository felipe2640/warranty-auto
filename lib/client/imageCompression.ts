export type ImageCompressionOptions = {
  maxWidth: number
  maxHeight: number
  quality: number
}

const DEFAULT_OPTIONS: ImageCompressionOptions = {
  maxWidth: 1600,
  maxHeight: 1600,
  quality: 0.8,
}

function normalizeImageType(type: string) {
  if (type === "image/jpg") return "image/jpeg"
  if (type.startsWith("image/")) return type
  return "image/jpeg"
}

async function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file)

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = (error) => {
      URL.revokeObjectURL(url)
      reject(error)
    }
    img.src = url
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality)
  })
}

export async function compressImageFile(
  file: File,
  options: Partial<ImageCompressionOptions> = {},
): Promise<File> {
  if (!file.type.startsWith("image/")) {
    return file
  }

  const settings = { ...DEFAULT_OPTIONS, ...options }
  const img = await loadImageFromFile(file)

  const scale = Math.min(1, settings.maxWidth / img.width, settings.maxHeight / img.height)
  const targetWidth = Math.max(1, Math.round(img.width * scale))
  const targetHeight = Math.max(1, Math.round(img.height * scale))

  const canvas = document.createElement("canvas")
  canvas.width = targetWidth
  canvas.height = targetHeight

  const ctx = canvas.getContext("2d")
  if (!ctx) {
    return file
  }

  ctx.drawImage(img, 0, 0, targetWidth, targetHeight)

  const outputType = normalizeImageType(file.type)
  const quality = outputType === "image/png" ? 1 : settings.quality
  const blob = await canvasToBlob(canvas, outputType, quality)

  if (!blob) {
    return file
  }

  if (blob.size >= file.size && scale === 1) {
    return file
  }

  return new File([blob], file.name, {
    type: blob.type || outputType,
    lastModified: file.lastModified,
  })
}
