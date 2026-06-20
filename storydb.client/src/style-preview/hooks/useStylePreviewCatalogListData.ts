import { useEffect, type Dispatch, type SetStateAction } from 'react'

import { fetchCatalogs } from '../../api'
import type { Catalog } from '../../types'
import { writeProjectClientCachePatch } from '../domain/projectClientCache'

export function useStylePreviewCatalogListData({
  projectsCatalogsLoadFailedMessage,
  selectedProjectId,
  setCatalogs,
  setSelectedCatalogId,
  showErrorMessage,
}: {
  projectsCatalogsLoadFailedMessage: string
  selectedProjectId: number | null
  setCatalogs: Dispatch<SetStateAction<Catalog[]>>
  setSelectedCatalogId: Dispatch<SetStateAction<number | null>>
  showErrorMessage: (message: string) => void
}) {
  useEffect(() => {
    let isActive = true

    if (selectedProjectId === null) {
      setCatalogs([])
      return undefined
    }

    fetchCatalogs(selectedProjectId)
      .then((loadedCatalogs) => {
        if (!isActive) {
          return
        }

        setCatalogs(loadedCatalogs)
        void writeProjectClientCachePatch(selectedProjectId, { catalogs: loadedCatalogs })
        setSelectedCatalogId((currentId) =>
          currentId !== null && loadedCatalogs.some((catalog) => catalog.id === currentId)
            ? currentId
            : currentId,
        )
      })
      .catch(() => {
        if (isActive) {
          showErrorMessage(projectsCatalogsLoadFailedMessage)
        }
      })

    return () => {
      isActive = false
    }
  }, [
    projectsCatalogsLoadFailedMessage,
    selectedProjectId,
    setCatalogs,
    setSelectedCatalogId,
    showErrorMessage,
  ])
}
