import type {
  Structure,
  StructureAssignment,
  StructureAssignmentDraft,
  StructureDetailsDraft,
  StructureDraft,
  StructureNode,
  StructureNodeDetailsDraft,
  StructureOwnerKind,
  StructureSummary,
  StructureUsage,
  StructureUsageDraft,
} from '../types'
import { apiBaseUrl, apiFetch, ensureOk } from './apiClient'

const toStructurePayload = (draft: StructureDraft) => ({
  name: draft.name.trim(),
  description: draft.description.trim() || null,
  ownerKind: draft.ownerKind,
  ownerId: draft.ownerKind === 'project' ? null : draft.ownerId,
  applicationScope: draft.applicationScope,
  layoutKind: draft.layoutKind,
  nodeBindingMode: 'none',
  catalogSyncMode: 'manual',
  linkedCatalogId: null,
  nodes: draft.nodes.map((node, index) => ({
    clientId: node.clientId.trim() || `node-${index}`,
    parentClientId: node.parentClientId?.trim() || null,
    linkedCatalogEntryId: null,
    linkedCatalogEntryGroupId: null,
    name: node.name.trim(),
    description: node.description.trim() || null,
    nodeType: node.nodeType.trim() || null,
    color: node.color.trim() || null,
    iconKey: node.iconKey.trim() || null,
    levelIndex: node.levelIndex,
    sortOrder: node.sortOrder,
  })),
  edges: draft.edges.map((edge, index) => ({
    sourceClientId: edge.sourceClientId.trim(),
    targetClientId: edge.targetClientId.trim(),
    relationType: edge.relationType.trim(),
    description: edge.description.trim() || null,
    sortOrder: edge.sortOrder >= 0 ? edge.sortOrder : index,
  })),
})

const toStructureUsagePayload = (draft: StructureUsageDraft) => ({
  targetKind: draft.targetKind,
  targetId: draft.targetId,
  displayName: draft.displayName.trim() || null,
  notes: draft.notes.trim() || null,
  isPrimary: draft.isPrimary,
})

const toStructureAssignmentPayload = (draft: StructureAssignmentDraft) => ({
  structureNodeId: draft.structureNodeId,
  storyObjectId: draft.storyObjectId ?? null,
  targetKind: draft.targetKind ?? (draft.storyObjectId === undefined || draft.storyObjectId === null ? null : 'storyObject'),
  targetId: draft.targetId ?? draft.storyObjectId ?? null,
  roleLabel: draft.roleLabel.trim() || null,
  notes: draft.notes.trim() || null,
  sortOrder: draft.sortOrder,
})

export const fetchStructures = async (
  projectId: number,
  ownerKind?: StructureOwnerKind,
  ownerId?: number | null,
) => {
  const searchParams = new URLSearchParams()
  if (ownerKind !== undefined) {
    searchParams.set('ownerKind', ownerKind)
  }
  if (ownerId !== undefined && ownerId !== null) {
    searchParams.set('ownerId', String(ownerId))
  }

  const query = searchParams.toString()
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/structures${query ? `?${query}` : ''}`)
  await ensureOk(response, 'Failed to load structures.')

  return (await response.json()) as StructureSummary[]
}

export const fetchStructure = async (projectId: number, structureId: number) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/structures/${structureId}`)
  await ensureOk(response, 'Failed to load structure.')

  return (await response.json()) as Structure
}

export const createStructureRequest = async (projectId: number, draft: StructureDraft) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/structures`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toStructurePayload(draft)),
  })
  await ensureOk(response, 'Failed to create structure.')

  return (await response.json()) as Structure
}

export const updateStructureRequest = async (projectId: number, structureId: number, draft: StructureDraft) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/structures/${structureId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toStructurePayload(draft)),
  })
  await ensureOk(response, 'Failed to update structure.')

  return (await response.json()) as Structure
}

export const updateStructureDetailsRequest = async (
  projectId: number,
  structureId: number,
  draft: StructureDetailsDraft,
) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/structures/${structureId}/details`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: draft.name,
      description: draft.description,
    }),
  })
  await ensureOk(response, 'Failed to update structure details.')

  return (await response.json()) as Structure
}

export const updateStructureNodeDetailsRequest = async (
  projectId: number,
  structureId: number,
  nodeId: number,
  draft: StructureNodeDetailsDraft,
) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/structures/${structureId}/nodes/${nodeId}/details`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: draft.name,
      description: draft.description,
      nodeType: draft.nodeType,
      color: draft.color,
      iconKey: draft.iconKey,
    }),
  })
  await ensureOk(response, 'Failed to update structure node details.')

  return (await response.json()) as StructureNode
}

export const deleteStructureRequest = async (projectId: number, structureId: number) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/structures/${structureId}`, {
    method: 'DELETE',
  })
  await ensureOk(response, 'Failed to delete structure.')
}

export const fetchStructureUsages = async (
  projectId: number,
  filters: {
    targetKind?: StructureOwnerKind
    targetId?: number | null
    structureId?: number | null
  } = {},
) => {
  const searchParams = new URLSearchParams()
  if (filters.targetKind !== undefined) {
    searchParams.set('targetKind', filters.targetKind)
  }
  if (filters.targetId !== undefined && filters.targetId !== null) {
    searchParams.set('targetId', String(filters.targetId))
  }
  if (filters.structureId !== undefined && filters.structureId !== null) {
    searchParams.set('structureId', String(filters.structureId))
  }

  const query = searchParams.toString()
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/structures/usages${query ? `?${query}` : ''}`)
  await ensureOk(response, 'Failed to load structure usages.')

  return (await response.json()) as StructureUsage[]
}

export const assignStructureRequest = async (projectId: number, structureId: number, draft: StructureUsageDraft) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/structures/${structureId}/usages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toStructureUsagePayload(draft)),
  })
  await ensureOk(response, 'Failed to assign structure.')

  return (await response.json()) as StructureUsage
}

export const updateStructureUsageRequest = async (projectId: number, usageId: number, draft: StructureUsageDraft) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/structures/usages/${usageId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toStructureUsagePayload(draft)),
  })
  await ensureOk(response, 'Failed to update structure usage.')

  return (await response.json()) as StructureUsage
}

export const makeStructureUsageIndividualRequest = async (projectId: number, usageId: number) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/structures/usages/${usageId}/make-individual`, {
    method: 'POST',
  })
  await ensureOk(response, 'Failed to make structure individual.')

  return (await response.json()) as StructureUsage
}

export const deleteStructureUsageRequest = async (projectId: number, usageId: number) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/structures/usages/${usageId}`, {
    method: 'DELETE',
  })
  await ensureOk(response, 'Failed to delete structure usage.')
}

export const fetchStructureAssignments = async (
  projectId: number,
  filters: {
    structureUsageId?: number | null
    structureId?: number | null
    structureNodeId?: number | null
    storyObjectId?: number | null
    targetKind?: 'storyObject' | 'catalogEntry' | null
    targetId?: number | null
  } = {},
) => {
  const searchParams = new URLSearchParams()
  if (filters.structureUsageId !== undefined && filters.structureUsageId !== null) {
    searchParams.set('structureUsageId', String(filters.structureUsageId))
  }
  if (filters.structureId !== undefined && filters.structureId !== null) {
    searchParams.set('structureId', String(filters.structureId))
  }
  if (filters.structureNodeId !== undefined && filters.structureNodeId !== null) {
    searchParams.set('structureNodeId', String(filters.structureNodeId))
  }
  if (filters.storyObjectId !== undefined && filters.storyObjectId !== null) {
    searchParams.set('storyObjectId', String(filters.storyObjectId))
  }
  if (filters.targetKind !== undefined && filters.targetKind !== null) {
    searchParams.set('targetKind', filters.targetKind)
  }
  if (filters.targetId !== undefined && filters.targetId !== null) {
    searchParams.set('targetId', String(filters.targetId))
  }

  const query = searchParams.toString()
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/structures/assignments${query ? `?${query}` : ''}`)
  await ensureOk(response, 'Failed to load structure assignments.')

  return (await response.json()) as StructureAssignment[]
}

export const assignObjectToStructureRequest = async (
  projectId: number,
  usageId: number,
  draft: StructureAssignmentDraft,
) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/structures/usages/${usageId}/assignments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toStructureAssignmentPayload(draft)),
  })
  await ensureOk(response, 'Failed to assign object to structure.')

  return (await response.json()) as StructureAssignment
}

export const updateStructureAssignmentRequest = async (
  projectId: number,
  assignmentId: number,
  draft: StructureAssignmentDraft,
) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/structures/assignments/${assignmentId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toStructureAssignmentPayload(draft)),
  })
  await ensureOk(response, 'Failed to update structure assignment.')

  return (await response.json()) as StructureAssignment
}

export const deleteStructureAssignmentRequest = async (projectId: number, assignmentId: number) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/structures/assignments/${assignmentId}`, {
    method: 'DELETE',
  })
  await ensureOk(response, 'Failed to delete structure assignment.')
}
