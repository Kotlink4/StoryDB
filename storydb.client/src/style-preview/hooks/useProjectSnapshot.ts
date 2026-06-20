import { useCallback, useEffect, useState } from 'react'

import {
  ApiRequestError,
  fetchProjectSnapshotRequest,
  getApiErrorMessage,
  publishProjectSnapshotRequest,
  rebuildProjectSnapshotRequest,
} from '../../api'
import type { ProjectSnapshot } from '../../types'

export function useProjectSnapshot(
  projectId: number | null,
  fallbackErrorMessage: string,
  scope: ProjectSnapshot['scope'] = 'current',
) {
  const [snapshot, setSnapshot] = useState<ProjectSnapshot | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadSnapshot = useCallback(async () => {
    if (projectId === null) {
      setSnapshot(null)
      setError(null)
      return
    }

    setIsLoading(true)
    try {
      setSnapshot(await fetchProjectSnapshotRequest(projectId, scope))
      setError(null)
    } catch (loadError) {
      if (loadError instanceof ApiRequestError && loadError.status === 404) {
        setSnapshot(null)
        setError(null)
        return
      }

      setError(getApiErrorMessage(loadError, fallbackErrorMessage))
    } finally {
      setIsLoading(false)
    }
  }, [fallbackErrorMessage, projectId, scope])

  const publishSnapshot = useCallback(async () => {
    if (projectId === null) {
      return null
    }

    setIsPublishing(true)
    try {
      const nextSnapshot = await publishProjectSnapshotRequest(projectId)
      setSnapshot(nextSnapshot)
      setError(null)
      return nextSnapshot
    } catch (publishError) {
      setError(getApiErrorMessage(publishError, fallbackErrorMessage))
      return null
    } finally {
      setIsPublishing(false)
    }
  }, [fallbackErrorMessage, projectId])

  const rebuildSnapshot = useCallback(async (sections: string[] = []) => {
    if (projectId === null) {
      return null
    }

    setIsPublishing(true)
    try {
      const nextSnapshot = await rebuildProjectSnapshotRequest(projectId, sections)
      setSnapshot(nextSnapshot)
      setError(null)
      return nextSnapshot
    } catch (rebuildError) {
      setError(getApiErrorMessage(rebuildError, fallbackErrorMessage))
      return null
    } finally {
      setIsPublishing(false)
    }
  }, [fallbackErrorMessage, projectId])

  useEffect(() => {
    void loadSnapshot()
  }, [loadSnapshot])

  return {
    error,
    isLoading,
    isPublishing,
    loadSnapshot,
    publishSnapshot,
    rebuildSnapshot,
    snapshot,
  }
}
