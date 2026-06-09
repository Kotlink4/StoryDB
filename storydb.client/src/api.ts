import type {
  AttributeDefinition,
  AttributeGroup,
  AttributeDefinitionDraft,
  Catalog,
  CatalogEntry,
  CatalogEntryDraft,
  CatalogEntryGroup,
  CatalogFieldDefinition,
  CatalogFieldDraft,
  DraftAttribute,
  DraftHierarchySelection,
  HierarchyGroup,
  HierarchyNode,
  ObjectTypeKey,
  StoryObject,
  StoryProject,
} from './types'

const apiBaseUrl = 'http://localhost:5282/api'
export const assetBaseUrl = 'http://localhost:5282'

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

export const fetchProjects = async () => {
  const response = await fetch(`${apiBaseUrl}/projects`)
  ensureOk(response, 'Failed to load projects.')

  return (await response.json()) as StoryProject[]
}

export const resolveAssetUrl = (path: string | null) =>
  path === null ? null : `${assetBaseUrl}${path}`

export const uploadImageRequest = async (file: File) => {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${apiBaseUrl}/uploads/images`, {
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
) => {
  const response = await fetch(`${apiBaseUrl}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, coverImagePath, enabledObjectTypeKeys }),
  })
  ensureOk(response, 'Failed to create project.')

  return (await response.json()) as StoryProject
}

export const updateProjectRequest = async (
  project: StoryProject,
  name: string,
  coverImagePath: string | null,
  enabledObjectTypeKeys: ObjectTypeKey[],
) => {
  const response = await fetch(`${apiBaseUrl}/projects/${project.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, coverImagePath, enabledObjectTypeKeys }),
  })
  ensureOk(response, 'Failed to update project.')

  return (await response.json()) as StoryProject
}

export const deleteProjectRequest = async (projectId: number) => {
  const response = await fetch(`${apiBaseUrl}/projects/${projectId}`, {
    method: 'DELETE',
  })
  ensureOk(response, 'Failed to delete project.')
}

export const fetchCatalogs = async (projectId: number) => {
  const response = await fetch(`${apiBaseUrl}/projects/${projectId}/catalogs`)
  ensureOk(response, 'Failed to load catalogs.')

  return (await response.json()) as Catalog[]
}

export const createCatalogRequest = async (
  projectId: number,
  name: string,
  description: string,
  supportsHierarchy: boolean,
) => {
  const response = await fetch(`${apiBaseUrl}/projects/${projectId}/catalogs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      description: description.trim() || null,
      supportsHierarchy,
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
) => {
  const response = await fetch(`${apiBaseUrl}/projects/${projectId}/catalogs/${catalogId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      description: description.trim() || null,
      supportsHierarchy,
    }),
  })
  ensureOk(response, 'Failed to update catalog.')

  return (await response.json()) as Catalog
}

export const deleteCatalogRequest = async (projectId: number, catalogId: number) => {
  const response = await fetch(`${apiBaseUrl}/projects/${projectId}/catalogs/${catalogId}`, {
    method: 'DELETE',
  })
  ensureOk(response, 'Failed to delete catalog.')
}

export const fetchCatalogEntries = async (projectId: number, catalogId: number) => {
  const response = await fetch(`${apiBaseUrl}/projects/${projectId}/catalogs/${catalogId}/entries`)
  ensureOk(response, 'Failed to load catalog entries.')

  return (await response.json()) as CatalogEntry[]
}

export const fetchCatalogEntryGroups = async (projectId: number, catalogId: number) => {
  const response = await fetch(`${apiBaseUrl}/projects/${projectId}/catalogs/${catalogId}/entry-groups`)
  ensureOk(response, 'Failed to load catalog entry groups.')

  return (await response.json()) as CatalogEntryGroup[]
}

export const createCatalogEntryGroupRequest = async (
  projectId: number,
  catalogId: number,
  name: string,
) => {
  const response = await fetch(`${apiBaseUrl}/projects/${projectId}/catalogs/${catalogId}/entry-groups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  ensureOk(response, 'Failed to create catalog entry group.')

  return (await response.json()) as CatalogEntryGroup
}

export const updateCatalogEntryGroupRequest = async (
  projectId: number,
  catalogId: number,
  groupId: number,
  name: string,
) => {
  const response = await fetch(
    `${apiBaseUrl}/projects/${projectId}/catalogs/${catalogId}/entry-groups/${groupId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
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
  const response = await fetch(
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
) => {
  const response = await fetch(`${apiBaseUrl}/projects/${projectId}/catalogs/${catalogId}/entries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: draft.name,
      description: draft.description.trim() || null,
      imagePath: draft.imagePath,
      entryGroupId: draft.entryGroupId === '' ? null : Number(draft.entryGroupId),
      fieldValues: toCatalogEntryFieldValueRequests(draft),
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
) => {
  const response = await fetch(`${apiBaseUrl}/projects/${projectId}/catalogs/${catalogId}/entries/${entryId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: draft.name,
      description: draft.description.trim() || null,
      imagePath: draft.imagePath,
      entryGroupId: draft.entryGroupId === '' ? null : Number(draft.entryGroupId),
      fieldValues: toCatalogEntryFieldValueRequests(draft),
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
  const response = await fetch(`${apiBaseUrl}/projects/${projectId}/catalogs/${catalogId}/entries/${entryId}`, {
    method: 'DELETE',
  })
  ensureOk(response, 'Failed to delete catalog entry.')
}

export const fetchCatalogFieldDefinitions = async (projectId: number, catalogId: number) => {
  const response = await fetch(`${apiBaseUrl}/projects/${projectId}/catalogs/${catalogId}/fields`)
  ensureOk(response, 'Failed to load catalog fields.')

  return (await response.json()) as CatalogFieldDefinition[]
}

export const createCatalogFieldDefinitionRequest = async (
  projectId: number,
  catalogId: number,
  draft: CatalogFieldDraft,
) => {
  const response = await fetch(`${apiBaseUrl}/projects/${projectId}/catalogs/${catalogId}/fields`, {
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
  const response = await fetch(`${apiBaseUrl}/projects/${projectId}/catalogs/${catalogId}/fields/${fieldId}`, {
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
  const response = await fetch(`${apiBaseUrl}/projects/${projectId}/catalogs/${catalogId}/fields/${fieldId}`, {
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

const toCatalogEntryFieldValueRequests = (draft: CatalogEntryDraft) =>
  Object.entries(draft.fieldValues)
    .map(([fieldDefinitionId, value]) => ({
      fieldDefinitionId: Number(fieldDefinitionId),
      value: value.trim() || null,
      referencedEntryIds: [],
    }))
    .filter((fieldValue) => fieldValue.value !== null)

export const fetchCharacters = async (projectId: number) => {
  const response = await fetch(`${apiBaseUrl}/projects/${projectId}/objects?typeKey=characters`)
  ensureOk(response, 'Failed to load characters.')

  return (await response.json()) as StoryObject[]
}

export const createCharacterRequest = async (
  projectId: number,
  name: string,
  surname: string,
  description: string,
  age: string,
  role: string,
  imagePath: string | null,
  draftAttributes: DraftAttribute[],
  draftHierarchySelections: DraftHierarchySelection[],
) => {
  const response = await fetch(`${apiBaseUrl}/projects/${projectId}/objects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      typeKey: 'characters',
      name,
      surname: surname.trim() || null,
      description: description.trim() || null,
      age: age.trim() || null,
      role: role.trim() || null,
      imagePath,
      attributes: normalizeAttributes(draftAttributes),
      hierarchySelections: normalizeHierarchySelections(draftHierarchySelections),
    }),
  })
  ensureOk(response, 'Failed to create character.')

  return (await response.json()) as StoryObject
}

export const updateCharacterRequest = async (
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
) => {
  const response = await fetch(`${apiBaseUrl}/projects/${projectId}/objects/${characterId}`, {
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
    }),
  })
  ensureOk(response, 'Failed to update character.')

  return (await response.json()) as StoryObject
}

export const deleteObjectRequest = async (projectId: number, objectId: number) => {
  const response = await fetch(`${apiBaseUrl}/projects/${projectId}/objects/${objectId}`, {
    method: 'DELETE',
  })
  ensureOk(response, 'Failed to delete object.')
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
  const response = await fetch(
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
  const response = await fetch(`${apiBaseUrl}/projects/${projectId}/attribute-definitions/groups`, {
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
  const response = await fetch(
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
  const response = await fetch(
    `${apiBaseUrl}/projects/${projectId}/attribute-definitions/groups/${groupId}`,
    { method: 'DELETE' },
  )
  ensureOk(response, 'Failed to delete attribute group.')
}
export const fetchAttributeDefinitions = async (
  projectId: number,
  typeKey: ObjectTypeKey,
) => {
  const response = await fetch(
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
  const response = await fetch(`${apiBaseUrl}/projects/${projectId}/attribute-definitions`, {
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
  const response = await fetch(
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
  const response = await fetch(
    `${apiBaseUrl}/projects/${projectId}/attribute-definitions/${definitionId}`,
    { method: 'DELETE' },
  )
  ensureOk(response, 'Failed to delete attribute definition.')
}

export const fetchHierarchyGroups = async (projectId: number) => {
  const response = await fetch(`${apiBaseUrl}/projects/${projectId}/hierarchies/groups`)
  ensureOk(response, 'Failed to load hierarchy groups.')

  return (await response.json()) as HierarchyGroup[]
}

export const createHierarchyGroupRequest = async (projectId: number, name: string) => {
  const response = await fetch(`${apiBaseUrl}/projects/${projectId}/hierarchies/groups`, {
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
  const response = await fetch(`${apiBaseUrl}/projects/${projectId}/hierarchies/groups/${groupId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  ensureOk(response, 'Failed to update hierarchy group.')

  return (await response.json()) as HierarchyGroup
}

export const deleteHierarchyGroupRequest = async (projectId: number, groupId: number) => {
  const response = await fetch(`${apiBaseUrl}/projects/${projectId}/hierarchies/groups/${groupId}`, {
    method: 'DELETE',
  })
  ensureOk(response, 'Failed to delete hierarchy group.')
}

export const fetchHierarchyNodes = async (projectId: number, groupId: number) => {
  const response = await fetch(
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
  const response = await fetch(`${apiBaseUrl}/projects/${projectId}/hierarchies/groups/${groupId}/nodes`, {
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
  const response = await fetch(
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
  const response = await fetch(
    `${apiBaseUrl}/projects/${projectId}/hierarchies/groups/${groupId}/nodes/${nodeId}`,
    { method: 'DELETE' },
  )
  ensureOk(response, 'Failed to delete hierarchy node.')
}
