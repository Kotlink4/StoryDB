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
  OrganizationStructureLevel,
  OrganizationStructureLevelDraft,
  RelationGraph,
  RelationGraphLayout,
  RelationGraphLayoutDraft,
  Structure,
  StructureAssignment,
  StructureAssignmentDraft,
  StructureDraft,
  StructureOwnerKind,
  StructureSummary,
  StructureUsage,
  StructureUsageDraft,
  StoryObject,
  StoryObjectSummary,
  StoryProject,
  TimelineEvent,
  TimelineEventDraft,
  TimelineEventLink,
  TimelineEventLinkDraft,
  TimelineInfo,
  TimelineLayout,
  TimelineLayoutRules,
} from './types'
import { prepareImageForUpload, validatePreparedImageUpload } from './imageUploadPreparation'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api'
export const assetBaseUrl = import.meta.env.VITE_ASSET_BASE_URL ?? ''

const apiFetch = (input: RequestInfo | URL, init: RequestInit = {}) =>
  globalThis.fetch(input, {
    ...init,
    credentials: 'include',
  })

export class ApiRequestError extends Error {
  status: number
  traceId: string | null

  constructor(message: string, status: number, traceId: string | null = null) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.traceId = traceId
  }
}

export const getApiErrorMessage = (error: unknown, fallback: string) =>
  error instanceof ApiRequestError && error.message.trim().length > 0 ? error.message : fallback

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const getTextValue = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

const getProblemErrorsMessage = (errors: unknown) => {
  if (!isRecord(errors)) {
    return ''
  }

  for (const value of Object.values(errors)) {
    if (Array.isArray(value)) {
      const message = value.map(getTextValue).find((item) => item.length > 0)
      if (message) {
        return message
      }
    }

    const message = getTextValue(value)
    if (message.length > 0) {
      return message
    }
  }

  return ''
}

const readErrorPayload = async (response: Response) => {
  const body = await response.text()
  if (body.trim().length === 0) {
    return { message: '', traceId: null }
  }

  try {
    const payload: unknown = JSON.parse(body)
    if (typeof payload === 'string') {
      return { message: payload.trim(), traceId: null }
    }

    if (!isRecord(payload)) {
      return { message: '', traceId: null }
    }

    const errorsMessage = getProblemErrorsMessage(payload.errors)
    const detail = getTextValue(payload.detail)
    const title = getTextValue(payload.title)
    const extensions = isRecord(payload.extensions) ? payload.extensions : null
    const traceId = getTextValue(payload.traceId) || getTextValue(extensions?.traceId) || null

    return {
      message: errorsMessage || detail || title,
      traceId,
    }
  } catch {
    return { message: body.trim(), traceId: null }
  }
}

const ensureOk = async (response: Response, message: string) => {
  if (!response.ok) {
    const error = await readErrorPayload(response)
    throw new ApiRequestError(error.message || message, response.status, error.traceId)
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

const normalizeTimelineNumber = (value: string) => {
  const normalizedValue = value.trim()
  if (normalizedValue.length === 0) {
    return null
  }

  const parsedValue = Number(normalizedValue)
  return Number.isFinite(parsedValue) ? parsedValue : null
}

const toTimelinePayload = (draft: TimelineEventDraft) => {
  const isRangeEvent = draft.eventType === 'duration' || draft.eventType === 'era'
  const startLabel = draft.startLabel.trim() || null
  const endLabel = isRangeEvent ? draft.endLabel.trim() || null : null
  const startValue = normalizeTimelineNumber(draft.startValue)
  const endValue = isRangeEvent ? normalizeTimelineNumber(draft.endValue) : null

  return {
    title: draft.title.trim(),
    eventType: draft.eventType,
    parentEventId:
      draft.eventType === 'point' && draft.parentEventId.trim().length > 0
        ? Number(draft.parentEventId)
        : null,
    description: draft.description.trim() || null,
    startLabel,
    endLabel,
    startValue,
    endValue,
    category: draft.category.trim() || null,
    color: draft.color.trim() || null,
    imagePath: draft.imagePath,
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
        effectiveFromLabel: startLabel,
        effectiveToLabel: endLabel,
        effectiveFromValue: startValue,
        effectiveToValue: endValue,
        notes: change.notes.trim() || null,
      }))
      .filter(
        (change) =>
          change.changeType.length > 0 &&
          change.targetType.length > 0 &&
          Number.isInteger(change.targetId) &&
          change.targetId > 0,
      ),
  }
}

const toTimelineLinkPayload = (draft: TimelineEventLinkDraft) => ({
  sourceEventId: Number(draft.sourceEventId),
  targetEventId: Number(draft.targetEventId),
  linkType: draft.linkType,
  description: draft.description.trim() || null,
})

const toStructurePayload = (draft: StructureDraft) => ({
  name: draft.name.trim(),
  description: draft.description.trim() || null,
  ownerKind: draft.ownerKind,
  ownerId: draft.ownerKind === 'project' ? null : draft.ownerId,
  layoutKind: draft.layoutKind,
  nodeBindingMode: draft.nodeBindingMode,
  linkedCatalogId: draft.linkedCatalogId,
  nodes: draft.nodes.map((node, index) => ({
    clientId: node.clientId.trim() || `node-${index}`,
    parentClientId: node.parentClientId?.trim() || null,
    linkedCatalogEntryId: node.linkedCatalogEntryId,
    linkedCatalogEntryGroupId: node.linkedCatalogEntryGroupId,
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
  storyObjectId: draft.storyObjectId,
  roleLabel: draft.roleLabel.trim() || null,
  notes: draft.notes.trim() || null,
  sortOrder: draft.sortOrder,
})

export const fetchProjects = async () => {
  const response = await apiFetch(`${apiBaseUrl}/projects`)
  await ensureOk(response, 'Failed to load projects.')

  return (await response.json()) as StoryProject[]
}

export const fetchCurrentUser = async () => {
  const response = await apiFetch(`${apiBaseUrl}/auth/me`)
  if (response.status === 401) {
    return null
  }
  await ensureOk(response, 'Failed to load current user.')

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
  await ensureOk(response, 'Failed to register.')

  return (await response.json()) as AuthUser
}

export const loginRequest = async (email: string, password: string) => {
  const response = await apiFetch(`${apiBaseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  await ensureOk(response, 'Failed to sign in.')

  return (await response.json()) as AuthUser
}

export const logoutRequest = async () => {
  const response = await apiFetch(`${apiBaseUrl}/auth/logout`, {
    method: 'POST',
  })
  await ensureOk(response, 'Failed to sign out.')
}

export const updateCurrentUserRequest = async (
  email: string,
  displayName: string,
  avatarImagePath: string | null,
) => {
  const response = await apiFetch(`${apiBaseUrl}/auth/me`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: email.trim(),
      displayName: displayName.trim(),
      avatarImagePath,
    }),
  })
  await ensureOk(response, 'Failed to update profile.')

  return (await response.json()) as AuthUser
}

export const resolveAssetUrl = (path: string | null) =>
  path === null ? null : `${assetBaseUrl}${path}`

export const uploadImageRequest = async (file: File, projectId: number | null = null) => {
  const preparedImage = await prepareImageForUpload(file)
  const validationError = validatePreparedImageUpload(preparedImage.file)
  if (validationError !== null) {
    throw new Error(validationError)
  }

  const formData = new FormData()
  formData.append('file', preparedImage.file)

  const uploadUrl = projectId === null ? `${apiBaseUrl}/uploads/images` : `${apiBaseUrl}/uploads/images?projectId=${projectId}`
  const response = await apiFetch(uploadUrl, {
    method: 'POST',
    body: formData,
  })
  await ensureOk(response, 'Failed to upload image.')

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
  await ensureOk(response, 'Failed to create project.')

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
  await ensureOk(response, 'Failed to update project.')

  return (await response.json()) as StoryProject
}

export const deleteProjectRequest = async (projectId: number) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}`, {
    method: 'DELETE',
  })
  await ensureOk(response, 'Failed to delete project.')
}

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

export const deleteCatalogEntryRequest = async (
  projectId: number,
  catalogId: number,
  entryId: number,
) => {
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

export const deleteCatalogFieldDefinitionRequest = async (
  projectId: number,
  catalogId: number,
  fieldId: number,
) => {
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

export const fetchOrganizationStructure = async (projectId: number, objectId: number) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/objects/${objectId}/structure`)
  await ensureOk(response, 'Failed to load organization structure.')

  return (await response.json()) as OrganizationStructureLevel[]
}

export const updateOrganizationStructureRequest = async (
  projectId: number,
  objectId: number,
  levels: OrganizationStructureLevelDraft[],
) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/objects/${objectId}/structure`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      levels: levels.map((level) => ({
        name: level.name.trim(),
        description: level.description.trim() || null,
        slots: level.slots.map((slot) => ({
          name: slot.name.trim(),
          description: slot.description.trim() || null,
          slotType: slot.slotType.trim() || null,
          color: slot.color.trim() || null,
          iconKey: slot.iconKey.trim() || null,
        })),
      })),
    }),
  })
  await ensureOk(response, 'Failed to update organization structure.')

  return (await response.json()) as StoryObject
}

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

export const updateStructureRequest = async (
  projectId: number,
  structureId: number,
  draft: StructureDraft,
) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/structures/${structureId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toStructurePayload(draft)),
  })
  await ensureOk(response, 'Failed to update structure.')

  return (await response.json()) as Structure
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

export const assignStructureRequest = async (
  projectId: number,
  structureId: number,
  draft: StructureUsageDraft,
) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/structures/${structureId}/usages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toStructureUsagePayload(draft)),
  })
  await ensureOk(response, 'Failed to assign structure.')

  return (await response.json()) as StructureUsage
}

export const updateStructureUsageRequest = async (
  projectId: number,
  usageId: number,
  draft: StructureUsageDraft,
) => {
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

export const fetchTimelineInfo = async (projectId: number) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/timeline`)
  await ensureOk(response, 'Failed to load timeline settings.')

  return (await response.json()) as TimelineInfo
}

export const updateTimelineInfoRequest = async (projectId: number, mode: TimelineInfo['mode'], name?: string) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/timeline`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode, name: name ?? null }),
  })
  await ensureOk(response, 'Failed to update timeline settings.')

  return (await response.json()) as TimelineInfo
}

export const fetchTimelineLayout = async (projectId: number) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/timeline/layout`)
  await ensureOk(response, 'Failed to load timeline layout.')

  if (response.status === 204) {
    return null
  }

  const body = await response.text()
  if (body.trim().length === 0) {
    return null
  }

  return JSON.parse(body) as TimelineLayout | null
}

export const fetchTimelineLayoutRules = async (projectId: number) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/timeline/layout/rules`)
  await ensureOk(response, 'Failed to load timeline layout rules.')

  return (await response.json()) as TimelineLayoutRules
}

export const generateTimelineLayoutRequest = async (projectId: number) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/timeline/layout/generate`, {
    method: 'POST',
  })
  await ensureOk(response, 'Failed to generate timeline layout.')

  return (await response.json()) as TimelineLayout
}

export const fetchTimelineEvents = async (projectId: number) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/timeline/events`)
  await ensureOk(response, 'Failed to load timeline events.')

  return (await response.json()) as TimelineEvent[]
}

export const fetchTimelineEventLinks = async (projectId: number) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/timeline/links`)
  await ensureOk(response, 'Failed to load timeline event links.')

  return (await response.json()) as TimelineEventLink[]
}

export const createTimelineEventLinkRequest = async (
  projectId: number,
  draft: TimelineEventLinkDraft,
) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/timeline/links`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toTimelineLinkPayload(draft)),
  })
  await ensureOk(response, 'Failed to create timeline event link.')

  return (await response.json()) as TimelineEventLink
}

export const deleteTimelineEventLinkRequest = async (projectId: number, linkId: number) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/timeline/links/${linkId}`, {
    method: 'DELETE',
  })
  await ensureOk(response, 'Failed to delete timeline event link.')
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
  await ensureOk(response, 'Failed to create timeline event.')

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
  await ensureOk(response, 'Failed to update timeline event.')

  return (await response.json()) as TimelineEvent
}

export const deleteTimelineEventRequest = async (projectId: number, eventId: number) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/timeline/events/${eventId}`, {
    method: 'DELETE',
  })
  await ensureOk(response, 'Failed to delete timeline event.')
}

export const addTimelineEventGalleryImageRequest = async (
  projectId: number,
  eventId: number,
  imagePath: string,
  caption: string,
) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/timeline/events/${eventId}/gallery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imagePath,
      caption: caption.trim() || null,
    }),
  })
  await ensureOk(response, 'Failed to add timeline event gallery image.')

  return (await response.json()) as TimelineEvent
}

export const deleteTimelineEventGalleryImageRequest = async (
  projectId: number,
  eventId: number,
  imageId: number,
) => {
  const response = await apiFetch(
    `${apiBaseUrl}/projects/${projectId}/timeline/events/${eventId}/gallery/${imageId}`,
    {
      method: 'DELETE',
    },
  )
  await ensureOk(response, 'Failed to delete timeline event gallery image.')

  return (await response.json()) as TimelineEvent
}

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
  await ensureOk(response, 'Failed to delete gallery image.')

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
  iconKey: draft.iconKey?.trim() || null,
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
export const deleteAttributeGroupRequest = async (
  projectId: number,
  groupId: number,
) => {
  const response = await apiFetch(
    `${apiBaseUrl}/projects/${projectId}/attribute-definitions/groups/${groupId}`,
    { method: 'DELETE' },
  )
  await ensureOk(response, 'Failed to delete attribute group.')
}
export const fetchAttributeDefinitions = async (
  projectId: number,
  typeKey: ObjectTypeKey,
) => {
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

export const deleteAttributeDefinitionRequest = async (
  projectId: number,
  definitionId: number,
) => {
  const response = await apiFetch(
    `${apiBaseUrl}/projects/${projectId}/attribute-definitions/${definitionId}`,
    { method: 'DELETE' },
  )
  await ensureOk(response, 'Failed to delete attribute definition.')
}

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

export const deleteHierarchyNodeRequest = async (
  projectId: number,
  groupId: number,
  nodeId: number,
) => {
  const response = await apiFetch(
    `${apiBaseUrl}/projects/${projectId}/hierarchies/groups/${groupId}/nodes/${nodeId}`,
    { method: 'DELETE' },
  )
  await ensureOk(response, 'Failed to delete hierarchy node.')
}



