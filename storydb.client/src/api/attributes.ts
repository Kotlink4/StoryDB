import type { AttributeDefinition, AttributeDefinitionDraft, AttributeGroup, ObjectTypeKey } from '../types'
import { apiBaseUrl, apiFetch, ensureOk } from './apiClient'

const toAttributeDefinitionPayload = (
  typeKey: ObjectTypeKey,
  draft: AttributeDefinitionDraft,
) => ({
  typeKey,
  name: draft.name.trim(),
  dataType: draft.dataType,
  groupName: draft.groupName.trim() || null,
  iconKey: draft.iconKey?.trim() || null,
  minValue: draft.minValue.trim().length === 0 ? null : Number(draft.minValue),
  maxValue: draft.maxValue.trim().length === 0 ? null : Number(draft.maxValue),
  unit: draft.unit.trim() || null,
  options: draft.optionsText
    .split(',')
    .map((option) => option.trim())
    .filter((option) => option.length > 0),
})

export const fetchAttributeGroups = async (projectId: number, typeKey: ObjectTypeKey) => {
  const response = await apiFetch(
    `${apiBaseUrl}/projects/${projectId}/attribute-definitions/groups?typeKey=${typeKey}`,
  )
  await ensureOk(response, 'Failed to load attribute groups.')

  return (await response.json()) as AttributeGroup[]
}

export const createAttributeGroupRequest = async (
  projectId: number,
  typeKey: ObjectTypeKey,
  name: string,
  iconKey: string | null = null,
) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/attribute-definitions/groups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ typeKey, name, iconKey }),
  })
  await ensureOk(response, 'Failed to create attribute group.')

  return (await response.json()) as AttributeGroup
}

export const updateAttributeGroupRequest = async (
  projectId: number,
  typeKey: ObjectTypeKey,
  groupId: number,
  name: string,
  iconKey: string | null = null,
) => {
  const response = await apiFetch(
    `${apiBaseUrl}/projects/${projectId}/attribute-definitions/groups/${groupId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ typeKey, name, iconKey }),
    },
  )
  await ensureOk(response, 'Failed to update attribute group.')

  return (await response.json()) as AttributeGroup
}

export const deleteAttributeGroupRequest = async (projectId: number, groupId: number) => {
  const response = await apiFetch(
    `${apiBaseUrl}/projects/${projectId}/attribute-definitions/groups/${groupId}`,
    { method: 'DELETE' },
  )
  await ensureOk(response, 'Failed to delete attribute group.')
}

export const fetchAttributeDefinitions = async (projectId: number, typeKey: ObjectTypeKey) => {
  const response = await apiFetch(
    `${apiBaseUrl}/projects/${projectId}/attribute-definitions?typeKey=${typeKey}`,
  )
  await ensureOk(response, 'Failed to load attribute definitions.')

  return (await response.json()) as AttributeDefinition[]
}

export const createAttributeDefinitionRequest = async (
  projectId: number,
  typeKey: ObjectTypeKey,
  draft: AttributeDefinitionDraft,
) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/attribute-definitions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toAttributeDefinitionPayload(typeKey, draft)),
  })
  await ensureOk(response, 'Failed to create attribute definition.')

  return (await response.json()) as AttributeDefinition
}

export const updateAttributeDefinitionRequest = async (
  projectId: number,
  typeKey: ObjectTypeKey,
  definitionId: number,
  draft: AttributeDefinitionDraft,
) => {
  const response = await apiFetch(
    `${apiBaseUrl}/projects/${projectId}/attribute-definitions/${definitionId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toAttributeDefinitionPayload(typeKey, draft)),
    },
  )
  await ensureOk(response, 'Failed to update attribute definition.')

  return (await response.json()) as AttributeDefinition
}

export const deleteAttributeDefinitionRequest = async (projectId: number, definitionId: number) => {
  const response = await apiFetch(
    `${apiBaseUrl}/projects/${projectId}/attribute-definitions/${definitionId}`,
    { method: 'DELETE' },
  )
  await ensureOk(response, 'Failed to delete attribute definition.')
}
