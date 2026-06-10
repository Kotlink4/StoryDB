import type {
  AttributeDefinition,
  AttributeGroup,
  AttributeDefinitionDraft,
  AuthUser,
  Catalog,
  CatalogEntry,
  CatalogEntryDraft,
  CatalogEntryGroup,
  CatalogFieldDefinition,
  CatalogFieldDraft,
  CatalogHierarchyMode,
  DraftCatalogSelection,
  DraftCharacterRelationship,
  DraftAttribute,
  DraftHierarchySelection,
  HierarchyGroup,
  HierarchyNode,
  ObjectTypeKey,
  StoryObject,
  StoryProject,
  TimelineEvent,
  TimelineEventDraft,
} from './types'

const apiBaseUrl = 'http://localhost:5282/api'
export const assetBaseUrl = 'http://localhost:5282'

const apiFetch = (input: RequestInfo | URL, init: RequestInit = {}) =>
  globalThis.fetch(input, {
    ...init,
    credentials: 'include',
  })

const ensureOk = (response: Response, message: string) => {
  if (!response.ok) {
    throw new Error(message)
  }
}

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

const normalizeTimelineNumber = (value: string) => {
  const normalizedValue = value.trim()
  if (normalizedValue.length === 0) {
    return null
  }

  const parsedValue = Number(normalizedValue)
  return Number.isFinite(parsedValue) ? parsedValue : null
}

const toTimelinePayload = (draft: TimelineEventDraft) => ({
  title: draft.title.trim(),
  description: draft.description.trim() || null,
  startLabel: draft.startLabel.trim() || null,
  endLabel: draft.endLabel.trim() || null,
  startValue: normalizeTimelineNumber(draft.startValue),
  endValue: normalizeTimelineNumber(draft.endValue),
  category: draft.category.trim() || null,
  color: draft.color.trim() || null,
  participants: draft.participants
    .map((participant) => ({
      targetType: participant.targetType,
      targetId: Number(participant.targetId),
      role: participant.role.trim() || null,
    }))
    .filter(
      (participant) =>
        participant.targetType.length > 0 &&
        Number.isInteger(participant.targetId) &&
        participant.targetId > 0,
    ),
  changes: draft.changes
    .map((change) => ({
      changeType: change.changeType,
      targetType: change.targetType,
      targetId: Number(change.targetId),
      fieldKey: change.fieldName.trim() || null,
      fieldName: change.fieldName.trim() || null,
      oldValueJson: change.oldValue.trim() || null,
      newValueJson: change.newValue.trim() || null,
      effectiveFromLabel: draft.startLabel.trim() || null,
      effectiveToLabel: draft.endLabel.trim() || null,
      effectiveFromValue: normalizeTimelineNumber(draft.startValue),
      effectiveToValue: normalizeTimelineNumber(draft.endValue),
      notes: change.notes.trim() || null,
    }))
    .filter(
      (change) =>
        change.changeType.length > 0 &&
        change.targetType.length > 0 &&
        Number.isInteger(change.targetId) &&
        change.targetId > 0,
    ),
})

export const fetchProjects = async () => {
  const response = await apiFetch(`${apiBaseUrl}/projects`)
  ensureOk(response, 'Failed to load projects.')

  return (await response.json()) as StoryProject[]
}

export const fetchCurrentUser = async () => {
  const response = await apiFetch(`${apiBaseUrl}/auth/me`)
  if (response.status === 401) {
    return null
  }
  ensureOk(response, 'Failed to load current user.')

  return (await response.json()) as AuthUser
}

export const registerRequest = async (email: string, password: string, displayName: string) => {
  const response = await apiFetch(`${apiBaseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      displayName: displayName.trim() || null,
    }),
  })
  ensureOk(response, 'Failed to register.')

  return (await response.json()) as AuthUser
}

export const loginRequest = async (email: string, password: string) => {
  const response = await apiFetch(`${apiBaseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  ensureOk(response, 'Failed to sign in.')

  return (await response.json()) as AuthUser
}

export const logoutRequest = async () => {
  const response = await apiFetch(`${apiBaseUrl}/auth/logout`, {
    method: 'POST',
  })
  ensureOk(response, 'Failed to sign out.')
}

export const resolveAssetUrl = (path: string | null) =>
  path === null ? null : `${assetBaseUrl}${path}`

export const uploadImageRequest = async (file: File) => {
  const formData = new FormData()
  formData.append('file', file)

  const response = await apiFetch(`${apiBaseUrl}/uploads/images`, {
    method: 'POST',
    body: formData,
  })
  ensureOk(response, 'Failed to upload image.')

  return (await response.json()) as { path: string }
}

export const createProjectRequest = async (
  name: string,
  coverImagePath: string | null,
  enabledObjectTypeKeys: ObjectTypeKey[],
  presetKeys: string[],
) => {
  const response = await apiFetch(`${apiBaseUrl}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, coverImagePath, enabledObjectTypeKeys, presetKeys }),
  })
  ensureOk(response, 'Failed to create project.')

  return (await response.json()) as StoryProject
}

export const updateProjectRequest = async (
  project: StoryProject,
  name: string,
  coverImagePath: string | null,
  enabledObjectTypeKeys: ObjectTypeKey[],
  presetKeys: string[],
) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${project.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, coverImagePath, enabledObjectTypeKeys, presetKeys }),
  })
  ensureOk(response, 'Failed to update project.')

  return (await response.json()) as StoryProject
}

export const deleteProjectRequest = async (projectId: number) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}`, {
    method: 'DELETE',
  })
  ensureOk(response, 'Failed to delete project.')
}

export const fetchCatalogs = async (projectId: number) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/catalogs`)
  ensureOk(response, 'Failed to load catalogs.')

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
  ensureOk(response, 'Failed to create catalog.')

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
  ensureOk(response, 'Failed to update catalog.')

  return (await response.json()) as Catalog
}

export const deleteCatalogRequest = async (projectId: number, catalogId: number) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/catalogs/${catalogId}`, {
    method: 'DELETE',
  })
  ensureOk(response, 'Failed to delete catalog.')
}

export const fetchCatalogEntries = async (projectId: number, catalogId: number) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/catalogs/${catalogId}/entries`)
  ensureOk(response, 'Failed to load catalog entries.')

  return (await response.json()) as CatalogEntry[]
}

export const fetchCatalogEntryGroups = async (projectId: number, catalogId: number) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/catalogs/${catalogId}/entry-groups`)
  ensureOk(response, 'Failed to load catalog entry groups.')

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
  ensureOk(response, 'Failed to create catalog entry group.')

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
  ensureOk(response, 'Failed to update catalog entry group.')

  return (await response.json()) as CatalogEntryGroup
}

export const deleteCatalogEntryGroupRequest = async (
  projectId: number,
  catalogId: number,
  groupId: number,
) => {
  const response = await apiFetch(
    `${apiBaseUrl}/projects/${projectId}/catalogs/${catalogId}/entry-groups/${groupId}`,
    {
      method: 'DELETE',
    },
  )
  ensureOk(response, 'Failed to delete catalog entry group.')
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
  ensureOk(response, 'Failed to create catalog entry.')

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
  ensureOk(response, 'Failed to update catalog entry.')

  return (await response.json()) as CatalogEntry
}

export const deleteCatalogEntryRequest = async (
  projectId: number,
  catalogId: number,
  entryId: number,
) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/catalogs/${catalogId}/entries/${entryId}`, {
    method: 'DELETE',
  })
  ensureOk(response, 'Failed to delete catalog entry.')
}

export const fetchCatalogFieldDefinitions = async (projectId: number, catalogId: number) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/catalogs/${catalogId}/fields`)
  ensureOk(response, 'Failed to load catalog fields.')

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
  ensureOk(response, 'Failed to create catalog field.')

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
  ensureOk(response, 'Failed to update catalog field.')

  return (await response.json()) as CatalogFieldDefinition
}

export const deleteCatalogFieldDefinitionRequest = async (
  projectId: number,
  catalogId: number,
  fieldId: number,
) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/catalogs/${catalogId}/fields/${fieldId}`, {
    method: 'DELETE',
  })
  ensureOk(response, 'Failed to delete catalog field.')
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

export const fetchObjects = async (projectId: number, typeKey: ObjectTypeKey) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/objects?typeKey=${typeKey}`)
  ensureOk(response, 'Failed to load objects.')

  return (await response.json()) as StoryObject[]
}

export const fetchCharacters = (projectId: number) => fetchObjects(projectId, 'characters')

export const createObjectRequest = async (
  projectId: number,
  typeKey: ObjectTypeKey,
  name: string,
  surname: string,
  description: string,
  age: string,
  role: string,
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
      description: description.trim() || null,
      age: age.trim() || null,
      role: role.trim() || null,
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
  ensureOk(response, 'Failed to create object.')

  return (await response.json()) as StoryObject
}

export const createCharacterRequest = (
  projectId: number,
  name: string,
  surname: string,
  description: string,
  age: string,
  role: string,
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
    description,
    age,
    role,
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
  description: string,
  age: string,
  role: string,
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
      description: description.trim() || null,
      age: age.trim() || null,
      role: role.trim() || null,
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
  ensureOk(response, 'Failed to update object.')

  return (await response.json()) as StoryObject
}

export const updateCharacterRequest = (
  projectId: number,
  characterId: number,
  name: string,
  surname: string,
  description: string,
  age: string,
  role: string,
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
    description,
    age,
    role,
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

export const fetchTimelineEvents = async (projectId: number) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/timeline/events`)
  ensureOk(response, 'Failed to load timeline events.')

  return (await response.json()) as TimelineEvent[]
}

export const createTimelineEventRequest = async (
  projectId: number,
  draft: TimelineEventDraft,
) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/timeline/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toTimelinePayload(draft)),
  })
  ensureOk(response, 'Failed to create timeline event.')

  return (await response.json()) as TimelineEvent
}

export const updateTimelineEventRequest = async (
  projectId: number,
  eventId: number,
  draft: TimelineEventDraft,
) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/timeline/events/${eventId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toTimelinePayload(draft)),
  })
  ensureOk(response, 'Failed to update timeline event.')

  return (await response.json()) as TimelineEvent
}

export const deleteTimelineEventRequest = async (projectId: number, eventId: number) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/timeline/events/${eventId}`, {
    method: 'DELETE',
  })
  ensureOk(response, 'Failed to delete timeline event.')
}

export const deleteObjectRequest = async (projectId: number, objectId: number) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/objects/${objectId}`, {
    method: 'DELETE',
  })
  ensureOk(response, 'Failed to delete object.')
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
  ensureOk(response, 'Failed to add gallery image.')

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
  ensureOk(response, 'Failed to update gallery image.')

  return (await response.json()) as StoryObject
}

export const deleteObjectGalleryImageRequest = async (
  projectId: number,
  objectId: number,
  imageId: number,
) => {
  const response = await apiFetch(
    `${apiBaseUrl}/projects/${projectId}/objects/${objectId}/gallery/${imageId}`,
    {
      method: 'DELETE',
    },
  )
  ensureOk(response, 'Failed to delete gallery image.')

  return (await response.json()) as StoryObject
}

const toAttributeDefinitionPayload = (
  typeKey: ObjectTypeKey,
  draft: AttributeDefinitionDraft,
) => ({
  typeKey,
  name: draft.name.trim(),
  dataType: draft.dataType,
  groupName: draft.groupName.trim() || null,
  minValue: draft.minValue.trim().length === 0 ? null : Number(draft.minValue),
  maxValue: draft.maxValue.trim().length === 0 ? null : Number(draft.maxValue),
  unit: draft.unit.trim() || null,
  options: draft.optionsText
    .split(',')
    .map((option) => option.trim())
    .filter((option) => option.length > 0),
})

export const fetchAttributeGroups = async (
  projectId: number,
  typeKey: ObjectTypeKey,
) => {
  const response = await apiFetch(
    `${apiBaseUrl}/projects/${projectId}/attribute-definitions/groups?typeKey=${typeKey}`,
  )
  ensureOk(response, 'Failed to load attribute groups.')

  return (await response.json()) as AttributeGroup[]
}

export const createAttributeGroupRequest = async (
  projectId: number,
  typeKey: ObjectTypeKey,
  name: string,
) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/attribute-definitions/groups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ typeKey, name }),
  })
  ensureOk(response, 'Failed to create attribute group.')

  return (await response.json()) as AttributeGroup
}

export const updateAttributeGroupRequest = async (
  projectId: number,
  typeKey: ObjectTypeKey,
  groupId: number,
  name: string,
) => {
  const response = await apiFetch(
    `${apiBaseUrl}/projects/${projectId}/attribute-definitions/groups/${groupId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ typeKey, name }),
    },
  )
  ensureOk(response, 'Failed to update attribute group.')

  return (await response.json()) as AttributeGroup
}
export const deleteAttributeGroupRequest = async (
  projectId: number,
  groupId: number,
) => {
  const response = await apiFetch(
    `${apiBaseUrl}/projects/${projectId}/attribute-definitions/groups/${groupId}`,
    { method: 'DELETE' },
  )
  ensureOk(response, 'Failed to delete attribute group.')
}
export const fetchAttributeDefinitions = async (
  projectId: number,
  typeKey: ObjectTypeKey,
) => {
  const response = await apiFetch(
    `${apiBaseUrl}/projects/${projectId}/attribute-definitions?typeKey=${typeKey}`,
  )
  ensureOk(response, 'Failed to load attribute definitions.')

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
  ensureOk(response, 'Failed to create attribute definition.')

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
  ensureOk(response, 'Failed to update attribute definition.')

  return (await response.json()) as AttributeDefinition
}

export const deleteAttributeDefinitionRequest = async (
  projectId: number,
  definitionId: number,
) => {
  const response = await apiFetch(
    `${apiBaseUrl}/projects/${projectId}/attribute-definitions/${definitionId}`,
    { method: 'DELETE' },
  )
  ensureOk(response, 'Failed to delete attribute definition.')
}

export const fetchHierarchyGroups = async (projectId: number) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/hierarchies/groups`)
  ensureOk(response, 'Failed to load hierarchy groups.')

  return (await response.json()) as HierarchyGroup[]
}

export const createHierarchyGroupRequest = async (projectId: number, name: string) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/hierarchies/groups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  ensureOk(response, 'Failed to create hierarchy group.')

  return (await response.json()) as HierarchyGroup
}

export const updateHierarchyGroupRequest = async (
  projectId: number,
  groupId: number,
  name: string,
) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/hierarchies/groups/${groupId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  ensureOk(response, 'Failed to update hierarchy group.')

  return (await response.json()) as HierarchyGroup
}

export const deleteHierarchyGroupRequest = async (projectId: number, groupId: number) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/hierarchies/groups/${groupId}`, {
    method: 'DELETE',
  })
  ensureOk(response, 'Failed to delete hierarchy group.')
}

export const fetchHierarchyNodes = async (projectId: number, groupId: number) => {
  const response = await apiFetch(
    `${apiBaseUrl}/projects/${projectId}/hierarchies/groups/${groupId}/nodes`,
  )
  ensureOk(response, 'Failed to load hierarchy nodes.')

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
  ensureOk(response, 'Failed to create hierarchy node.')

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
  ensureOk(response, 'Failed to update hierarchy node.')

  return (await response.json()) as HierarchyNode
}

export const deleteHierarchyNodeRequest = async (
  projectId: number,
  groupId: number,
  nodeId: number,
) => {
  const response = await apiFetch(
    `${apiBaseUrl}/projects/${projectId}/hierarchies/groups/${groupId}/nodes/${nodeId}`,
    { method: 'DELETE' },
  )
  ensureOk(response, 'Failed to delete hierarchy node.')
}

