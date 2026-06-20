import type { ObjectTypeKey, StoryProject } from '../types'
import { apiBaseUrl, apiFetch, ensureOk } from './apiClient'

export const fetchProjects = async () => {
  const response = await apiFetch(`${apiBaseUrl}/projects`)
  await ensureOk(response, 'Failed to load projects.')

  return (await response.json()) as StoryProject[]
}

export const createProjectRequest = async (
  name: string,
  coverImagePath: string | null,
  enabledObjectTypeKeys: ObjectTypeKey[],
  presetKeys: string[],
  templatePackIds: number[] = [],
  visibility: StoryProject['visibility'] = 'private',
) => {
  const response = await apiFetch(`${apiBaseUrl}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, coverImagePath, enabledObjectTypeKeys, presetKeys, templatePackIds, visibility }),
  })
  await ensureOk(response, 'Failed to create project.')

  return (await response.json()) as StoryProject
}

export const updateProjectRequest = async (
  project: StoryProject,
  name: string,
  coverImagePath: string | null,
  enabledObjectTypeKeys: ObjectTypeKey[],
  presetKeys: string[],
  templatePackIds: number[] = [],
  visibility: StoryProject['visibility'] = 'private',
) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${project.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, coverImagePath, enabledObjectTypeKeys, presetKeys, templatePackIds, visibility }),
  })
  await ensureOk(response, 'Failed to update project.')

  return (await response.json()) as StoryProject
}

export const deleteProjectRequest = async (projectId: number) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}`, {
    method: 'DELETE',
  })
  await ensureOk(response, 'Failed to delete project.')
}
