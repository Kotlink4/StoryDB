import type {
  Catalog,
  CatalogEntry,
  CatalogEntryGroup,
  CharacterRelationship,
  HierarchyGroup,
  HierarchyNode,
  ObjectAttribute,
  ObjectCatalogSelection,
  ObjectHierarchySelection,
  ObjectReference,
  ObjectTypeKey,
  RelationGraph,
  RelationGraphEdge,
  Structure,
  StructureAssignment,
  StructureUsage,
  StoryObject,
  TimelineChange,
  TimelineEvent,
} from '../../types'

export type TemporalResolverContext = {
  catalogEntriesByCatalogId?: Record<number, CatalogEntry[]>
  catalogGroupsByCatalogId?: Record<number, CatalogEntryGroup[]>
  catalogs?: Catalog[]
  hierarchyGroups?: HierarchyGroup[]
  hierarchyNodesByGroupId?: Record<number, HierarchyNode[]>
  objectsByType?: Partial<Record<ObjectTypeKey, StoryObject[]>>
  structuresById?: Record<number, Structure>
}

export function getTimelineContextChangesForTarget(
  timelineEvents: TimelineEvent[],
  contextEventId: string,
  targetType: string,
  targetId: number,
) {
  const contextEvent = timelineEvents.find((event) => String(event.id) === contextEventId)

  if (contextEvent === undefined) {
    return []
  }

  const contextValue = contextEvent.startValue
  const contextEvents =
    contextValue === null
      ? [contextEvent]
      : timelineEvents
          .filter((event) => event.startValue !== null && event.startValue <= contextValue)
          .sort((left, right) => {
            const leftValue = left.startValue ?? 0
            const rightValue = right.startValue ?? 0

            return leftValue === rightValue ? left.id - right.id : leftValue - rightValue
          })

  return contextEvents.flatMap((event) =>
    event.changes.filter((change) => {
      if (change.targetType !== targetType || change.targetId !== targetId) {
        return false
      }

      if (contextValue === null) {
        return event.id === contextEvent.id
      }

      const effectiveFrom = change.effectiveFromValue
      const effectiveTo = change.effectiveToValue

      return (effectiveFrom === null || effectiveFrom <= contextValue) && (effectiveTo === null || effectiveTo >= contextValue)
    }),
  )
}

export function getTimelineContextChangesForObject(
  timelineEvents: TimelineEvent[],
  contextEventId: string,
  storyObjectId: number,
) {
  return getTimelineContextChangesForTarget(timelineEvents, contextEventId, 'storyObject', storyObjectId)
}

type CatalogSelectionSnapshot = {
  targetType: ObjectCatalogSelection['targetType']
  catalogId: number
  catalogEntryGroupId: number | null
  catalogEntryId: number | null
}

type HierarchySelectionSnapshot = {
  groupId: number
  nodeIds: number[]
}

type RelationshipSnapshot = {
  direction: CharacterRelationship['direction']
  characterId: number
  relationType: string
  strength: number
  tension: number
  isBidirectional: boolean
  description: string
}

type StructureAssignmentSnapshot = {
  id: number
  projectId: number
  structureUsageId: number
  structureId: number
  structureName: string
  structureNodeId: number
  structureNodeName: string
  storyObjectId: number
  storyObjectName: string
  storyObjectTypeKey: ObjectTypeKey
  roleLabel: string | null
  notes: string | null
  sortOrder: number
}

function readTimelineChangeRawValue(value: string | null) {
  if (value === null || value.trim().length === 0) {
    return ''
  }

  try {
    const parsedValue = JSON.parse(value) as unknown

    if (typeof parsedValue === 'string') {
      return parsedValue
    }

    if (parsedValue === null) {
      return ''
    }

    return JSON.stringify(parsedValue)
  } catch {
    return value
  }
}

function getTimelineChangeFieldKey(change: TimelineChange) {
  return (change.fieldName ?? change.fieldKey ?? '').trim().toLowerCase()
}

function getLatestObjectTimelineChange(changes: TimelineChange[], changeType: string, fieldName: string) {
  const normalizedFieldName = fieldName.trim().toLowerCase()

  return [...changes]
    .reverse()
    .find((change) => change.changeType === changeType && getTimelineChangeFieldKey(change) === normalizedFieldName)
}

function getChangedNullableField(changes: TimelineChange[], fieldName: string, fallback: string | null) {
  const change = getLatestObjectTimelineChange(changes, 'field', fieldName)

  if (change === undefined) {
    return fallback
  }

  const value = readTimelineChangeRawValue(change.newValueJson).trim()

  return value.length === 0 ? null : value
}

function readJsonSnapshot(value: string | null): unknown {
  if (value === null || value.trim().length === 0) {
    return null
  }

  try {
    return JSON.parse(value) as unknown
  } catch {
    return null
  }
}

function getLatestSnapshotChange(changes: TimelineChange[], changeType: string, fieldName: string) {
  return getLatestObjectTimelineChange(changes, changeType, fieldName)
}

function getSnapshotArray<TValue>(
  changes: TimelineChange[],
  changeType: string,
  fieldName: string,
  isValue: (value: unknown) => value is TValue,
) {
  const change = getLatestSnapshotChange(changes, changeType, fieldName)
  const snapshot = readJsonSnapshot(change?.newValueJson ?? null)

  return Array.isArray(snapshot) ? snapshot.filter(isValue) : null
}

function resolveAttributeChanges(baseAttributes: ObjectAttribute[], changes: TimelineChange[]) {
  const attributes = [...baseAttributes]

  changes
    .filter((change) => change.changeType === 'attribute')
    .forEach((change, index) => {
      const attributeName = (change.fieldName ?? change.fieldKey ?? '').trim()

      if (attributeName.length === 0) {
        return
      }

      const value = readTimelineChangeRawValue(change.newValueJson).trim()
      const attributeIndex = attributes.findIndex(
        (attribute) => attribute.name.trim().toLowerCase() === attributeName.toLowerCase(),
      )

      if (attributeIndex >= 0) {
        attributes[attributeIndex] = {
          ...attributes[attributeIndex],
          value: value.length === 0 ? null : value,
        }
        return
      }

      attributes.push({
        id: -100000 - index,
        attributeDefinitionId: 0,
        name: attributeName,
        value: value.length === 0 ? null : value,
      })
    })

  return attributes
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isNullableString(value: unknown): value is string | null {
  return value === null || isString(value)
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || isNumber(value)
}

function isCatalogSelectionSnapshot(value: unknown): value is CatalogSelectionSnapshot {
  if (!isRecord(value)) {
    return false
  }

  return (
    (value.targetType === 'catalog' || value.targetType === 'group' || value.targetType === 'entry') &&
    isNumber(value.catalogId) &&
    isNullableNumber(value.catalogEntryGroupId) &&
    isNullableNumber(value.catalogEntryId)
  )
}

function isHierarchySelectionSnapshot(value: unknown): value is HierarchySelectionSnapshot {
  return (
    isRecord(value) &&
    isNumber(value.groupId) &&
    Array.isArray(value.nodeIds) &&
    value.nodeIds.every(isNumber)
  )
}

function isRelationshipSnapshot(value: unknown): value is RelationshipSnapshot {
  return (
    isRecord(value) &&
    (value.direction === 'outgoing' || value.direction === 'incoming') &&
    isNumber(value.characterId) &&
    typeof value.relationType === 'string' &&
    isNumber(value.strength) &&
    isNumber(value.tension) &&
    typeof value.isBidirectional === 'boolean' &&
    typeof value.description === 'string'
  )
}

function isObjectTypeKey(value: unknown): value is ObjectTypeKey {
  return (
    value === 'characters' ||
    value === 'items' ||
    value === 'places' ||
    value === 'organizations' ||
    value === 'hierarchy'
  )
}

function isStructureAssignmentSnapshot(value: unknown): value is StructureAssignmentSnapshot {
  return (
    isRecord(value) &&
    isNumber(value.id) &&
    isNumber(value.projectId) &&
    isNumber(value.structureUsageId) &&
    isNumber(value.structureId) &&
    isString(value.structureName) &&
    isNumber(value.structureNodeId) &&
    isString(value.structureNodeName) &&
    isNumber(value.storyObjectId) &&
    isString(value.storyObjectName) &&
    isObjectTypeKey(value.storyObjectTypeKey) &&
    isNullableString(value.roleLabel) &&
    isNullableString(value.notes) &&
    isNumber(value.sortOrder)
  )
}

function getAllObjects(context: TemporalResolverContext) {
  return Object.values(context.objectsByType ?? {}).flat()
}

function toObjectReference(storyObject: StoryObject): ObjectReference {
  return {
    id: storyObject.id,
    imagePath: storyObject.imagePath,
    name: storyObject.name,
    typeKey: storyObject.typeKey,
  }
}

function resolveObjectReferences(ids: number[], context: TemporalResolverContext) {
  const objectsById = new Map(getAllObjects(context).map((storyObject) => [storyObject.id, storyObject]))

  return ids
    .map((id) => objectsById.get(id))
    .filter((storyObject): storyObject is StoryObject => storyObject !== undefined)
    .map(toObjectReference)
}

function resolveCatalogSelections(
  baseSelections: ObjectCatalogSelection[],
  changes: TimelineChange[],
  context: TemporalResolverContext,
) {
  const snapshots = getSnapshotArray(changes, 'catalogSelection', 'catalogSelections', isCatalogSelectionSnapshot)

  if (snapshots === null) {
    return baseSelections
  }

  const baseSelectionsByKey = new Map(
    baseSelections.map((selection) => [
      `${selection.targetType}:${selection.catalogId}:${selection.catalogEntryGroupId ?? ''}:${selection.catalogEntryId ?? ''}`,
      selection,
    ]),
  )

  return snapshots.map((snapshot) => {
    const key = `${snapshot.targetType}:${snapshot.catalogId}:${snapshot.catalogEntryGroupId ?? ''}:${snapshot.catalogEntryId ?? ''}`
    const baseSelection = baseSelectionsByKey.get(key)
    const catalog = context.catalogs?.find((item) => item.id === snapshot.catalogId)
    const group = (context.catalogGroupsByCatalogId?.[snapshot.catalogId] ?? []).find(
      (item) => item.id === snapshot.catalogEntryGroupId,
    )
    const entry = (context.catalogEntriesByCatalogId?.[snapshot.catalogId] ?? []).find(
      (item) => item.id === snapshot.catalogEntryId,
    )

    return {
      targetType: snapshot.targetType,
      catalogId: snapshot.catalogId,
      catalogName: catalog?.name ?? baseSelection?.catalogName ?? String(snapshot.catalogId),
      catalogEntryGroupId: snapshot.catalogEntryGroupId,
      catalogEntryGroupName: group?.name ?? baseSelection?.catalogEntryGroupName ?? null,
      catalogEntryId: snapshot.catalogEntryId,
      catalogEntryName: entry?.name ?? baseSelection?.catalogEntryName ?? null,
    }
  })
}

function resolveHierarchySelections(
  baseSelections: ObjectHierarchySelection[],
  changes: TimelineChange[],
  context: TemporalResolverContext,
) {
  const snapshots = getSnapshotArray(changes, 'hierarchySelection', 'hierarchySelections', isHierarchySelectionSnapshot)

  if (snapshots === null) {
    return baseSelections
  }

  return snapshots.map((snapshot) => {
    const group = context.hierarchyGroups?.find((item) => item.id === snapshot.groupId)
    const baseSelection = baseSelections.find((selection) => selection.groupId === snapshot.groupId)
    const nodes = snapshot.nodeIds.map((nodeId) => {
      const node = (context.hierarchyNodesByGroupId?.[snapshot.groupId] ?? []).find((item) => item.id === nodeId)
      const baseNode = baseSelection?.nodes.find((item) => item.id === nodeId)

      return {
        id: nodeId,
        name: node?.name ?? baseNode?.name ?? String(nodeId),
      }
    })

    return {
      groupId: snapshot.groupId,
      groupName: group?.name ?? baseSelection?.groupName ?? String(snapshot.groupId),
      nodes,
    }
  })
}

function resolveRelationships(
  baseOutgoing: CharacterRelationship[],
  baseIncoming: CharacterRelationship[],
  changes: TimelineChange[],
  context: TemporalResolverContext,
) {
  const snapshots = getSnapshotArray(changes, 'relationship', 'characterRelationships', isRelationshipSnapshot)

  if (snapshots === null) {
    return {
      incomingCharacterRelationships: baseIncoming,
      outgoingCharacterRelationships: baseOutgoing,
    }
  }

  const charactersById = new Map((context.objectsByType?.characters ?? []).map((character) => [character.id, character]))
  const relationships = snapshots
    .map((snapshot, index): CharacterRelationship | null => {
      const character = charactersById.get(snapshot.characterId)

      if (character === undefined) {
        return null
      }

      return {
        id: -200000 - index,
        character: toObjectReference(character),
        description: snapshot.description.trim().length === 0 ? null : snapshot.description,
        direction: snapshot.direction,
        isBidirectional: snapshot.isBidirectional,
        relationType: snapshot.relationType,
        strength: snapshot.strength,
        tension: snapshot.tension,
      }
    })
    .filter((relationship): relationship is CharacterRelationship => relationship !== null)

  return {
    incomingCharacterRelationships: relationships.filter((relationship) => relationship.direction === 'incoming'),
    outgoingCharacterRelationships: relationships.filter((relationship) => relationship.direction === 'outgoing'),
  }
}

function resolveNumberReferenceField(
  baseReferences: ObjectReference[],
  changes: TimelineChange[],
  changeType: string,
  fieldName: string,
  context: TemporalResolverContext,
) {
  const ids = getSnapshotArray(changes, changeType, fieldName, isNumber)

  return ids === null ? baseReferences : resolveObjectReferences(ids, context)
}

function getChangedStructureAssignmentTextField(
  changes: TimelineChange[],
  fieldName: string,
  fallback: string | null,
) {
  const change = getLatestObjectTimelineChange(changes, 'structureAssignment', fieldName)

  if (change === undefined) {
    return fallback
  }

  const value = readTimelineChangeRawValue(change.newValueJson).trim()

  return value.length === 0 ? null : value
}

function getChangedStructureAssignmentNumberField(
  changes: TimelineChange[],
  fieldName: string,
  fallback: number,
) {
  const change = getLatestObjectTimelineChange(changes, 'structureAssignment', fieldName)

  if (change === undefined) {
    return fallback
  }

  const value = Number(readTimelineChangeRawValue(change.newValueJson))

  return Number.isFinite(value) ? value : fallback
}

function resolveStructureAssignmentTemporalState(
  assignment: StructureAssignment,
  changes: TimelineChange[],
  context: TemporalResolverContext,
): StructureAssignment {
  if (changes.length === 0) {
    return assignment
  }

  const structureUsageId = getChangedStructureAssignmentNumberField(changes, 'structureUsageId', assignment.structureUsageId)
  const structureId = getChangedStructureAssignmentNumberField(changes, 'structureId', assignment.structureId)
  const structureNodeId = getChangedStructureAssignmentNumberField(changes, 'structureNodeId', assignment.structureNodeId)
  const storyObjectId = getChangedStructureAssignmentNumberField(changes, 'storyObjectId', assignment.storyObjectId)
  const storyObject = getAllObjects(context).find((object) => object.id === storyObjectId)
  const structure = context.structuresById?.[structureId]
  const structureNode = structure?.nodes.find((node) => node.id === structureNodeId)

  return {
    ...assignment,
    structureUsageId,
    structureId,
    structureName: structure?.name ?? assignment.structureName,
    structureNodeId,
    structureNodeName: structureNode?.name ?? assignment.structureNodeName,
    storyObjectId,
    storyObjectName: storyObject?.name ?? assignment.storyObjectName,
    storyObjectTypeKey: (storyObject?.typeKey as ObjectTypeKey | undefined) ?? assignment.storyObjectTypeKey,
    roleLabel: getChangedStructureAssignmentTextField(changes, 'roleLabel', assignment.roleLabel),
    notes: getChangedStructureAssignmentTextField(changes, 'notes', assignment.notes),
    sortOrder: getChangedStructureAssignmentNumberField(changes, 'sortOrder', assignment.sortOrder),
  }
}

export function resolveStructureAssignmentsTemporalState(
  assignments: StructureAssignment[],
  timelineEvents: TimelineEvent[],
  contextEventId: string,
  context: TemporalResolverContext & { storyObjectId?: number } = {},
) {
  const storyObjectChanges =
    context.storyObjectId === undefined
      ? []
      : getTimelineContextChangesForTarget(timelineEvents, contextEventId, 'storyObject', context.storyObjectId)
  const snapshotAssignments = getSnapshotArray(
    storyObjectChanges,
    'structureAssignment',
    'structureAssignments',
    isStructureAssignmentSnapshot,
  )
  const baseAssignments = snapshotAssignments ?? assignments

  return baseAssignments
    .map((assignment) =>
      resolveStructureAssignmentTemporalState(
        assignment,
        getTimelineContextChangesForTarget(timelineEvents, contextEventId, 'structureAssignment', assignment.id),
        context,
      ),
    )
    .filter((assignment) => context.storyObjectId === undefined || assignment.storyObjectId === context.storyObjectId)
    .sort((left, right) => left.sortOrder - right.sortOrder || left.id - right.id)
}

export function resolveStoryObjectTemporalState(
  storyObject: StoryObject,
  changes: TimelineChange[],
  context: TemporalResolverContext = {},
): StoryObject {
  if (changes.length === 0) {
    return storyObject
  }

  const relationships = resolveRelationships(
    storyObject.outgoingCharacterRelationships,
    storyObject.incomingCharacterRelationships,
    changes,
    context,
  )

  return {
    ...storyObject,
    name: getChangedNullableField(changes, 'name', storyObject.name) ?? storyObject.name,
    surname: getChangedNullableField(changes, 'surname', storyObject.surname),
    surnameForm: getChangedNullableField(changes, 'surnameForm', storyObject.surnameForm),
    description: getChangedNullableField(changes, 'description', storyObject.description),
    age: getChangedNullableField(changes, 'age', storyObject.age),
    role: getChangedNullableField(changes, 'role', storyObject.role),
    currentStatus: getChangedNullableField(changes, 'currentStatus', storyObject.currentStatus),
    imagePath: getChangedNullableField(changes, 'imagePath', storyObject.imagePath),
    attributes: resolveAttributeChanges(storyObject.attributes, changes),
    catalogSelections: resolveCatalogSelections(storyObject.catalogSelections, changes, context),
    hierarchySelections: resolveHierarchySelections(storyObject.hierarchySelections, changes, context),
    incomingCharacterRelationships: relationships.incomingCharacterRelationships,
    outgoingCharacterRelationships: relationships.outgoingCharacterRelationships,
    hierarchyParents: resolveNumberReferenceField(
      storyObject.hierarchyParents,
      changes,
      'hierarchySelection',
      'parentObjectIds',
      context,
    ),
    ownedItems: resolveNumberReferenceField(storyObject.ownedItems, changes, 'ownership', 'ownedItemIds', context),
    ownerOrganizations: resolveNumberReferenceField(
      storyObject.ownerOrganizations,
      changes,
      'ownership',
      'ownerOrganizationIds',
      context,
    ),
    owners: resolveNumberReferenceField(storyObject.owners, changes, 'ownership', 'ownerCharacterIds', context),
    territoryPlaces: resolveNumberReferenceField(
      storyObject.territoryPlaces,
      changes,
      'location',
      'territoryPlaceIds',
      context,
    ),
  }
}

export function resolveObjectsByTypeTemporalState(
  objectsByType: Record<ObjectTypeKey, StoryObject[]>,
  timelineEvents: TimelineEvent[],
  contextEventId: string,
  context: Omit<TemporalResolverContext, 'objectsByType'> = {},
) {
  const baseContext = {
    ...context,
    objectsByType,
  }

  return Object.fromEntries(
    Object.entries(objectsByType).map(([typeKey, objects]) => [
      typeKey,
      objects.map((storyObject) =>
        resolveStoryObjectTemporalState(
          storyObject,
          getTimelineContextChangesForObject(timelineEvents, contextEventId, storyObject.id),
          baseContext,
        ),
      ),
    ]),
  ) as Record<ObjectTypeKey, StoryObject[]>
}

function getObjectEdgeKey(edge: Pick<RelationGraphEdge, 'category' | 'sourceId' | 'targetId' | 'relationType'>) {
  return `${edge.category}:${edge.sourceId}:${edge.targetId}:${edge.relationType}`
}

export function resolveRelationGraphTemporalState(
  graph: RelationGraph,
  objectsByType: Record<ObjectTypeKey, StoryObject[]>,
  structureAssignments: StructureAssignment[] = [],
  structureUsages: StructureUsage[] = [],
  timelineEvents: TimelineEvent[] = [],
  contextEventId = '',
  context: TemporalResolverContext = {},
): RelationGraph {
  const resolvedObjects = Object.values(objectsByType).flat()
  const objectById = new Map(resolvedObjects.map((storyObject) => [storyObject.id, storyObject]))
  const nodes = resolvedObjects.map((storyObject) => ({
    id: storyObject.id,
    imagePath: storyObject.imagePath,
    name: storyObject.name,
    surname: storyObject.surname,
    surnameForm: storyObject.surnameForm,
    typeKey: storyObject.typeKey as ObjectTypeKey,
  }))
  const edges: RelationGraphEdge[] = []
  const pushEdge = (edge: RelationGraphEdge) => {
    if (!objectById.has(edge.sourceId) || !objectById.has(edge.targetId)) {
      return
    }

    if (edges.some((currentEdge) => getObjectEdgeKey(currentEdge) === getObjectEdgeKey(edge))) {
      return
    }

    edges.push(edge)
  }

  const organizations = objectsByType.organizations
  objectsByType.characters.forEach((character) => {
    const surname = character.surname?.trim()

    if (!surname) {
      return
    }

    organizations
      .filter((organization) => organization.surnameForm?.trim().toLocaleLowerCase() === surname.toLocaleLowerCase())
      .forEach((organization) => {
        pushEdge({
          id: `temporal-membership:${character.id}:${organization.id}`,
          sourceId: character.id,
          targetId: organization.id,
          relationType: 'organizationMembership',
          category: 'membership',
          strength: null,
          tension: null,
          isBidirectional: false,
          description: null,
        })
      })

    character.outgoingCharacterRelationships.forEach((relationship) => {
      pushEdge({
        id: `temporal-character:${character.id}:${relationship.character.id}:${relationship.relationType}`,
        sourceId: character.id,
        targetId: relationship.character.id,
        relationType: relationship.relationType,
        category: 'character',
        strength: relationship.strength,
        tension: relationship.tension,
        isBidirectional: relationship.isBidirectional,
        description: relationship.description,
      })
    })

    character.incomingCharacterRelationships.forEach((relationship) => {
      pushEdge({
        id: `temporal-character:${relationship.character.id}:${character.id}:${relationship.relationType}`,
        sourceId: relationship.character.id,
        targetId: character.id,
        relationType: relationship.relationType,
        category: 'character',
        strength: relationship.strength,
        tension: relationship.tension,
        isBidirectional: relationship.isBidirectional,
        description: relationship.description,
      })
    })

    character.ownedItems.forEach((item) => {
      pushEdge({
        id: `temporal-ownership:${character.id}:${item.id}`,
        sourceId: character.id,
        targetId: item.id,
        relationType: 'владеет',
        category: 'ownership',
        strength: null,
        tension: null,
        isBidirectional: false,
        description: null,
      })
    })
  })

  objectsByType.items.forEach((item) => {
    item.owners.forEach((owner) => {
      pushEdge({
        id: `temporal-ownership:${owner.id}:${item.id}`,
        sourceId: owner.id,
        targetId: item.id,
        relationType: 'владеет',
        category: 'ownership',
        strength: null,
        tension: null,
        isBidirectional: false,
        description: null,
      })
    })
  })

  resolvedObjects.forEach((storyObject) => {
    storyObject.territoryPlaces.forEach((place) => {
      pushEdge({
        id: `temporal-object:locatedOnTerritory:${storyObject.id}:${place.id}`,
        sourceId: storyObject.id,
        targetId: place.id,
        relationType: 'locatedOnTerritory',
        category: 'object',
        strength: null,
        tension: null,
        isBidirectional: false,
        description: null,
      })
    })

    storyObject.ownerOrganizations.forEach((organization) => {
      pushEdge({
        id: `temporal-object:territoryOwner:${storyObject.id}:${organization.id}`,
        sourceId: storyObject.id,
        targetId: organization.id,
        relationType: 'territoryOwner',
        category: 'object',
        strength: null,
        tension: null,
        isBidirectional: false,
        description: null,
      })
    })

    storyObject.hierarchyParents.forEach((parent) => {
      pushEdge({
        id: `temporal-object:hierarchyParent:${storyObject.id}:${parent.id}`,
        sourceId: storyObject.id,
        targetId: parent.id,
        relationType: 'hierarchyParent',
        category: 'object',
        strength: null,
        tension: null,
        isBidirectional: false,
        description: null,
      })
    })
  })

  if (structureAssignments.length > 0) {
    const structureUsageById = new Map(structureUsages.map((usage) => [usage.id, usage]))
    const temporalStructureAssignments = resolveStructureAssignmentsTemporalState(
      structureAssignments,
      timelineEvents,
      contextEventId,
      {
        ...context,
        objectsByType,
      },
    )
    const snapshotAssignmentsByObjectId = new Map<number, StructureAssignment[]>()

    resolvedObjects.forEach((storyObject) => {
      const storyObjectChanges = getTimelineContextChangesForTarget(
        timelineEvents,
        contextEventId,
        'storyObject',
        storyObject.id,
      )
      const snapshotAssignments = getSnapshotArray(
        storyObjectChanges,
        'structureAssignment',
        'structureAssignments',
        isStructureAssignmentSnapshot,
      )

      if (snapshotAssignments === null) {
        return
      }

      snapshotAssignmentsByObjectId.set(
        storyObject.id,
        resolveStructureAssignmentsTemporalState(snapshotAssignments, timelineEvents, contextEventId, {
          ...context,
          objectsByType,
          storyObjectId: storyObject.id,
        }),
      )
    })
    const effectiveStructureAssignments = [
      ...temporalStructureAssignments.filter(
        (assignment) => !snapshotAssignmentsByObjectId.has(assignment.storyObjectId),
      ),
      ...Array.from(snapshotAssignmentsByObjectId.values()).flat(),
    ]

    effectiveStructureAssignments.forEach((assignment) => {
      const usage = structureUsageById.get(assignment.structureUsageId)

      if (usage?.targetKind !== 'object') {
        return
      }

      pushEdge({
        id: `temporal-structure:${assignment.id}:${assignment.storyObjectId}:${usage.targetId}`,
        sourceId: assignment.storyObjectId,
        targetId: usage.targetId,
        relationType: assignment.roleLabel?.trim() || assignment.structureNodeName,
        category: 'structure',
        strength: null,
        tension: null,
        isBidirectional: false,
        description: assignment.notes,
      })
    })
  } else {
    graph.edges
      .filter((edge) => edge.category === 'structure')
      .forEach((edge) => {
        const source = objectById.get(edge.sourceId)
        const target = objectById.get(edge.targetId)

        if (source !== undefined && target !== undefined) {
          pushEdge(edge)
        }
      })
  }

  return {
    nodes,
    edges,
  }
}
