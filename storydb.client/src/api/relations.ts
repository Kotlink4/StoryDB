import type { RelationGraph, RelationGraphLayout, RelationGraphLayoutDraft } from '../types'
import { apiBaseUrl, apiFetch, ensureOk } from './apiClient'

export const fetchRelationGraph = async (projectId: number) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/relations/graph`)
  await ensureOk(response, 'Failed to load relation graph.')

  return (await response.json()) as RelationGraph
}

export const fetchRelationGraphLayout = async (projectId: number, graphKey?: string | null) => {
  const searchParams = new URLSearchParams()
  if (graphKey !== undefined && graphKey !== null && graphKey.trim().length > 0) {
    searchParams.set('graphKey', graphKey.trim())
  }
  const query = searchParams.toString()
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/relations/layout${query ? `?${query}` : ''}`)
  await ensureOk(response, 'Failed to load relation graph layout.')

  return (await response.json()) as RelationGraphLayout | null
}

export const saveRelationGraphLayoutRequest = async (
  projectId: number,
  draft: RelationGraphLayoutDraft,
) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/relations/layout`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(draft),
  })
  await ensureOk(response, 'Failed to save relation graph layout.')

  return (await response.json()) as RelationGraphLayout
}
