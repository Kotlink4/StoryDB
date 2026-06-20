import type {
  Catalog,
  CatalogEntry,
  CatalogEntryDraft,
  CatalogEntryGroup,
  CatalogFieldDefinition,
  CatalogFieldDraft,
  CatalogHierarchyMode,
} from '../types'
import { apiBaseUrl, apiFetch, ensureOk } from './apiClient'

export const fetchCatalogs = async (projectId: number) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/catalogs`)
  await ensureOk(response, 'Failed to load catalogs.')

  return (await response.json()) as Catalog[]
}

export const createCatalogRequest = async (
  projectId: number,
  name: string,
  description: string,
  supportsHierarchy: boolean,
  hierarchyMode: CatalogHierarchyMode = 'entries',
) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/catalogs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      description: description.trim() || null,
      supportsHierarchy,
      hierarchyMode,
    }),
  })
  await ensureOk(response, 'Failed to create catalog.')

  return (await response.json()) as Catalog
}

export const updateCatalogRequest = async (
  projectId: number,
  catalogId: number,
  name: string,
  description: string,
  supportsHierarchy: boolean,
  hierarchyMode: CatalogHierarchyMode = 'entries',
) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/catalogs/${catalogId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      description: description.trim() || null,
      supportsHierarchy,
      hierarchyMode,
    }),
  })
  await ensureOk(response, 'Failed to update catalog.')

  return (await response.json()) as Catalog
}

export const deleteCatalogRequest = async (projectId: number, catalogId: number) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/catalogs/${catalogId}`, {
    method: 'DELETE',
  })
  await ensureOk(response, 'Failed to delete catalog.')
}

export const fetchCatalogEntries = async (projectId: number, catalogId: number) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/catalogs/${catalogId}/entries`)
  await ensureOk(response, 'Failed to load catalog entries.')

  return (await response.json()) as CatalogEntry[]
}

export const fetchCatalogEntryGroups = async (projectId: number, catalogId: number) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/catalogs/${catalogId}/entry-groups`)
  await ensureOk(response, 'Failed to load catalog entry groups.')

  return (await response.json()) as CatalogEntryGroup[]
}

export const createCatalogEntryGroupRequest = async (
  projectId: number,
  catalogId: number,
  name: string,
  parentGroupIds: number[] = [],
) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/catalogs/${catalogId}/entry-groups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, parentGroupIds }),
  })
  await ensureOk(response, 'Failed to create catalog entry group.')

  return (await response.json()) as CatalogEntryGroup
}

export const updateCatalogEntryGroupRequest = async (
  projectId: number,
  catalogId: number,
  groupId: number,
  name: string,
  parentGroupIds: number[] = [],
) => {
  const response = await apiFetch(
    `${apiBaseUrl}/projects/${projectId}/catalogs/${catalogId}/entry-groups/${groupId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, parentGroupIds }),
    },
  )
  await ensureOk(response, 'Failed to update catalog entry group.')

  return (await response.json()) as CatalogEntryGroup
}

export const deleteCatalogEntryGroupRequest = async (projectId: number, catalogId: number, groupId: number) => {
  const response = await apiFetch(
    `${apiBaseUrl}/projects/${projectId}/catalogs/${catalogId}/entry-groups/${groupId}`,
    { method: 'DELETE' },
  )
  await ensureOk(response, 'Failed to delete catalog entry group.')
}

export const createCatalogEntryRequest = async (
  projectId: number,
  catalogId: number,
  draft: CatalogEntryDraft,
  fieldDefinitions: CatalogFieldDefinition[],
) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/catalogs/${catalogId}/entries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: draft.name,
      description: draft.description.trim() || null,
      imagePath: draft.imagePath,
      entryGroupId: draft.entryGroupId === '' ? null : Number(draft.entryGroupId),
      parentEntryIds: draft.parentEntryIds,
      fieldValues: toCatalogEntryFieldValueRequests(draft, fieldDefinitions),
    }),
  })
  await ensureOk(response, 'Failed to create catalog entry.')

  return (await response.json()) as CatalogEntry
}

export const updateCatalogEntryRequest = async (
  projectId: number,
  catalogId: number,
  entryId: number,
  draft: CatalogEntryDraft,
  fieldDefinitions: CatalogFieldDefinition[],
) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/catalogs/${catalogId}/entries/${entryId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: draft.name,
      description: draft.description.trim() || null,
      imagePath: draft.imagePath,
      entryGroupId: draft.entryGroupId === '' ? null : Number(draft.entryGroupId),
      parentEntryIds: draft.parentEntryIds,
      fieldValues: toCatalogEntryFieldValueRequests(draft, fieldDefinitions),
    }),
  })
  await ensureOk(response, 'Failed to update catalog entry.')

  return (await response.json()) as CatalogEntry
}

export const deleteCatalogEntryRequest = async (projectId: number, catalogId: number, entryId: number) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/catalogs/${catalogId}/entries/${entryId}`, {
    method: 'DELETE',
  })
  await ensureOk(response, 'Failed to delete catalog entry.')
}

export const fetchCatalogFieldDefinitions = async (projectId: number, catalogId: number) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/catalogs/${catalogId}/fields`)
  await ensureOk(response, 'Failed to load catalog fields.')

  return (await response.json()) as CatalogFieldDefinition[]
}

export const createCatalogFieldDefinitionRequest = async (
  projectId: number,
  catalogId: number,
  draft: CatalogFieldDraft,
) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/catalogs/${catalogId}/fields`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toCatalogFieldDefinitionPayload(draft)),
  })
  await ensureOk(response, 'Failed to create catalog field.')

  return (await response.json()) as CatalogFieldDefinition
}

export const updateCatalogFieldDefinitionRequest = async (
  projectId: number,
  catalogId: number,
  fieldId: number,
  draft: CatalogFieldDraft,
) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/catalogs/${catalogId}/fields/${fieldId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toCatalogFieldDefinitionPayload(draft)),
  })
  await ensureOk(response, 'Failed to update catalog field.')

  return (await response.json()) as CatalogFieldDefinition
}

export const deleteCatalogFieldDefinitionRequest = async (projectId: number, catalogId: number, fieldId: number) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/catalogs/${catalogId}/fields/${fieldId}`, {
    method: 'DELETE',
  })
  await ensureOk(response, 'Failed to delete catalog field.')
}

const toCatalogFieldDefinitionPayload = (draft: CatalogFieldDraft) => ({
  name: draft.name,
  dataType: draft.dataType,
  isRequired: draft.isRequired,
  fieldGroupId: null,
  minValue: draft.dataType === 'number' && draft.minValue.trim() !== '' ? Number(draft.minValue) : null,
  maxValue: draft.dataType === 'number' && draft.maxValue.trim() !== '' ? Number(draft.maxValue) : null,
  options:
    draft.dataType === 'select'
      ? draft.optionsText
          .split(',')
          .map((option) => option.trim())
          .filter((option) => option.length > 0)
      : [],
  referenceCatalogId:
    (draft.dataType === 'entryReference' || draft.dataType === 'multipleEntryReference') &&
    draft.referenceCatalogId !== ''
      ? Number(draft.referenceCatalogId)
      : null,
})

const toCatalogEntryFieldValueRequests = (
  draft: CatalogEntryDraft,
  fieldDefinitions: CatalogFieldDefinition[],
) =>
  Object.entries(draft.fieldValues)
    .map(([fieldDefinitionId, value]) => {
      const definition = fieldDefinitions.find((field) => field.id === Number(fieldDefinitionId))
      const isReference =
        definition?.dataType === 'entryReference' || definition?.dataType === 'multipleEntryReference'
      const referencedEntryIds = isReference
        ? value
            .split(',')
            .map((entryId) => Number(entryId))
            .filter((entryId) => Number.isInteger(entryId) && entryId > 0)
        : []

      return {
        fieldDefinitionId: Number(fieldDefinitionId),
        value: isReference ? null : value.trim() || null,
        referencedEntryIds,
      }
    })
    .filter(
      (fieldValue) =>
        fieldValue.value !== null || fieldValue.referencedEntryIds.length > 0,
    )
