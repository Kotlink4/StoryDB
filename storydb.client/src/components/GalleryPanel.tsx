import type { ReactNode } from 'react'

import { resolveAssetUrl } from '../api'
import type { PreviewText } from '../style-preview/domain/stylePreviewI18n'
import { CoverDropzone } from './ImageInputs'

export type GalleryPanelImage = {
  caption: string | null
  id: number
  imagePath: string
}

export function GalleryPanel({
  caption,
  className = '',
  images,
  imagePath,
  title,
  ui,
  uploadMode = 'file',
  renderCaption,
  onAddImage,
  onCaptionChange,
  onDeleteImage,
  onImageUpload,
}: {
  caption: string
  className?: string
  images: GalleryPanelImage[]
  imagePath: string | null
  title: string
  ui: PreviewText
  uploadMode?: 'coverDropzone' | 'file'
  renderCaption?: (caption: string | null) => ReactNode
  onAddImage?: () => void
  onCaptionChange?: (caption: string) => void
  onDeleteImage?: (imageId: number) => void
  onImageUpload?: (file: File | null) => void
}) {
  const canUpload = onImageUpload !== undefined

  return (
    <section className="sp-panel">
      <h3>{title}</h3>
      {canUpload && (
        <div className={className}>
          {uploadMode === 'coverDropzone' ? (
            <CoverDropzone
              cropMode="none"
              imagePath={imagePath}
              label={ui.addGalleryImage}
              ui={ui}
              onFileSelected={(file) => onImageUpload(file)}
            />
          ) : (
            <input type="file" accept="image/*" onChange={(event) => onImageUpload(event.target.files?.[0] ?? null)} />
          )}
          <div className="sp-editor-row">
            <input
              placeholder={ui.caption}
              value={caption}
              onChange={(event) => onCaptionChange?.(event.target.value)}
            />
            <button disabled={imagePath === null} type="button" onClick={onAddImage}>
              {ui.addImage}
            </button>
          </div>
        </div>
      )}
      {images.length === 0 ? (
        <p>{ui.noGalleryImages}</p>
      ) : (
        <div className="sp-gallery-grid">
          {images.map((image) => (
            <article className="sp-gallery-card" key={image.id}>
              <img alt="" src={resolveAssetUrl(image.imagePath) ?? undefined} />
              <span>{renderCaption === undefined ? image.caption ?? '-' : renderCaption(image.caption)}</span>
              {onDeleteImage !== undefined && (
                <button type="button" onClick={() => onDeleteImage(image.id)}>
                  {ui.delete}
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
