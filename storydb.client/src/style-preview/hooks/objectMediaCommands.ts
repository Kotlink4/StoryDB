import {
  addObjectGalleryImageRequest,
  deleteObjectGalleryImageRequest,
  uploadImageRequest,
} from '../../api'
import type { StoryObject } from '../../types'

export async function uploadObjectMediaPath(file: File, projectId: number | null) {
  const result = await uploadImageRequest(file, projectId)
  return result.path
}

export function addObjectGalleryImage(
  projectId: number,
  objectId: number,
  imagePath: string,
  caption: string,
): Promise<StoryObject> {
  return addObjectGalleryImageRequest(projectId, objectId, imagePath, caption)
}

export function addObjectCoverToGallery(
  projectId: number,
  objectId: number,
  imagePath: string,
): Promise<StoryObject> {
  return addObjectGalleryImage(projectId, objectId, imagePath, '')
}

export function deleteObjectGalleryImage(
  projectId: number,
  objectId: number,
  imageId: number,
): Promise<StoryObject> {
  return deleteObjectGalleryImageRequest(projectId, objectId, imageId)
}
