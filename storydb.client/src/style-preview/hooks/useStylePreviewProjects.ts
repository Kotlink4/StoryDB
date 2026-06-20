import { useCallback, useEffect, useState } from 'react'

import {
  fetchCurrentUser,
  fetchProjects,
} from '../../api'
import type {
  AuthUser,
  StoryProject,
} from '../../types'

type UseStylePreviewProjectsOptions = {
  initialSelectedProjectId?: number | null
  routeProjectId: number | null
  onLoadFailed: () => void
}

const projectLoadRetryDelays = [300, 900, 1800]

const wait = (delayMs: number) => new Promise((resolve) => window.setTimeout(resolve, delayMs))

export function useStylePreviewProjects({
  initialSelectedProjectId,
  routeProjectId,
  onLoadFailed,
}: UseStylePreviewProjectsOptions) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [projects, setProjects] = useState<StoryProject[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    routeProjectId ?? initialSelectedProjectId ?? null,
  )
  const [isLoadingProjects, setIsLoadingProjects] = useState(true)

  const loadProjects = useCallback(async () => {
    const user = await fetchCurrentUser()
    setCurrentUser(user)
    if (user === null) {
      setProjects([])
      setSelectedProjectId(routeProjectId)
      return
    }

    const loadedProjects = await fetchProjects()
    setProjects(loadedProjects)
    setSelectedProjectId((currentId) =>
      routeProjectId !== null && loadedProjects.some((project) => project.id === routeProjectId)
        ? routeProjectId
        : currentId !== null && loadedProjects.some((project) => project.id === currentId)
          ? currentId
          : initialSelectedProjectId !== undefined &&
              loadedProjects.some((project) => project.id === initialSelectedProjectId)
            ? initialSelectedProjectId
            : loadedProjects[0]?.id ?? null,
    )
  }, [initialSelectedProjectId, routeProjectId])

  useEffect(() => {
    let isActive = true

    const loadProjectsWithRetry = async () => {
      let lastError: unknown = null

      for (let attempt = 0; attempt <= projectLoadRetryDelays.length; attempt += 1) {
        try {
          await loadProjects()
          return
        } catch (error) {
          lastError = error
          if (!isActive || attempt === projectLoadRetryDelays.length) {
            break
          }

          await wait(projectLoadRetryDelays[attempt])
        }
      }

      throw lastError
    }

    void Promise.resolve()
      .then(loadProjectsWithRetry)
      .catch(() => {
        if (isActive) {
          onLoadFailed()
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingProjects(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [loadProjects, onLoadFailed])

  return {
    currentUser,
    isLoadingProjects,
    loadProjects,
    projects,
    selectedProjectId,
    setCurrentUser,
    setProjects,
    setSelectedProjectId,
  }
}
