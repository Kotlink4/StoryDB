import { prepareImageForUpload, validatePreparedImageUpload } from '../imageUploadPreparation'
import { apiBaseUrl, apiFetch, assetBaseUrl, ensureOk } from './apiClient'

export const resolveAssetUrl = (path: string | null) =>
  path === null ? null : `${assetBaseUrl}${path}`

export const resolveAssetVariantUrl = (path: string | null, variantKey: 'card' | 'gallery' | 'portrait' | 'thumb') => {
  if (path === null) {
    return null
  }

  const variantPath = path.replace(/\/(card|gallery|portrait|thumb)\.webp$/i, `/${variantKey}.webp`)
  return resolveAssetUrl(variantPath)
}

export const uploadImageRequest = async (file: File, projectId: number | null = null) => {
  const preparedImage = await prepareImageForUpload(file)
  const validationError = validatePreparedImageUpload(preparedImage.file)
  if (validationError !== null) {
    throw new Error(validationError)
  }

  const formData = new FormData()
  formData.append('file', preparedImage.file)

  const uploadUrl = projectId === null ? `${apiBaseUrl}/uploads/images` : `${apiBaseUrl}/uploads/images?projectId=${projectId}`
  const response = await apiFetch(uploadUrl, {
    method: 'POST',
    body: formData,
  })
  await ensureOk(response, 'Failed to upload image.')

  return (await response.json()) as { path: string }
}
