import { useEffect, useRef, useState } from 'react'
import { Cropper, ImageRestriction, type CropperRef } from 'react-advanced-cropper'

import { resolveAssetUrl } from '../api'
import type { PreviewText } from '../stylePreviewI18n'
import { PreviewDialog } from './StylePreviewPrimitives'

export type ImageCropMode = 'none' | 'avatar' | 'cover'

type ImageCropSize = {
  height: number
  width: number
}

const imageCropOutputSizes: Record<Exclude<ImageCropMode, 'none'>, ImageCropSize> = {
  avatar: {
    width: 640,
    height: 640,
  },
  cover: {
    width: 1600,
    height: 900,
  },
}

function ImageCropDialog({
  file,
  label,
  mode,
  sourceUrl,
  ui,
  onCancel,
  onConfirm,
}: {
  file: File
  label: string
  mode: Exclude<ImageCropMode, 'none'>
  sourceUrl: string
  ui: PreviewText
  onCancel: () => void
  onConfirm: (file: File) => void
}) {
  const aspectRatio = mode === 'avatar' ? 1 : 16 / 9
  const outputSize = imageCropOutputSizes[mode]
  const cropperRef = useRef<CropperRef | null>(null)

  const resetCrop = () => {
    cropperRef.current?.reset()
  }

  const applyCrop = async () => {
    const outputCanvas = cropperRef.current?.getCanvas({
      height: outputSize.height,
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high',
      width: outputSize.width,
    })
    if (outputCanvas === undefined || outputCanvas === null) {
      return
    }

    const blob = await new Promise<Blob | null>((resolve) => {
      outputCanvas.toBlob(resolve, 'image/jpeg', 0.92)
    })

    if (blob === null) {
      return
    }

    const fileName = file.name.replace(/\.[^.]+$/, '') || 'image'
    onConfirm(new File([blob], `${fileName}-${mode}.jpg`, { type: 'image/jpeg' }))
  }

  return (
    <PreviewDialog title={`${ui.edit}: ${label.toLowerCase()}`} onClose={onCancel}>
      <div className="sp-crop-editor">
        <Cropper
          ref={cropperRef}
          className={`sp-crop-stage ${mode === 'avatar' ? 'avatar' : 'cover'}`}
          imageRestriction={ImageRestriction.stencil}
          src={sourceUrl}
          stencilProps={{
            aspectRatio,
            grid: true,
          }}
          transitions
        />
        <p className="sp-crop-hint">{ui.cropHint}</p>
        <div className="sp-dialog-actions">
          <button className="sp-button" type="button" onClick={resetCrop}>
            {ui.cropReset}
          </button>
          <button className="sp-button" type="button" onClick={onCancel}>
            {ui.cancel}
          </button>
          <button className="sp-button primary" type="button" onClick={() => void applyCrop()}>
            {ui.cropApply}
          </button>
        </div>
      </div>
    </PreviewDialog>
  )
}

export function CoverDropzone({
  className = '',
  cropMode,
  imagePath,
  label,
  ui,
  onFileSelected,
}: {
  className?: string
  cropMode?: ImageCropMode
  imagePath: string | null
  label: string
  ui: PreviewText
  onFileSelected: (file: File) => void
}) {
  const [isDragging, setIsDragging] = useState(false)
  const [pendingCrop, setPendingCrop] = useState<{
    file: File
    mode: Exclude<ImageCropMode, 'none'>
    sourceUrl: string
  } | null>(null)
  const imageUrl = resolveAssetUrl(imagePath)
  const resolvedCropMode = cropMode ?? (className.includes('avatar') ? 'avatar' : 'cover')

  useEffect(() => {
    return () => {
      if (pendingCrop !== null) {
        URL.revokeObjectURL(pendingCrop.sourceUrl)
      }
    }
  }, [pendingCrop])

  const pickFile = (file: File | null | undefined) => {
    if (file !== null && file !== undefined && file.type.startsWith('image/')) {
      if (resolvedCropMode === 'none') {
        onFileSelected(file)
        return
      }

      setPendingCrop({
        file,
        mode: resolvedCropMode,
        sourceUrl: URL.createObjectURL(file),
      })
    }
  }

  return (
    <>
      <div
        className={`sp-cover-field ${className} ${isDragging ? 'dragging' : ''}`}
        onDragLeave={() => setIsDragging(false)}
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDrop={(event) => {
          event.preventDefault()
          setIsDragging(false)
          pickFile(event.dataTransfer.files?.[0])
        }}
      >
        <span>{label}</span>
        <label className="sp-cover-dropzone">
          <input
            accept="image/*"
            type="file"
            onChange={(event) => {
              pickFile(event.target.files?.[0])
              event.currentTarget.value = ''
            }}
          />
          {imageUrl === null ? (
            <div className="sp-cover-placeholder">
              <strong>{ui.dropImageTitle}</strong>
              <small>{ui.dropImageHint}</small>
            </div>
          ) : (
            <>
              <img alt="" src={imageUrl} />
              <div className="sp-cover-overlay">
                <strong>{ui.replaceCoverTitle}</strong>
                <small>{ui.replaceCoverHint}</small>
              </div>
            </>
          )}
        </label>
      </div>
      {pendingCrop !== null && (
        <ImageCropDialog
          file={pendingCrop.file}
          label={label}
          mode={pendingCrop.mode}
          sourceUrl={pendingCrop.sourceUrl}
          ui={ui}
          onCancel={() => setPendingCrop(null)}
          onConfirm={(croppedFile) => {
            setPendingCrop(null)
            onFileSelected(croppedFile)
          }}
        />
      )}
    </>
  )
}
