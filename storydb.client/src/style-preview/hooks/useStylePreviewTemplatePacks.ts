import { useCallback, useEffect, useState } from 'react'

import {
  createTemplatePackFromProjectRequest,
  deleteTemplatePackRequest,
  fetchTemplatePacks,
  setTemplatePackFavoriteRequest,
  updateTemplatePackRequest,
} from '../../api'
import type { AuthUser, StoryProject, TemplatePack, TemplatePackScope } from '../../types'

export function useStylePreviewTemplatePacks({
  currentUser,
  projects,
  selectedProjectId,
  messages,
  showErrorMessage,
}: {
  currentUser: AuthUser | null
  projects: StoryProject[]
  selectedProjectId: number | null
  messages: {
    apiUnavailable: string
    projectDeleteFailed: string
    projectSaveFailed: string
  }
  showErrorMessage: (message: string) => void
}) {
  const [templatePackScope, setTemplatePackScope] = useState<TemplatePackScope>('mine')
  const [templatePacks, setTemplatePacks] = useState<TemplatePack[]>([])
  const [favoriteTemplatePacks, setFavoriteTemplatePacks] = useState<TemplatePack[]>([])
  const [templatePackProjectId, setTemplatePackProjectId] = useState<number | null>(null)
  const [templatePackName, setTemplatePackName] = useState('')
  const [templatePackDescription, setTemplatePackDescription] = useState('')
  const [templatePackIsPublic, setTemplatePackIsPublic] = useState(false)
  const [isTemplatePackSaving, setIsTemplatePackSaving] = useState(false)

  const loadTemplatePacks = useCallback(
    async (scope: TemplatePackScope = templatePackScope) => {
      if (currentUser === null) {
        setTemplatePacks([])
        setFavoriteTemplatePacks([])
        return
      }

      try {
        const [scopedPacks, favoritePacks] = await Promise.all([
          fetchTemplatePacks(scope),
          fetchTemplatePacks('favorites'),
        ])
        setTemplatePacks(scopedPacks)
        setFavoriteTemplatePacks(favoritePacks)
      } catch {
        showErrorMessage(messages.apiUnavailable)
      }
    },
    [currentUser, messages.apiUnavailable, showErrorMessage, templatePackScope],
  )

  useEffect(() => {
    void loadTemplatePacks(templatePackScope)
  }, [loadTemplatePacks, templatePackScope])

  useEffect(() => {
    if (templatePackProjectId === null && projects.length > 0) {
      setTemplatePackProjectId(selectedProjectId ?? projects[0].id)
    }
  }, [projects, selectedProjectId, templatePackProjectId])

  const upsertTemplatePack = useCallback((pack: TemplatePack) => {
    setTemplatePacks((currentPacks) =>
      currentPacks.some((currentPack) => currentPack.id === pack.id)
        ? currentPacks.map((currentPack) => (currentPack.id === pack.id ? pack : currentPack))
        : [pack, ...currentPacks],
    )
    setFavoriteTemplatePacks((currentPacks) => {
      if (!pack.isFavorite) {
        return currentPacks.filter((currentPack) => currentPack.id !== pack.id)
      }

      return currentPacks.some((currentPack) => currentPack.id === pack.id)
        ? currentPacks.map((currentPack) => (currentPack.id === pack.id ? pack : currentPack))
        : [pack, ...currentPacks]
    })
  }, [])

  const createTemplatePack = useCallback(async () => {
    if (templatePackProjectId === null || templatePackName.trim().length === 0) {
      return
    }

    setIsTemplatePackSaving(true)
    try {
      const pack = await createTemplatePackFromProjectRequest(
        templatePackProjectId,
        templatePackName,
        templatePackDescription,
        templatePackIsPublic,
      )
      upsertTemplatePack(pack)
      setTemplatePackName('')
      setTemplatePackDescription('')
      setTemplatePackIsPublic(false)
    } catch {
      showErrorMessage(messages.projectSaveFailed)
    } finally {
      setIsTemplatePackSaving(false)
    }
  }, [
    messages.projectSaveFailed,
    showErrorMessage,
    templatePackDescription,
    templatePackIsPublic,
    templatePackName,
    templatePackProjectId,
    upsertTemplatePack,
  ])

  const toggleTemplatePackPublic = useCallback(
    async (pack: TemplatePack, isPublic: boolean) => {
      try {
        upsertTemplatePack(await updateTemplatePackRequest(pack.id, pack.name, pack.description ?? '', isPublic))
      } catch {
        showErrorMessage(messages.projectSaveFailed)
      }
    },
    [messages.projectSaveFailed, showErrorMessage, upsertTemplatePack],
  )

  const toggleTemplatePackFavorite = useCallback(
    async (pack: TemplatePack, isFavorite: boolean) => {
      try {
        upsertTemplatePack(await setTemplatePackFavoriteRequest(pack.id, isFavorite))
      } catch {
        showErrorMessage(messages.projectSaveFailed)
      }
    },
    [messages.projectSaveFailed, showErrorMessage, upsertTemplatePack],
  )

  const deleteTemplatePack = useCallback(
    async (pack: TemplatePack) => {
      try {
        await deleteTemplatePackRequest(pack.id)
        setTemplatePacks((currentPacks) => currentPacks.filter((currentPack) => currentPack.id !== pack.id))
        setFavoriteTemplatePacks((currentPacks) => currentPacks.filter((currentPack) => currentPack.id !== pack.id))
      } catch {
        showErrorMessage(messages.projectDeleteFailed)
      }
    },
    [messages.projectDeleteFailed, showErrorMessage],
  )

  return {
    favoriteTemplatePacks,
    isTemplatePackSaving,
    templatePackDescription,
    templatePackIsPublic,
    templatePackName,
    templatePackProjectId,
    templatePackScope,
    templatePacks,
    createTemplatePack,
    deleteTemplatePack,
    setTemplatePackDescription,
    setTemplatePackIsPublic,
    setTemplatePackName,
    setTemplatePackProjectId,
    setTemplatePackScope,
    toggleTemplatePackFavorite,
    toggleTemplatePackPublic,
  }
}
