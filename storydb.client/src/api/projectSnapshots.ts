import type { ProjectSnapshot } from '../types'
import { apiBaseUrl, apiFetch, ensureOk } from './apiClient'

export const fetchProjectSnapshotRequest = async (projectId: number, scope: ProjectSnapshot['scope'] = 'current') => {
  const searchParams = new URLSearchParams({ scope })
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/snapshot?${searchParams.toString()}`)
  await ensureOk(response, 'Failed to load project snapshot.')

  return (await response.json()) as ProjectSnapshot
}

export const publishProjectSnapshotRequest = async (projectId: number) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/snapshot/publish`, {
    method: 'POST',
  })
  await ensureOk(response, 'Failed to publish project snapshot.')

  return (await response.json()) as ProjectSnapshot
}

export const rebuildProjectSnapshotRequest = async (projectId: number, sections: string[] = []) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/snapshot/rebuild`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sections }),
  })
  await ensureOk(response, 'Failed to rebuild project snapshot.')

  return (await response.json()) as ProjectSnapshot
}

export const publishPublishedProjectSnapshotRequest = async (projectId: number) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/snapshot/publish-public`, {
    method: 'POST',
  })
  await ensureOk(response, 'Failed to publish public project snapshot.')

  return (await response.json()) as ProjectSnapshot
}
