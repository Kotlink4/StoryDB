import { describe, expect, it } from 'vitest'

import {
  getPreparedImageFileName,
  getResizedImageDimensions,
  maxUploadImageSizeBytes,
  prepareImageForUpload,
  shouldPrepareImageUpload,
  validatePreparedImageUpload,
} from './imageUploadPreparation'

describe('image upload preparation', () => {
  it('keeps small canvas-friendly images unchanged', () => {
    expect(shouldPrepareImageUpload({ size: 320_000, type: 'image/jpeg' }, { width: 1200, height: 800 })).toBe(false)
  })

  it('prepares large or oversized canvas-friendly images', () => {
    expect(shouldPrepareImageUpload({ size: 1_500_000, type: 'image/jpeg' }, { width: 1200, height: 800 })).toBe(true)
    expect(shouldPrepareImageUpload({ size: 320_000, type: 'image/png' }, { width: 3000, height: 1800 })).toBe(true)
  })

  it('does not prepare gif uploads so animation is preserved', () => {
    expect(shouldPrepareImageUpload({ size: 4_000_000, type: 'image/gif' }, { width: 3000, height: 1800 })).toBe(false)
  })

  it('validates prepared files before sending them to the API', () => {
    expect(validatePreparedImageUpload({ size: 200_000, type: 'image/webp' })).toBeNull()
    expect(validatePreparedImageUpload({ size: 200_000, type: 'image/svg+xml' })).toContain('JPEG')
    expect(validatePreparedImageUpload({ size: maxUploadImageSizeBytes + 1, type: 'image/gif' })).toContain('8 MB')
  })

  it('resizes proportionally against the maximum edge', () => {
    expect(getResizedImageDimensions({ width: 4400, height: 2200 })).toEqual({ width: 2200, height: 1100 })
    expect(getResizedImageDimensions({ width: 1200, height: 900 })).toEqual({ width: 1200, height: 900 })
  })

  it('normalizes prepared image names to webp', () => {
    expect(getPreparedImageFileName('cover.large.png')).toBe('cover.large.webp')
    expect(getPreparedImageFileName('.png')).toBe('image.webp')
  })

  it('falls back to the original file when browser image tools are unavailable', async () => {
    const file = { name: 'large.png', size: 2_000_000, type: 'image/png' } as File

    await expect(prepareImageForUpload(file)).resolves.toEqual({
      file,
      originalSize: 2_000_000,
      preparedSize: 2_000_000,
      wasPrepared: false,
    })
  })
})
