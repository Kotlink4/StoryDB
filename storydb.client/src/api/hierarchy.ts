import type { HierarchyGroup, HierarchyNode } from '../types'
import { apiBaseUrl, apiFetch, ensureOk } from './apiClient'

export const fetchHierarchyGroups = async (projectId: number) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/hierarchies/groups`)
  await ensureOk(response, 'Failed to load hierarchy groups.')

  return (await response.json()) as HierarchyGroup[]
}

export const createHierarchyGroupRequest = async (projectId: number, name: string) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/hierarchies/groups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  await ensureOk(response, 'Failed to create hierarchy group.')

  return (await response.json()) as HierarchyGroup
}

export const updateHierarchyGroupRequest = async (projectId: number, groupId: number, name: string) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/hierarchies/groups/${groupId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  await ensureOk(response, 'Failed to update hierarchy group.')

  return (await response.json()) as HierarchyGroup
}

export const deleteHierarchyGroupRequest = async (projectId: number, groupId: number) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/hierarchies/groups/${groupId}`, {
    method: 'DELETE',
  })
  await ensureOk(response, 'Failed to delete hierarchy group.')
}

export const fetchHierarchyNodes = async (projectId: number, groupId: number) => {
  const response = await apiFetch(
    `${apiBaseUrl}/projects/${projectId}/hierarchies/groups/${groupId}/nodes`,
  )
  await ensureOk(response, 'Failed to load hierarchy nodes.')

  return (await response.json()) as HierarchyNode[]
}

export const createHierarchyNodeRequest = async (
  projectId: number,
  groupId: number,
  name: string,
  description: string,
  parentNodeIds: number[],
) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/hierarchies/groups/${groupId}/nodes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description: description.trim() || null, parentNodeIds }),
  })
  await ensureOk(response, 'Failed to create hierarchy node.')

  return (await response.json()) as HierarchyNode
}

export const updateHierarchyNodeRequest = async (
  projectId: number,
  groupId: number,
  nodeId: number,
  name: string,
  description: string,
  parentNodeIds: number[],
) => {
  const response = await apiFetch(
    `${apiBaseUrl}/projects/${projectId}/hierarchies/groups/${groupId}/nodes/${nodeId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description: description.trim() || null, parentNodeIds }),
    },
  )
  await ensureOk(response, 'Failed to update hierarchy node.')

  return (await response.json()) as HierarchyNode
}

export const deleteHierarchyNodeRequest = async (projectId: number, groupId: number, nodeId: number) => {
  const response = await apiFetch(
    `${apiBaseUrl}/projects/${projectId}/hierarchies/groups/${groupId}/nodes/${nodeId}`,
    { method: 'DELETE' },
  )
  await ensureOk(response, 'Failed to delete hierarchy node.')
}
