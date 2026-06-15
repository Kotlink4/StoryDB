import { useRef } from 'react'
import { Cropper, ImageRestriction, type CropperRef } from 'react-advanced-cropper'
import 'react-advanced-cropper/dist/style.css'

import type { PreviewText } from '../style-preview/domain/stylePreviewI18n'
import { PreviewDialog } from './StylePreviewPrimitives'
import type { ImageCropMode } from './ImageInputs'

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
  landscape: {
    width: 1200,
    height: 900,
  },
  portrait: {
    width: 900,
    height: 1200,
  },
  square: {
    width: 900,
    height: 900,
  },
}

export type ImageCropDialogProps = {
  file: File
  label: string
  mode: Exclude<ImageCropMode, 'none'>
  sourceUrl: string
  ui: PreviewText
  onCancel: () => void
  onConfirm: (file: File) => void
}

export function ImageCropDialog({
  file,
  label,
  mode,
  sourceUrl,
  ui,
  onCancel,
  onConfirm,
}: ImageCropDialogProps) {
  const aspectRatio = mode === 'avatar' || mode === 'square' ? 1 : mode === 'portrait' ? 3 / 4 : mode === 'landscape' ? 4 / 3 : 16 / 9
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
          className={`sp-crop-stage ${mode}`}
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
