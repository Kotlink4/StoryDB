import { useEffect, type Dispatch, type SetStateAction } from 'react'

import type { CatalogEntry, ObjectTypeKey, StoryObject } from '../../types'
import { writeProjectClientCachePatch } from '../domain/projectClientCache'
import { loadTextLinkTargetsData } from './workspaceDataLoaders'

export const emptyObjectsByType: Record<ObjectTypeKey, StoryObject[]> = {
  characters: [],
  items: [],
  places: [],
  organizations: [],
  hierarchy: [],
}

export function useStylePreviewTextLinkTargetsData({
  selectedProjectId,
  setCatalogEntriesByCatalogId,
  setObjectsByType,
}: {
  selectedProjectId: number | null
  setCatalogEntriesByCatalogId: Dispatch<SetStateAction<Record<number, CatalogEntry[]>>>
  setObjectsByType: Dispatch<SetStateAction<Record<ObjectTypeKey, StoryObject[]>>>
}) {
  useEffect(() => {
    let isActive = true

    if (selectedProjectId === null) {
      setObjectsByType(emptyObjectsByType)
      setCatalogEntriesByCatalogId({})
      return undefined
    }

    const loadTextLinkTargets = async () => {
      const projectId = selectedProjectId
      const loadedTargets = await loadTextLinkTargetsData(projectId)

      if (!isActive) {
        return
      }

      setObjectsByType((currentObjectsByType) => ({
        ...currentObjectsByType,
        ...loadedTargets.objectsByTypePatch,
      }))
      void writeProjectClientCachePatch(projectId, {
        objectsByType: loadedTargets.objectsByTypePatch,
        ...(loadedTargets.catalogs !== null ? { catalogs: loadedTargets.catalogs } : {}),
      })

      if (loadedTargets.catalogs === null) {
        return
      }

      setCatalogEntriesByCatalogId((currentEntriesByCatalogId) => ({
        ...currentEntriesByCatalogId,
        ...loadedTargets.catalogEntriesByCatalogId,
      }))
      void writeProjectClientCachePatch(projectId, {
        catalogEntriesByCatalogId: loadedTargets.catalogEntriesByCatalogId,
      })
    }

    void loadTextLinkTargets()

    return () => {
      isActive = false
    }
  }, [selectedProjectId, setCatalogEntriesByCatalogId, setObjectsByType])
}
