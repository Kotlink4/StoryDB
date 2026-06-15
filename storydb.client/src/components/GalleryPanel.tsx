import { useEffect, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

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
  isCoverInGallery = false,
  title,
  ui,
  uploadMode = 'file',
  renderCaption,
  onAddImage,
  onAddCoverImage,
  onCaptionChange,
  onDeleteImage,
  onImageUpload,
}: {
  caption: string
  className?: string
  images: GalleryPanelImage[]
  imagePath: string | null
  isCoverInGallery?: boolean
  title: string
  ui: PreviewText
  uploadMode?: 'coverDropzone' | 'file'
  renderCaption?: (caption: string | null) => ReactNode
  onAddImage?: () => void
  onAddCoverImage?: () => void
  onCaptionChange?: (caption: string) => void
  onDeleteImage?: (imageId: number) => void
  onImageUpload?: (file: File | null) => void
}) {
  const canUpload = onImageUpload !== undefined
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null)
  const activeImage =
    activeImageIndex === null || activeImageIndex < 0 || activeImageIndex >= images.length ? null : images[activeImageIndex]
  const activeImageUrl = resolveAssetUrl(activeImage?.imagePath ?? null)
  const canNavigate = images.length > 1
  const openImage = (imageIndex: number) => setActiveImageIndex(imageIndex)
  const closeImage = () => setActiveImageIndex(null)
  const showPreviousImage = () =>
    setActiveImageIndex((currentIndex) =>
      currentIndex === null || images.length === 0 ? currentIndex : (currentIndex - 1 + images.length) % images.length,
    )
  const showNextImage = () =>
    setActiveImageIndex((currentIndex) =>
      currentIndex === null || images.length === 0 ? currentIndex : (currentIndex + 1) % images.length,
    )

  useEffect(() => {
    if (activeImage === null) {
      return undefined
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveImageIndex(null)
      } else if (event.key === 'ArrowLeft') {
        setActiveImageIndex((currentIndex) =>
          currentIndex === null || images.length === 0 ? currentIndex : (currentIndex - 1 + images.length) % images.length,
        )
      } else if (event.key === 'ArrowRight') {
        setActiveImageIndex((currentIndex) =>
          currentIndex === null || images.length === 0 ? currentIndex : (currentIndex + 1) % images.length,
        )
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [activeImage, images.length])

  useEffect(() => {
    if (activeImageIndex !== null && activeImageIndex >= images.length) {
      setActiveImageIndex(images.length === 0 ? null : images.length - 1)
    }
  }, [activeImageIndex, images.length])

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
          {onAddCoverImage !== undefined && (
            <button
              className="sp-button"
              disabled={isCoverInGallery}
              type="button"
              onClick={onAddCoverImage}
            >
              {isCoverInGallery ? ui.coverAlreadyInGallery : ui.addCoverToGallery}
            </button>
          )}
        </div>
      )}
      {images.length === 0 ? (
        <p>{ui.noGalleryImages}</p>
      ) : (
        <div className="sp-gallery-grid">
          {images.map((image, imageIndex) => (
            <article className="sp-gallery-card" key={image.id}>
              <button
                className="sp-gallery-preview-button"
                type="button"
                onClick={() => openImage(imageIndex)}
                aria-label={ui.openGalleryImage}
              >
                <img alt="" src={resolveAssetUrl(image.imagePath) ?? undefined} />
              </button>
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
      {activeImage !== null && activeImageUrl !== null && (
        <div className="sp-gallery-viewer" role="dialog" aria-modal="true" aria-label={ui.galleryViewer}>
          <button className="sp-gallery-viewer-backdrop" type="button" aria-label={ui.close} onClick={closeImage} />
          <div className="sp-gallery-viewer-content">
            <div className="sp-gallery-viewer-head">
              <div>
                <strong>{activeImage.caption?.trim() || ui.gallery}</strong>
                <span>
                  {(activeImageIndex ?? 0) + 1} / {images.length}
                </span>
              </div>
              <button className="sp-icon-button" type="button" aria-label={ui.close} onClick={closeImage}>
                <X aria-hidden="true" size={18} />
              </button>
            </div>
            <div className="sp-gallery-viewer-stage">
              {canNavigate && (
                <button
                  className="sp-gallery-viewer-nav previous"
                  type="button"
                  aria-label={ui.previousImage}
                  onClick={showPreviousImage}
                >
                  <ChevronLeft aria-hidden="true" size={24} />
                </button>
              )}
              <img alt="" src={activeImageUrl} />
              {canNavigate && (
                <button
                  className="sp-gallery-viewer-nav next"
                  type="button"
                  aria-label={ui.nextImage}
                  onClick={showNextImage}
                >
                  <ChevronRight aria-hidden="true" size={24} />
                </button>
              )}
            </div>
            {activeImage.caption !== null && activeImage.caption.trim().length > 0 && (
              <p className="sp-gallery-viewer-caption">
                {renderCaption === undefined ? activeImage.caption : renderCaption(activeImage.caption)}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
