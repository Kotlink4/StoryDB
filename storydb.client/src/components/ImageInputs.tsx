import { lazy, Suspense, useEffect, useState } from 'react'

import { resolveAssetUrl } from '../api'
import type { PreviewText } from '../style-preview/domain/stylePreviewI18n'
import type { ValidationIssueMap } from '../validation'
import { FieldError } from './FormValidation'
import { getFieldValidationProps } from './formValidationUtils'

export type ImageCropMode = 'none' | 'avatar' | 'cover' | 'portrait' | 'square' | 'landscape'

const LazyImageCropDialog = lazy(() => import('./ImageCropDialog').then((module) => ({ default: module.ImageCropDialog })))

export function CoverDropzone({
  className = '',
  cropMode,
  imagePath,
  label,
  validationErrorId,
  validationErrors,
  validationField,
  ui,
  onFileSelected,
}: {
  className?: string
  cropMode?: ImageCropMode
  imagePath: string | null
  label: string
  validationErrorId?: string
  validationErrors?: ValidationIssueMap
  validationField?: string
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
  const validationProps =
    validationField === undefined || validationErrorId === undefined
      ? {}
      : getFieldValidationProps(validationField, validationErrors, validationErrorId)

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
            {...validationProps}
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
        {validationField !== undefined && validationErrorId !== undefined && (
          <FieldError id={validationErrorId} message={validationErrors?.[validationField]} />
        )}
      </div>
      {pendingCrop !== null && (
        <Suspense fallback={null}>
          <LazyImageCropDialog
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
        </Suspense>
      )}
    </>
  )
}
