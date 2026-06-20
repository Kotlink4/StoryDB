import type {
  DraftAttribute,
  DraftCatalogSelection,
  DraftCharacterRelationship,
  DraftHierarchySelection,
  ObjectTypeKey,
  StoryObject,
  StoryObjectSummary,
} from '../types'
import { apiBaseUrl, apiFetch, ensureOk } from './apiClient'

const normalizeAttributes = (attributes: DraftAttribute[]) =>
  attributes
    .map((attribute) => ({
      name: attribute.name.trim(),
      value: attribute.value.trim(),
    }))
    .filter((attribute) => attribute.name.length > 0)

const normalizeHierarchySelections = (selections: DraftHierarchySelection[]) =>
  selections
    .map((selection) => ({
      groupId: selection.groupId,
      nodeIds: Array.from(new Set(selection.nodeIds)),
    }))
    .filter((selection) => selection.groupId > 0 && selection.nodeIds.length > 0)

const normalizeCharacterRelationships = (relationships: DraftCharacterRelationship[]) =>
  relationships
    .map((relationship) => ({
      id: relationship.id ?? null,
      sourceCharacterId:
        relationship.sourceCharacterId.trim().length === 0 ? null : Number(relationship.sourceCharacterId),
      targetCharacterId: Number(relationship.targetCharacterId),
      relationType: relationship.relationType.trim(),
      strength: Number(relationship.strength),
      tension: Number(relationship.tension),
      isBidirectional: relationship.isBidirectional,
      description: relationship.description.trim() || null,
    }))
    .filter(
      (relationship) =>
        Number.isInteger(relationship.targetCharacterId) &&
        relationship.targetCharacterId > 0 &&
        relationship.relationType.length > 0,
    )

const normalizeCatalogSelections = (selections: DraftCatalogSelection[]) =>
  selections
    .map((selection) => ({
      targetType: selection.targetType,
      catalogId: Number(selection.catalogId),
      catalogEntryGroupId:
        selection.targetType === 'group' && selection.catalogEntryGroupId !== ''
          ? Number(selection.catalogEntryGroupId)
          : null,
      catalogEntryId:
        selection.targetType === 'entry' && selection.catalogEntryId !== ''
          ? Number(selection.catalogEntryId)
          : null,
    }))
    .filter((selection) => {
      if (!Number.isInteger(selection.catalogId) || selection.catalogId <= 0) {
        return false
      }

      if (selection.targetType === 'group') {
        return selection.catalogEntryGroupId !== null
      }

      if (selection.targetType === 'entry') {
        return selection.catalogEntryId !== null
      }

      return true
    })

export const fetchObjects = async (projectId: number, typeKey: ObjectTypeKey) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/objects?typeKey=${typeKey}`)
  await ensureOk(response, 'Failed to load objects.')

  return (await response.json()) as StoryObject[]
}

export const fetchObjectSummaries = async (projectId: number, typeKey: ObjectTypeKey) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/objects/summaries?typeKey=${typeKey}`)
  await ensureOk(response, 'Failed to load object summaries.')

  return (await response.json()) as StoryObjectSummary[]
}

export const fetchObject = async (projectId: number, objectId: number) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/objects/${objectId}`)
  await ensureOk(response, 'Failed to load object.')

  return (await response.json()) as StoryObject
}

export const fetchCharacters = (projectId: number) => fetchObjects(projectId, 'characters')

export const createObjectRequest = async (
  projectId: number,
  typeKey: ObjectTypeKey,
  name: string,
  surname: string,
  surnameForm: string,
  description: string,
  age: string,
  role: string,
  currentStatus: string,
  imagePath: string | null,
  draftAttributes: DraftAttribute[],
  draftHierarchySelections: DraftHierarchySelection[],
  draftCatalogSelections: DraftCatalogSelection[],
  ownedItemIds: number[],
  ownerCharacterIds: number[],
  territoryPlaceIds: number[],
  ownerOrganizationIds: number[],
  parentObjectIds: number[],
  characterRelationships: DraftCharacterRelationship[],
) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/objects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      typeKey,
      name,
      surname: surname.trim() || null,
      surnameForm: typeKey === 'organizations' ? surnameForm.trim() || null : null,
      description: description.trim() || null,
      age: age.trim() || null,
      role: role.trim() || null,
      currentStatus: currentStatus.trim() || null,
      imagePath,
      attributes: normalizeAttributes(draftAttributes),
      hierarchySelections: normalizeHierarchySelections(draftHierarchySelections),
      catalogSelections: normalizeCatalogSelections(draftCatalogSelections),
      ownedItemIds,
      ownerCharacterIds,
      territoryPlaceIds,
      ownerOrganizationIds,
      parentObjectIds,
      characterRelationships: normalizeCharacterRelationships(characterRelationships),
    }),
  })
  await ensureOk(response, 'Failed to create object.')

  return (await response.json()) as StoryObject
}

export const createCharacterRequest = (
  projectId: number,
  name: string,
  surname: string,
  surnameForm: string,
  description: string,
  age: string,
  role: string,
  currentStatus: string,
  imagePath: string | null,
  draftAttributes: DraftAttribute[],
  draftHierarchySelections: DraftHierarchySelection[],
  draftCatalogSelections: DraftCatalogSelection[],
) =>
  createObjectRequest(
    projectId,
    'characters',
    name,
    surname,
    surnameForm,
    description,
    age,
    role,
    currentStatus,
    imagePath,
    draftAttributes,
    draftHierarchySelections,
    draftCatalogSelections,
    [],
    [],
    [],
    [],
    [],
    [],
  )

export const updateObjectRequest = async (
  projectId: number,
  objectId: number,
  name: string,
  surname: string,
  surnameForm: string,
  description: string,
  age: string,
  role: string,
  currentStatus: string,
  imagePath: string | null,
  draftAttributes: DraftAttribute[],
  draftHierarchySelections: DraftHierarchySelection[],
  draftCatalogSelections: DraftCatalogSelection[],
  ownedItemIds: number[],
  ownerCharacterIds: number[],
  territoryPlaceIds: number[],
  ownerOrganizationIds: number[],
  parentObjectIds: number[],
  characterRelationships: DraftCharacterRelationship[],
) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/objects/${objectId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      surname: surname.trim() || null,
      surnameForm: surnameForm.trim() || null,
      description: description.trim() || null,
      age: age.trim() || null,
      role: role.trim() || null,
      currentStatus: currentStatus.trim() || null,
      imagePath,
      attributes: normalizeAttributes(draftAttributes),
      hierarchySelections: normalizeHierarchySelections(draftHierarchySelections),
      catalogSelections: normalizeCatalogSelections(draftCatalogSelections),
      ownedItemIds,
      ownerCharacterIds,
      territoryPlaceIds,
      ownerOrganizationIds,
      parentObjectIds,
      characterRelationships: normalizeCharacterRelationships(characterRelationships),
    }),
  })
  await ensureOk(response, 'Failed to update object.')

  return (await response.json()) as StoryObject
}

export const updateCharacterRequest = (
  projectId: number,
  characterId: number,
  name: string,
  surname: string,
  surnameForm: string,
  description: string,
  age: string,
  role: string,
  currentStatus: string,
  imagePath: string | null,
  draftAttributes: DraftAttribute[],
  draftHierarchySelections: DraftHierarchySelection[],
  draftCatalogSelections: DraftCatalogSelection[],
) =>
  updateObjectRequest(
    projectId,
    characterId,
    name,
    surname,
    surnameForm,
    description,
    age,
    role,
    currentStatus,
    imagePath,
    draftAttributes,
    draftHierarchySelections,
    draftCatalogSelections,
    [],
    [],
    [],
    [],
    [],
    [],
  )

export const deleteObjectRequest = async (projectId: number, objectId: number) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/objects/${objectId}`, {
    method: 'DELETE',
  })
  await ensureOk(response, 'Failed to delete object.')
}

export const addObjectGalleryImageRequest = async (
  projectId: number,
  objectId: number,
  imagePath: string,
  caption: string,
) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/objects/${objectId}/gallery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imagePath,
      caption: caption.trim() || null,
    }),
  })
  await ensureOk(response, 'Failed to add gallery image.')

  return (await response.json()) as StoryObject
}

export const updateObjectGalleryImageRequest = async (
  projectId: number,
  objectId: number,
  imageId: number,
  imagePath: string,
  caption: string,
) => {
  const response = await apiFetch(
    `${apiBaseUrl}/projects/${projectId}/objects/${objectId}/gallery/${imageId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imagePath,
        caption: caption.trim() || null,
      }),
    },
  )
  await ensureOk(response, 'Failed to update gallery image.')

  return (await response.json()) as StoryObject
}

export const deleteObjectGalleryImageRequest = async (projectId: number, objectId: number, imageId: number) => {
  const response = await apiFetch(
    `${apiBaseUrl}/projects/${projectId}/objects/${objectId}/gallery/${imageId}`,
    { method: 'DELETE' },
  )
  await ensureOk(response, 'Failed to delete gallery image.')

  return (await response.json()) as StoryObject
}
