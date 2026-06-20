import type { TemplatePack, TemplatePackScope } from '../types'
import { apiBaseUrl, apiFetch, ensureOk } from './apiClient'

export const fetchTemplatePacks = async (scope: TemplatePackScope) => {
  const response = await apiFetch(`${apiBaseUrl}/template-packs?scope=${scope}`)
  await ensureOk(response, 'Failed to load template packs.')

  return (await response.json()) as TemplatePack[]
}

export const createTemplatePackFromProjectRequest = async (
  projectId: number,
  name: string,
  description: string,
  isPublic: boolean,
) => {
  const response = await apiFetch(`${apiBaseUrl}/template-packs/from-project`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId,
      name: name.trim(),
      description: description.trim() || null,
      isPublic,
      options: {
        includeAttributes: true,
        includeCatalogs: true,
        includeStructures: true,
      },
    }),
  })
  await ensureOk(response, 'Failed to create template pack.')

  return (await response.json()) as TemplatePack
}

export const updateTemplatePackRequest = async (
  templatePackId: number,
  name: string,
  description: string,
  isPublic: boolean,
) => {
  const response = await apiFetch(`${apiBaseUrl}/template-packs/${templatePackId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: name.trim(),
      description: description.trim() || null,
      isPublic,
    }),
  })
  await ensureOk(response, 'Failed to update template pack.')

  return (await response.json()) as TemplatePack
}

export const deleteTemplatePackRequest = async (templatePackId: number) => {
  const response = await apiFetch(`${apiBaseUrl}/template-packs/${templatePackId}`, {
    method: 'DELETE',
  })
  await ensureOk(response, 'Failed to delete template pack.')
}

export const setTemplatePackFavoriteRequest = async (templatePackId: number, isFavorite: boolean) => {
  const response = await apiFetch(`${apiBaseUrl}/template-packs/${templatePackId}/favorite`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isFavorite }),
  })
  await ensureOk(response, 'Failed to update template pack favorite.')

  return (await response.json()) as TemplatePack
}

export const applyTemplatePackRequest = async (projectId: number, templatePackId: number) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/template-packs/${templatePackId}/apply`, {
    method: 'POST',
  })
  await ensureOk(response, 'Failed to apply template pack.')
}
