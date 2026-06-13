import { ImagePlus } from 'lucide-react'
import { resolveAssetUrl, uploadImageRequest } from '../api'

type ImageDropzoneProps = {
  imagePath: string | null
  label: string
  placeholder: string
  projectId?: number | null
  onChange: (imagePath: string | null) => void
  onError: () => void
}

export function ImageDropzone({
  imagePath,
  label,
  placeholder,
  projectId = null,
  onChange,
  onError,
}: ImageDropzoneProps) {
  const imageUrl = resolveAssetUrl(imagePath)

  const uploadFile = async (file: File | undefined) => {
    if (file === undefined || !file.type.startsWith('image/')) {
      return
    }

    try {
      const uploadedImage = await uploadImageRequest(file, projectId)
      onChange(uploadedImage.path)
    } catch {
      onError()
    }
  }

  return (
    <label
      className={imageUrl === null ? 'image-dropzone' : 'image-dropzone has-image'}
      onDragOver={(event) => {
        event.preventDefault()
      }}
      onDrop={(event) => {
        event.preventDefault()
        void uploadFile(event.dataTransfer.files[0])
      }}
    >
      <span className="setting-label">{label}</span>
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={(event) => void uploadFile(event.target.files?.[0])}
      />
      {imageUrl === null ? (
        <span className="image-dropzone-empty">
          <ImagePlus size={22} strokeWidth={2.2} />
          {placeholder}
        </span>
      ) : (
        <img src={imageUrl} alt="" />
      )}
    </label>
  )
}
