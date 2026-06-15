const maxUploadImageEdge = 2200
export const maxUploadImageSizeBytes = 8 * 1024 * 1024
const compressionSizeThreshold = 1_200_000
const uploadImageQuality = 0.82
const compressedUploadMimeType = 'image/webp'
const allowedUploadImageTypes = new Set(['image/gif', 'image/jpeg', 'image/png', 'image/webp'])

export type ImageUploadPreparationResult = {
  file: File
  originalSize: number
  preparedSize: number
  wasPrepared: boolean
}

type ImageDimensions = {
  width: number
  height: number
}

const supportedCanvasInputTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

export const validatePreparedImageUpload = (file: Pick<File, 'size' | 'type'>) => {
  if (!allowedUploadImageTypes.has(file.type)) {
    return 'Only JPEG, PNG, WebP, and GIF images are supported.'
  }

  if (file.size > maxUploadImageSizeBytes) {
    return 'Image file must be 8 MB or smaller.'
  }

  return null
}

export const shouldPrepareImageUpload = (file: Pick<File, 'size' | 'type'>, dimensions: ImageDimensions) =>
  supportedCanvasInputTypes.has(file.type) &&
  (file.size > compressionSizeThreshold || Math.max(dimensions.width, dimensions.height) > maxUploadImageEdge)

export const getResizedImageDimensions = (
  dimensions: ImageDimensions,
  maxEdge = maxUploadImageEdge,
): ImageDimensions => {
  const largestEdge = Math.max(dimensions.width, dimensions.height)
  if (largestEdge <= maxEdge) {
    return dimensions
  }

  const scale = maxEdge / largestEdge
  return {
    width: Math.max(1, Math.round(dimensions.width * scale)),
    height: Math.max(1, Math.round(dimensions.height * scale)),
  }
}

export const getPreparedImageFileName = (fileName: string) => {
  const nameWithoutExtension = fileName.replace(/\.[^.]+$/, '').trim()
  return `${nameWithoutExtension.length === 0 ? 'image' : nameWithoutExtension}.webp`
}

const hasBrowserImageTools = () =>
  typeof document !== 'undefined' &&
  typeof Image !== 'undefined' &&
  typeof URL !== 'undefined' &&
  typeof URL.createObjectURL === 'function'

const loadImageElement = async (file: File) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    const objectUrl = URL.createObjectURL(file)

    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Could not decode image.'))
    }
    image.src = objectUrl
  })

const canvasToBlob = async (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality)
  })

export const prepareImageForUpload = async (file: File): Promise<ImageUploadPreparationResult> => {
  const originalResult = {
    file,
    originalSize: file.size,
    preparedSize: file.size,
    wasPrepared: false,
  }

  if (!supportedCanvasInputTypes.has(file.type) || !hasBrowserImageTools()) {
    return originalResult
  }

  try {
    const image = await loadImageElement(file)
    const sourceDimensions = {
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height,
    }

    if (sourceDimensions.width <= 0 || sourceDimensions.height <= 0 || !shouldPrepareImageUpload(file, sourceDimensions)) {
      return originalResult
    }

    const targetDimensions = getResizedImageDimensions(sourceDimensions)
    const canvas = document.createElement('canvas')
    canvas.width = targetDimensions.width
    canvas.height = targetDimensions.height

    const context = canvas.getContext('2d')
    if (context === null) {
      return originalResult
    }

    context.drawImage(image, 0, 0, targetDimensions.width, targetDimensions.height)
    const blob = await canvasToBlob(canvas, compressedUploadMimeType, uploadImageQuality)
    if (blob === null || blob.size === 0) {
      return originalResult
    }

    const resized = targetDimensions.width !== sourceDimensions.width || targetDimensions.height !== sourceDimensions.height
    if (!resized && blob.size >= file.size) {
      return originalResult
    }

    const preparedFile = new File([blob], getPreparedImageFileName(file.name), {
      type: compressedUploadMimeType,
      lastModified: Date.now(),
    })

    return {
      file: preparedFile,
      originalSize: file.size,
      preparedSize: preparedFile.size,
      wasPrepared: true,
    }
  } catch {
    return originalResult
  }
}
